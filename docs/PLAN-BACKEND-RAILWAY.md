# Plan backend Railway — Historisation CRM Monday (SCD Type 2)

> Statut : PLAN — rien n'est déployé. Développement 100% local jusqu'au go-live.
> Périmètre : données Monday CRM (comptes + leads) uniquement. **Ringover n'est pas touché.**

---

## 1. Objectif & principes actés

| Décision | Choix acté | Pourquoi |
|---|---|---|
| Modèle d'historisation | **SCD Type 2 par intervalles** (`valid_from` / `valid_to`, `valid_to NULL` = encore d'actualité) | Base qui ne grossit qu'au rythme des changements réels ; remplace les snapshots hebdo du Google Sheet |
| Nature des valeurs | **Flux mensuels** (€/mois) — confirmé | Autorise le prorata temporel (méthode Cour de Cassation, déjà utilisée pour les coûts de mission) |
| Règle d'or | **Ne jamais sommer deux versions d'un même item** | Un état à l'instant T s'analyse par point fixe ou par prorata, jamais par addition de versions |
| Stockage | **Postgres managé Railway** (plugin) | Transactions atomiques close+open, SQL temporel, plus de Google Sheet intermédiaire |
| Ingestion | **Webhook Monday → service Node sur Railway** | Capte l'instant exact du changement (durées de cycle précises au jour près) |
| Lecture | **API HTTP du même service Node** | Le dashboard reçoit des KPI pré-calculés (petit JSON) au lieu de télécharger tout un CSV |

---

## 2. Architecture cible

```
Monday CRM ──webhook POST──▶ [Railway · service Node]  POST /webhook/monday
                                     │  1. valide challenge + secret
                                     │  2. refetch item complet via API Monday (GraphQL)
                                     │  3. TRANSACTION : ferme l'intervalle ouvert
                                     │     (valid_to = now) + insère le nouveau
                                     ▼
                            [Railway · Postgres]   comptes_history / leads_history
                                     ▲
                                     │  overlap + prorata (en Node, pas en SQL)
[Dashboard React] ──GET /api/kpis?from&to──┘
        (Vercel/localhost)      GET /api/monthly, /api/compare
```

Un seul service Node = deux métiers (récepteur webhook + API de lecture).
Un seul Postgres. Pas d'Apps Script, plus de Google Sheet à terme.

---

## 3. Schéma Postgres (migrations)

### 3.1 `comptes_history`

```sql
CREATE TABLE comptes_history (
  id               bigserial PRIMARY KEY,
  compte_id        text        NOT NULL,           -- item_id Monday
  nom              text,
  statut           text,                            -- 'Actif' | ...
  vente_mensuel    numeric     NOT NULL DEFAULT 0,  -- €/mois (FLUX)
  achat_mensuel    numeric     NOT NULL DEFAULT 0,  -- €/mois (FLUX)
  profil_actif     numeric,
  date_demarrage   date,
  date_fin_contrat date,
  valid_from       timestamptz NOT NULL,
  valid_to         timestamptz,                     -- NULL = version courante
  event_id         text,                            -- idempotence webhook
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_comptes_open   ON comptes_history (compte_id) WHERE valid_to IS NULL;
CREATE INDEX        ix_comptes_period ON comptes_history (valid_from, valid_to);
CREATE UNIQUE INDEX ux_comptes_event  ON comptes_history (event_id) WHERE event_id IS NOT NULL;
```

> `ux_comptes_open` garantit **au niveau base** qu'un compte n'a jamais deux
> versions ouvertes — l'invariant SCD2 le plus important.

### 3.2 `leads_history`

Mêmes colonnes techniques (`valid_from`, `valid_to`, `event_id`) + champs métier :
`item_id, nom, groupe, etat, closer, type_contrat, profil_fonction,
achat_p, vente_p, probabilite, date_ouverture, date_rdv, date_presentation,
date_demarrage_souhaite`. Mêmes 3 index.

### 3.3 `webhook_events` (journal brut)

```sql
CREATE TABLE webhook_events (
  id          bigserial PRIMARY KEY,
  event_id    text UNIQUE,
  board_id    text, item_id text, type text,
  payload     jsonb NOT NULL,
  processed   boolean NOT NULL DEFAULT false,
  error       text,
  received_at timestamptz NOT NULL DEFAULT now()
);
```

> On journalise TOUJOURS le payload brut avant traitement : si la logique
> SCD2 plante, l'événement est rejouable — rien n'est perdu.

---

## 4. Service Node (`server/`)

Stack : **Node 20 + Fastify + pg** (pool). Pas d'ORM — le SQL est simple et explicite.

