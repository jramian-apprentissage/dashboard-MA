# Prompt Monday — colonne « Detect sentiment »

Cette colonne se contente de **traduire la note de satisfaction en libellé**.
Elle ne relit ni les mises à jour, ni les e-mails, ni l'historique : la
colonne « Note de satisfaction » a déjà fait ce travail.

C'est ce qui garantit la cohérence. Les deux colonnes étaient auparavant
évaluées indépendamment sur les mêmes échanges, et arrivaient à des
conclusions différentes : au 2026-08-04, **39 comptes sur 88** portaient un
sentiment incompatible avec leur note. MOBIX et LLI RESIDENCES étaient notés
35 tout en étant marqués « Sain », quand RIKA ENERGIES, noté 35 lui aussi,
était en « Risque de départ ». Avec une seule analyse en amont, la
contradiction devient impossible par construction.

Les seuils (65 et 35) découlent de l'étalonnage du prompt note
(85 = sain · 50 = warning · 25 = risque), volontairement abaissés de 5 points
par rapport au milieu exact : mieux vaut être indulgent qu'accusateur aux
frontières. Répartition obtenue sur les 88 comptes notés à ce jour :
**17 sains · 68 sous vigilance · 3 à risque**. Les 5 comptes notés 35 — dont
MOBIX, à l'origine du constat — ressortent en « Warning », plus jamais en
« Sain ».

---

```
Tu classes la santé d'un client à partir de sa note de satisfaction, déjà
calculée dans la colonne :
Note de satisfaction

N'analyse RIEN d'autre : ni les mises à jour, ni les e-mails, ni l'historique
des échanges. La note résume déjà tout cela. Ton seul travail est de la
traduire en libellé.

Règle, sans aucune exception :
- note >= 65          → 🤩 Sain
- note entre 35 et 64 → 😐 Warning
- note < 35           → 😔 Risque de départ

Si la note est vide ou illisible, réponds 😐 Warning.

RÉPONDS UNIQUEMENT avec l'un de ces trois libellés, copié exactement, emoji
compris :
🤩 Sain
😐 Warning
😔 Risque de départ

Aucun chiffre, aucun texte, aucune explication, aucune case vide.
```

---

## Points à surveiller

**L'ordre d'exécution.** Le sentiment lit la note : il doit être recalculé
*après* elle. Si Monday évalue les deux colonnes en parallèle, le sentiment
lira l'ancienne note et restera en retard d'un cycle.

**Les clients « sans information » ressortent en Sain.** La règle du prompt
note attribue 75 quand l'historique est insuffisant, ce qui donne « Sain »
ici — un client dont on ne sait rien apparaît donc comme sain. Pour le
changer, modifier ce repli à 50 dans le **prompt note**, jamais dans celui-ci :
c'est la note qui décide, ce prompt ne fait que la refléter.

**Le dashboard n'applique aucune correction.** Il lit ces deux colonnes telles
quelles. Après la première exécution, la carte « Détails du niveau de Santé
par Client » doit montrer des notes et des libellés qui vont dans le même
sens.
