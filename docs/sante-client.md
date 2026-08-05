# Santé client — déduite de la note, côté backend

Le niveau de santé affiché sur le dashboard (« Sain », « Sous vigilance »,
« Risque de départ ») **n'est plus une colonne Monday**. Il est calculé à la
lecture, dans `server/src/routes/api.js`, par `niveauSante()` :

| Note de satisfaction | Niveau |
|---|---|
| ≥ 65 | 🤩 Sain |
| 35 – 64 | 😐 Warning |
| < 35 | 😔 Risque de départ |
| absente | non noté (compté à part, aucun libellé) |

## Pourquoi la colonne Monday a disparu

« Detect sentiment » et « Note de satisfaction » étaient deux prompts IA
distincts lancés sur les mêmes échanges. Rien ne les obligeait à converger, et
ils ne convergeaient pas : au 2026-08-04, **41 comptes sur 88** portaient un
sentiment incompatible avec leur note, et 20 étaient vides. Le cas qui a
déclenché le constat : MOBIX, noté **35**, marqué « Sain » — pendant que RIKA
ENERGIES et MEDIA TECHNOLOGIE, notés 35 eux aussi, étaient en « Risque de
départ ». Trois notes identiques, trois verdicts différents.

Un prompt de traduction (« lis la note, sors le libellé ») a été rédigé, puis
abandonné : il aurait rendu le dashboard tributaire d'un appel IA de plus, avec
son coût, sa latence, son ordre d'exécution à surveiller et sa dérive possible —
pour un calcul qui tient en trois comparaisons. La colonne a été supprimée du
board.

## Les seuils

65 et 35, issus de l'étalonnage du prompt *note* (85 = sain · 50 = vigilance ·
25 = risque), abaissés de 5 points par rapport au milieu exact de chaque
intervalle : mieux vaut être indulgent qu'accusateur à la frontière. Sur les 36
clients actifs de juillet 2026, cela donne **13 sains · 20 sous vigilance · 0 à
risque · 3 sans note**.

Pour déplacer une frontière, il suffit de changer les deux nombres dans
`niveauSante()` — l'effet est immédiat, sans réécriture de base ni recalcul
Monday. C'est le principal gain du calcul à la lecture.

## Points à surveiller

**Les clients « sans information » ressortent Sain.** Le prompt note attribue 75
quand l'historique est insuffisant, ce qui franchit le seuil de 65. Pour changer
cela, modifier ce repli à 50 dans le **prompt note** — jamais ici : la note reste
la seule source, ce fichier ne fait que la traduire.

**Le champ `detect_sentiment` survit en base.** Il n'est plus ni écrit ni lu, et
`mapCompteFields()` a cessé de le remonter *avant* la suppression de la colonne
côté Monday — sans cette précaution, sa disparition aurait fait basculer les 88
comptes à vide d'un coup et créé autant de versions SCD2 vides de sens. La
colonne Postgres est conservée telle quelle : elle porte l'historique d'avant la
bascule.
