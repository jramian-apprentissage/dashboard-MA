# Inventaire Monday — boards CRM (Phase 0)

> Relevé du 2026-07-13 via connecteur Monday. Sert de contrat de mapping
> pour les migrations Postgres, le seed et le webhook (plan : PLAN-BACKEND-RAILWAY.md).
> Compte : monambassadeur-squad.monday.com · Workspace **CRM** (id `4930455`).

---

## 1. Board « Comptes » — id `5002242498`

35 items · 1 groupe (`topics` = "Entreprises") · terminologie "Compte".

### Colonnes parent → table `comptes_history`

| column_id | Titre Monday | Type | Colonne Postgres | Note |
|---|---|---|---|---|
| `name` | Nom | name | `nom` | Nom entreprise |
| `color_mm3cepw1` | Statut | status | `statut` | Labels : `0=Stand-by · 1=Actif · 2=Inactif` |
| `numeric_mm3cprg` | Achat total | numbers | `achat_mensuel` | **€/mois — flux** (= somme des Achat P des profils) |
| `numeric_mm3c954g` | Vente total | numbers | `vente_mensuel` | **€/mois — flux** (= somme des Vente P des profils) |
| `numeric_mm3cv2qa` | Profil actif | numbers | `profil_actif` | |
| `date_mm3cyzfw` | Date de démarrage | date | `date_demarrage` | ⚠ **NULL sur l'échantillon** — voir §4.2 |
| `date_mm3ckb31` | Date fin de contrat | date | `date_fin_contrat` | |
| `text_mm3c5h6q` | Motif arrêt | text | `motif_arret` | |
| `text_mm4dccxh` | ID_Client | text | `id_client` | Réf. externe |
| `formula_mm3c4ct9` | Total profil | formula | — | Calculé (`Count` des sous-éléments), ne pas historiser |
| `text_mm3c4mr0` / `dropdown_mm3c2nzf` / `company_description` / `employee_count` | Tél / Civilité / Nom / Prénom contact | — | — | Hors périmètre KPI |

### Sous-éléments (profils) — board `5096516278` → table `profils_history`

**Découverte structurante** : la granularité réelle du flux mensuel est le
**profil** (sous-élément), pas le compte. Vérifié sur échantillon :
`3DS GROUPE` → vente_total 3750 = 3 × 1250 des profils ; achat 1600 = 500+550+550. ✓

| column_id | Titre | Type | Colonne Postgres | Note |
|---|---|---|---|---|
| `name` | Name | name | `nom` | Prénom du profil |
| `status` | Statut | status | `statut` | `0=StaNd-by · 1=Actif (is_done) · 2=Arrêt · 3=TLM` |
| `date0` | Date d'intégration | date | `date_integration` | **Renseignée** sur l'échantillon → base du prorata |
| `text_mm3c5wrk` | Poste | text | `poste` | ex. "SO - Télépro" |
| `text_mm3cpa7p` | Type de contrat | text | `type_contrat` | |
| `numeric_mm3ctcvw` | Achat P | numbers | `achat_mensuel` | €/mois |
| `numeric_mm3ct9e3` | Vente P | numbers | `vente_mensuel` | €/mois |
| `date_mm3cg77v` | Date de fin | date | `date_fin` | |
| `text_mm3cdh3g` | Motif arrêt | text | `motif_arret` | |
| `text_mm3c6tmx` | ID - MA | text | `id_ma` | |
| — (parent) | — | — | `compte_id` | id de l'item parent (à résoudre au seed/refetch) |

---

## 2. Board « Leads/Prospects » — id `5002242500`

435 items · terminologie "Élément".

### Colonnes → table `leads_history`

