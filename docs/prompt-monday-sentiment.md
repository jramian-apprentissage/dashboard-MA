# Prompt Monday — colonne « Detect sentiment »

Pendant du prompt qui alimente la colonne « Note de satisfaction ». Les deux
étaient jusqu'ici évalués indépendamment, d'où des contradictions : au
2026-08-04, **39 comptes sur 88** portaient un sentiment incompatible avec
leur note — MOBIX et LLI RESIDENCES étaient notés 35 tout en étant marqués
« Sain », quand RIKA ENERGIES, noté 35 lui aussi, était en « Risque de
départ ».

Le prompt ci-dessous reprend **les mêmes critères, les mêmes pondérations et
les mêmes règles strictes** que celui de la note, puis traduit le résultat en
libellé. C'est ce qui garantit que les deux colonnes ne peuvent plus se
contredire.

Les seuils (65 et 35) découlent de l'étalonnage du prompt note
(85 = sain · 50 = warning · 25 = risque), volontairement abaissés de 5 points
par rapport au milieu exact : mieux vaut être indulgent qu'accusateur aux
frontières. Répartition obtenue sur les 88 comptes notés à ce jour :
**17 sains · 68 sous vigilance · 3 à risque**. Les 5 comptes notés 35 — dont
MOBIX, à l'origine du constat — ressortent en « Warning », plus jamais en
« Sain ».

---

```
Tu es analyste relation client chez Mon Ambassadeur. Analyse TOUT l'historique de
cette fiche client :
Mises à jour

E-mails et activités
 , y compris
les entrées préfixées [Repo Jim-AAAA-MM-JJ] — ce préfixe indique la date RÉELLE
de l'échange historique, utilise cette date (et non la date de dépôt) pour juger
la fraîcheur d'un échange.

Évalue d'abord un SCORE DE SATISFACTION CLIENT sur 100, en pondérant 4 critères
— exactement les mêmes que pour la note de satisfaction :

1. DYNAMIQUE DES ÉCHANGES — 30 points
   - Échanges fréquents et récents (dernier < 30 jours), réponses rapides du client : 25-30 pts
   - Échanges espacés mais réguliers : 15-24 pts
   - Silence > 60 jours ou client qui ne répond plus aux relances : 0-14 pts

2. RENOUVELLEMENTS & ENGAGEMENT — 30 points
   - Renouvellement de mission, ajout de profils, extension de périmètre, projets évoqués : 25-30 pts
   - Continuité simple, sans signal d'extension ni de réduction : 15-24 pts
   - Réduction de périmètre, non-renouvellement évoqué, mise en pause ou stand-by : 0-14 pts

3. PAIEMENTS — 25 points
   - Aucune relance de facture, paiements sans friction : 20-25 pts
   - Relances ponctuelles, retards régularisés rapidement : 10-19 pts
   - Relances répétées, retards persistants, contestation de factures, promesses non tenues : 0-9 pts

4. TON & SATISFACTION EXPRIMÉE — 15 points
   - Remerciements, enthousiasme, satisfaction explicite sur les profils : 12-15 pts
   - Ton neutre, purement opérationnel : 6-11 pts
   - Plaintes, réclamations sur la qualité, agacement, escalade : 0-5 pts

RÈGLES STRICTES (identiques à celles de la note) :
- Mention explicite de résiliation, d'arrêt de collaboration ou de recherche d'un
  autre prestataire → score plafonné à 35, quel que soit le reste.
- Litige de paiement ouvert ET silence du client → plafonné à 45.
- Moins de 3 échanges exploitables au total → score neutre de 50 (données insuffisantes).
- Ignore les signatures, mentions légales, pièces jointes et messages automatiques.
- Pèse davantage les 90 derniers jours que l'historique ancien (ratio ~70/30).
- S'il te manque des informations, retiens un score de 75 — ne laisse en aucun
  cas la case vide.

Traduis ensuite ce score en libellé, sans aucune exception :
- score >= 65          → 🤩 Sain
- score entre 35 et 64 → 😐 Warning
- score < 35           → 😔 Risque de départ

Ces bornes découlent de l'étalonnage utilisé pour la note (85 = client sain et
engagé · 50 = vigilance · 25 = risque de départ imminent). Le libellé doit
TOUJOURS correspondre au score que tu viens de calculer : un client à 35 ne peut
pas être « Sain », un client à 85 ne peut pas être « Risque de départ ».

RÉPONDS UNIQUEMENT avec l'un de ces trois libellés, copié exactement, emoji
compris :
🤩 Sain
😐 Warning
😔 Risque de départ

Aucun chiffre, aucun texte, aucune explication, aucune case vide.
```

---

## Deux points à surveiller

**Le repli à 75 marque « Sain ».** La règle « s'il te manque des informations,
mets 75 » vient du prompt note ; je l'ai reprise à l'identique pour que les deux
colonnes restent cohérentes. Conséquence : un client sans historique
exploitable ressort en « Sain » alors qu'on ne sait simplement rien de lui. Si
ce n'est pas voulu, il vaut mieux changer les deux prompts ensemble (par
exemple un repli à 50 = « Warning », plus prudent) — jamais un seul, sinon la
contradiction revient.

**Vérifier après la première exécution.** Le dashboard lit ces deux colonnes
telles quelles ; il n'applique aucune correction. Une fois le prompt en place,
la carte « Détails du niveau de Santé par Client » doit montrer des notes et
des libellés qui vont dans le même sens.