```
server/
├── package.json
├── src/
│   ├── index.js            # bootstrap Fastify, CORS, auth
│   ├── db.js               # pool pg (DATABASE_URL)
│   ├── monday.js           # client GraphQL Monday (refetch item, seed)
│   ├── scd2.js             # closeAndInsert(table, itemId, fields, eventId) — 1 transaction
│   ├── prorata.js          # portage de prorataOuvre() (jours ouvrés, Cour de Cassation)
│   ├── kpis.js             # calculs (état actuel, période, comparaison, mensuel)
│   └── routes/
│       ├── webhook.js      # POST /webhook/monday
│       └── api.js          # GET /api/kpis, /api/monthly, /api/compare, /api/health
├── migrations/
│   ├── 001_comptes_history.sql
│   ├── 002_leads_history.sql
│   └── 003_webhook_events.sql
└── scripts/
    ├── migrate.js          # applique les migrations
    ├── seed.js             # import initial API Monday → intervalles ouverts
    └── replay.js           # rejoue un payload webhook capturé (tests locaux)
```

### 4.1 Route webhook — séquence exacte

```
POST /webhook/monday
 1. body.challenge présent ? → répondre { challenge } (validation Monday)   [MUST]
 2. vérifier le secret (query param ?token=MONDAY_WEBHOOK_SECRET)           [MUST]
 3. INSERT webhook_events (payload brut) — si event_id déjà vu → 200 direct [idempotence]
 4. refetch l'item COMPLET via API Monday (le payload ne donne que la
    colonne modifiée — jamais assez pour une version SCD2 saine)
 5. scd2.closeAndInsert() : UPDATE ... SET valid_to = now()
    WHERE item_id = ? AND valid_to IS NULL ; INSERT nouvelle version
    → LES DEUX dans une transaction (BEGIN/COMMIT)
 6. marquer webhook_events.processed = true → 200
    (toute erreur : logguée dans webhook_events.error, réponse 200 quand
     même pour éviter les réémissions en boucle ; le replay répare)
```

### 4.2 API de lecture

| Endpoint | Rôle | Logique |
|---|---|---|
| `GET /api/kpis?from&to` | KPI période (remplace `computeCRMKPIs`) | État actuel = versions `valid_to IS NULL` ; CA période = overlap + prorata |
| `GET /api/monthly?months=6` | Série mensuelle CA/marge (remplace `monthly`) | 1 point par mois = prorata du mois complet |
| `GET /api/compare?fromA&toA&fromB&toB` | Comparaison 2 périodes | Même agrégation sur 2 fenêtres + delta % |
| `GET /api/health` | Monitoring Railway | ping DB |

**Requête d'overlap type** (le prorata jours-ouvrés se fait ensuite en Node) :

```sql
SELECT * FROM comptes_history
WHERE valid_from <= $to
  AND (valid_to >= $from OR valid_to IS NULL);
```

**CA pondéré d'un client sur la période** (plusieurs versions → prorata, pas addition) :

```
ca_periode(client) = Σ sur ses versions chevauchantes de
  vente_mensuel × prorataOuvre(jours ouvrés actifs ∩ période / jours ouvrés du mois)
```

### 4.3 Sécurité