| column_id | Titre Monday | Type | Colonne Postgres | Note |
|---|---|---|---|---|
| `name` | Nom | name | `nom` | Société |
| `color_mkw2jh1m` | Etat | status | `etat` | 20 labels — liste complète §3 |
| — | *(groupe de l'item)* | group | `groupe` | Les groupes = étapes macro (Gagnée, Arrêt Suivi…) |
| `text_mkvyy9zn` | Closer | text | `closer` | |
| `text_mkvys5cn` | Canaux d'acquisition | text | `canal_acquisition` | = "source de lead" |
| `dropdown_mkxxzznk` | Profil/Fonction | dropdown | `profil_fonction` | 56 labels |
| `color_mkxx9bn` | Type de contrat | status | `type_contrat` | `Mi-temps · Logiciel · Temps plein` |
| `numeric_mm36czjh` | nombre de profil | numbers | `nb_profils` | |
| `numeric_mkw2wdgc` | Achat P | numbers (€) | `achat_p` | €/mois |
| `numeric_mkw2r7c5` | Vente P | numbers (€) | `vente_p` | €/mois — ⚠ souvent NULL (déjà connu) |
| `numeric_mkw2kkwy` | % de probabilité | numbers (%) | `probabilite` | Entier 0-100 |
| `date_mkvyjth7` | Date d'ouverture de la recherche | date | `date_ouverture` | |
| `date_mkvyxkyt` | Date RDV | date | `date_rdv` | |
| `date_mkwkyjk3` | Date de présentation | date | `date_presentation` | |
| `date_mkvyjkag` | Date de démarrage souhaité | date | `date_demarrage_souhaite` | |
| `date_mky88ny5` | Date fin de contrat | date | `date_fin_contrat` | |
| `date_mm4ky7j2` | Date de création | date | `date_creation` | ⚠ NULL sur l'échantillon → fallback `created_at` natif de l'item |
| `date_mkvyw2wn` | Dernier échange | date | `dernier_echange` | |
| `date_mm3sgvz` | Date de relance | date | `date_relance` | |
| `text_mkvyzjxw` | Motif refus | text | `motif_refus` | Pour les Pareto de motifs |
| `date_mkwkpr6q` | Date Fin de Mission | date | `date_fin_mission` | |
| Autres (fichiers, boutons, liens, doc, board_relation, contact) | — | — | — | Hors périmètre |

### Groupes du board (→ champ `groupe`)

`min` · `Ouverture de recherche profil` · `En cours` · `Arrêt Suivi` · `Gagnée` ·
`ATRC après prez` · `Résilié / Arrêt de collaboration` · `Présentation de Profil` ·
`Stop Contact` · `En attente retour client` ·
`ARC après présentation / date de démarrage confirmé` · `Stand By` ·
`Relance à faire` · `TEST` *(à exclure du seed)*

→ Cohérent avec les constantes actuelles `GAGNES_GROUPES` / `PERDUS_GROUPES` du dashboard.

---

## 3. Labels « Etat » (color_mkw2jh1m) — référentiel complet

| id | Label | Actif |
|---|---|---|
| 0 | Arrêt suivi | ✓ |
| 1 | Contrat signé | ✓ (is_done) |
| 2 | Attente retour client | ✓ |
| 3 | Résilié / Arrêt de collaboration | ✓ |
| 4 | Relance à faire | ✓ |
| 5 | Point de cadrage | ✓ |
| 6 | Présentation profil | ✓ |
| 7 | Recherche profil | ✓ |
| 8 | Date de démarrage planifié/Contrat signé | ✓ |
| 9 | Stand By | ✓ |
| 10 | Suspension de contrat | ✓ |
| 11 | R1 Planifié | ✓ |
| 12 | Relance en cours | ✓ |
| 13 | Stop contact | désactivé |
| 14 | Fin de contrat | désactivé |
| 15 | Suivi MEP J+7 | ✓ |
| 16 | Suivi MEP J+21 | ✓ |
| 17 | R1 Reporté | ✓ |
| 18 | ATRC après prez | désactivé |
| 19 | R2 à planifier/planifié | désactivé |

→ Couvre 100% de `PIPELINE_ETATS` du dashboard actuel + « R1 Reporté » et
« Suspension de contrat » à classer (décision métier : pipeline ou non ?).

---

## 4. Décisions & impacts sur le plan

### 4.1 Trois webhooks, pas deux
Les profils vivent sur le board **`5096516278`** (« Sous-éléments de Comptes »).
Un webhook sur « Comptes » ne capte PAS les modifications de sous-éléments.
→ Webhooks à poser sur : `5002242498` (Comptes) + `5096516278` (Profils) + `5002242500` (Leads).

### 4.2 Historiser les profils, pas seulement les comptes
Nouvelle table **`profils_history`** (SCD2, mêmes colonnes techniques).
Bénéfices : prorata au profil près (date d'intégration / date de fin réelles),
`Achat/Vente total` du compte recalculables et vérifiables, détail par poste.
Le `date_demarrage` NULL au niveau compte n'est plus bloquant : le démarrage
réel = min(date_integration) des profils.

### 4.3 `date_creation` leads
Colonne récente, vide sur l'existant → le seed prend `created_at` natif de
l'item Monday comme fallback.

### 4.4 Groupe "TEST"
À exclure du seed et de l'ingestion (filtre sur group_id `group_mm36x68w`).

### 4.5 Volumétrie
35 comptes + ~8 profils/compte + 435 leads → seed < 1 000 lignes, trivial.

---

## 5. Ids à retenir (constantes du backend)

```
WORKSPACE_CRM        = 4930455
BOARD_COMPTES        = 5002242498
BOARD_PROFILS        = 5096516278   # sous-éléments de Comptes
BOARD_LEADS          = 5002242500
GROUP_LEADS_TEST     = group_mm36x68w   # à exclure
```