| Surface | Protection |
|---|---|
| Webhook | challenge Monday + secret dans l'URL, `webhook_events` en journal |
| API lecture | header `Authorization: Bearer <API_READ_TOKEN>` (le CSV public disparaît — l'API ne doit PAS être ouverte) |
| CORS | origines : domaine du dashboard + `http://localhost:5173` |
| Postgres | jamais exposé publiquement — seul le service Node s'y connecte |

---

## 5. Seed initial (obligatoire)

Le webhook ne capte que le futur. Sans seed, la base démarre vide.

`scripts/seed.js` :
1. Query GraphQL `boards(ids: [...]) { items_page { items { id name column_values } } }` avec pagination `cursor`.
2. Pour chaque item : 1 ligne d'intervalle **ouvert** — `valid_from` = date de démarrage connue (sinon date du seed), `valid_to = NULL`.
3. Idempotent : re-lançable sans doublon (upsert sur l'index `ux_*_open`).

> **Phase 0 requise avant d'écrire le seed** : inventaire Monday — ids des
> boards comptes & leads + mapping `column_id → champ` (les payloads webhook
> et l'API parlent en `column_id`, pas en libellés). Un token API Monday
> en lecture suffit.

---

## 6. Refacto dashboard (local, sans risque)

1. Nouveau `src/hooks/useCrmApi.js` : mêmes signatures de retour que
   `useSnapshotData` (`{ result, monthly, loading, error }`) → les
   composants ne changent **pas**.
2. `VITE_API_URL` + `VITE_API_TOKEN` dans `.env` (localhost en dev).
3. **Transition douce** : flag `VITE_DATA_SOURCE=api|sheet`. Le parser CSV
   actuel reste en fallback tant que la base n'a pas quelques semaines
   d'historique. Bascule définitive + suppression du code Sheet ensuite.
4. `resolveSnapshot()` et le fetch CSV meurent à la fin de la transition.

---

## 7. Dev 100% local (aucun accès Railway requis)

| Besoin | Solution locale |
|---|---|
| Postgres | `docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16` |
| Webhook | `scripts/replay.js payloads/exemple.json` → POST localhost:3001 |
| Test bout-en-bout | replay → vérifier close+open en base → GET /api/kpis |
| Webhook réel en dev (optionnel) | tunnel `ngrok http 3001` le temps d'un test |

Tout le backend peut être **fini et validé** avant le moindre contact avec Railway.

---

## 8. Checklist déploiement Railway (pour le détenteur de l'accès)

> ~15 minutes, aucun code à comprendre. Prérequis : être invité au projet
> Railway (*Settings → Members → Invite*) ou exécuter ceci pour nous.

1. **Postgres** : projet Railway → `+ New` → `Database → PostgreSQL`.
2. **Service** : `+ New` → `GitHub Repo` → repo backend
   (si monorepo : *Root Directory* = `server`). Railway détecte Node.
3. **Variables** (onglet Variables du service) :
   - `DATABASE_URL` → *Add Reference* vers le Postgres (auto)
   - `MONDAY_API_TOKEN` → token API Monday (admin Monday → Developers)
   - `MONDAY_WEBHOOK_SECRET` → chaîne aléatoire longue (générée par nous)
   - `API_READ_TOKEN` → idem
   - `CORS_ORIGIN` → URL du dashboard
4. **Domaine** : Settings → Networking → `Generate Domain`
   → noter `https://xxx.up.railway.app`.
5. **Migrations + seed** (one-off) : `railway run node scripts/migrate.js`
   puis `railway run node scripts/seed.js` (ou depuis un poste local avec
   le `DATABASE_URL` public temporaire).
6. **Webhook Monday** : board → Integrations → Webhooks →
   `When column changes / item created / status changes` →
   URL `https://xxx.up.railway.app/webhook/monday?token=<MONDAY_WEBHOOK_SECRET>`
   → Monday envoie le challenge → doit passer au vert.
7. Transmettre l'URL publique (et le `DATABASE_URL` si debug souhaité).

---

## 9. Phasage

| Phase | Contenu | Dépend de |
|---|---|---|
| **P0** | Inventaire Monday : board ids, column ids, token API lecture | Token Monday |
| **P1** | Migrations SQL + Postgres Docker local + `seed.js` (testé sur vraies données via token) | P0 |
| **P2** | Route webhook + `scd2.js` + `replay.js` + tests locaux | P1 |
| **P3** | API lecture (`kpis`, `monthly`, `compare`) + portage `prorata.js` | P1 |
| **P4** | Refacto dashboard (`useCrmApi` + flag de bascule) | P3 |
| **P5** | Déploiement Railway (checklist §8) + seed prod + webhook Monday | P2-P4 + accès Railway |
| **P6** | Période de doublon Sheet/API (2-3 sem.) → bascule → retrait du code Sheet | P5 |

**P1 à P4 = 100% local.** Seule P5 exige l'accès Railway.

---

## 10. Risques & mitigations

| Risque | Mitigation |
|---|---|
| Webhook manqué (panne, redeploy) → trou dans l'historique | **Cron de réconciliation quotidien** (node-cron dans le service) : diff état API Monday vs versions ouvertes en base → close+open des écarts. Le webhook devient un accélérateur, le cron le filet de sécurité. |
| Corruption d'intervalle (2 versions ouvertes) | Impossible par construction : index unique partiel `ux_*_open` + transaction |
| Doublon webhook (réémission Monday < 30s) | `event_id` unique + journal `webhook_events` |
| Payload webhook incomplet | On ne s'en sert que comme déclencheur : refetch complet systématique |
| Base vide au lancement | Seed obligatoire (P1), re-lançable |
| Sheet coupé trop tôt | P6 : doublon assumé 2-3 semaines avant retrait |
| Colonne renommée dans Monday | Mapping par `column_id` (stable), jamais par libellé |

---

## 11. Hors périmètre (inchangé)

- **Ringover / Activité Sales & TLM** : aucun contact avec ce backend.
- Auth du dashboard (login localStorage) : conservée telle quelle, le
  `API_READ_TOKEN` est embarqué côté build dans un premier temps.
