# Fiabiliser août et septembre dans le dashboard

Décisions du 9 octobre 2026. Ce document est le plan de travail, pas une
proposition : les arbitrages sont pris, ils sont rappelés en tête de chaque
section pour qu'on sache plus tard pourquoi.

## Ce qu'on vise

| Mois | Règle | CA visé |
|---|---|---|
| jusqu'à juillet | legacy Excel, **on ne touche à rien** | 64 966 € en juin, 68 305 € en juillet |
| août | dates corrigées, **avec prorata** | **66 066 €**, voir la réserve ci-dessous |
| septembre et après | dates corrigées, **avec prorata** | **84 443 €** une fois Monday corrigé |

Deux arbitrages sont derrière ce tableau.

Les données antérieures à août ne bougent pas. Ce n'est pas gênant : les mois
legacy sont déjà proratisés à la source, puisque l'import Excel stockait le
montant facturé. La série est donc homogène de bout en bout, une fois août et
septembre alignés.

Août et septembre suivent la même règle, dates corrigées et prorata. C'est ce
qui permet de comparer les deux mois sans précaution de lecture, et ce qui
fait que le dashboard affiche pour septembre le chiffre du support présenté à
la direction.

**Réserve sur le chiffre d'août.** Les 66 066 € sont calculés sur les données
d'aujourd'hui, donc avant l'étape 0. Quatre missions sans date de fin, 4 770 €,
sont pour l'instant écartées faute de pouvoir être placées. Une fois ces dates
saisies, août se situera entre 66 066 € et 70 836 € selon la date réelle de
ces arrêts. Le chiffre définitif sort de l'étape 2, pas d'ici.

**Ce que ça donne comme lecture du mois**

| | Août | Septembre | Évolution |
|---|---|---|---|
| Ce que le dashboard affiche aujourd'hui | 85 313 € | 100 245 € | +17,5 % |
| Après travaux | 66 066 € | 84 443 € | **+27,8 %** |

Les 85 313 € d'août annoncés à la direction deviennent 66 066 €, soit 23 % de
moins. C'est le coût de l'exactitude et il faut l'assumer en séance. En
contrepartie, septembre cesse d'être un mois plat pour devenir un mois à près
de 28 % de croissance, ce qu'il est réellement.

**Le changement de méthode ne s'affiche pas à l'écran.** Pas d'astérisque, pas
de bandeau, pas de note sous les cartes. L'explication se donne de vive voix.

## L'approche retenue : écrire les montants, ne pas toucher au calcul

Deux voies existaient : faire calculer le prorata par `api.js`, ou écrire le
montant retenu sur chaque ligne. On prend la seconde, pour trois raisons.

Elle n'ouvre pas `server/src/routes/api.js`. Onze requêtes y dépendent de
l'ancrage point-in-time, dont quatre copies de la même logique, et la requête
des secteurs utilise déjà `$6` pour autre chose. C'est exactement ce qui avait
provoqué cinq minutes de HTTP 500 le 8 octobre. Ici il n'y a rien à
renuméroter.

Elle réutilise une convention déjà vraie partout. Les 1 584 lignes legacy
portent toutes `vente_reel` et `achat_reel`, et 249 y diffèrent du tarif
plein : dans cette base, `vente_reel` veut dire « le montant retenu ». Les 257
lignes Monday sont les seules à ne pas le remplir. On termine un import, on
n'invente pas un mécanisme.

Elle absorbe la différence de règle entre août et septembre sans la coder.
Deux conventions deviennent deux passes d'écriture, et le chemin de lecture ne
change pas.

## Les étapes

### Étape 0. Corriger Monday, avant tout code

Rien de ce qui suit ne vaut si la source reste fausse, et une correction faite
après le gel ne remontera pas dans le mois figé.

**Les quatre dates de fin manquantes**, 4 770 € en août. Sans elles, aucune
règle de dates ne peut placer ces missions, et elles disparaissent du mois au
lieu d'y être comptées.

| Client | Profil | Vente | Statut | Intégration |
|---|---|---|---|---|
| LA CLINIQUE DES CHAMPS ELYSEES | Robson | 1 290 € | Arrêt | 20/07 |
| LA CLINIQUE DES CHAMPS ELYSEES | Léa | 1 290 € | Arrêt | 20/07 |
| REGARD INC | Angelico | 1 200 € | Stand-by | 12/05 |
| HUBL | TLM | 990 € | Arrêt | aucune |

**Les deux statuts qui contredisent leur date de fin.** Ils polluent août,
septembre et octobre, et continueront tant que la fiche ne bouge pas.

| Client | Profil | Statut | Date de fin |
|---|---|---|---|
| LLI RESIDENCES | Diamanticah | Actif | 30/06 |
| G1BESOIN | TLM | TLM | 31/07 |

**Le doublon CEPREMIUM**, Jerry et Antonin, 600 € : la fiche compte treize
lignes actives pour douze personnes. C'est l'unique écart qui sépare les
85 043 € calculés depuis la base des 84 443 € du classeur de septembre.

**Les deux tarifs non répercutés**, REMIXT / Yvonnah et TAB FRANCE / Aina,
190 € au total.

### Étape 1. Réparer `sync-dates-fin.js` avant qu'il ne casse un mois figé

`server/scripts/sync-dates-fin.js`, ligne 109 :

```sql
UPDATE profils_history SET date_fin = $1::date WHERE profil_id = $2
```

Aucun filtre sur `valid_to`. Ce script réécrit **toutes** les versions d'un
profil, y compris celles d'un mois déjà clos. Tant qu'il est dans cet état,
tout gel est réversible par accident. Ajouter `AND valid_to IS NULL`.

### Étape 2. Le script de calcul, en lecture seule

`server/scripts/figer-mois.mjs --mois=2026-08 [--apply]`, sans `--apply` il
n'écrit rien et sort un CSV d'une ligne par `profil_id` :
vente mensuelle, achat mensuel, jours ouvrés du mois, jours travaillés, ABS,
montant retenu, et la raison de la retenue ou de l'exclusion.

La règle d'éligibilité, celle de septembre :

```
statut Actif ou TLM, OU date de fin au 1er du mois ou après
ET date de fin vide, ou au 1er du mois ou après
ET date d'intégration vide, ou au dernier jour du mois au plus tard
```

Le prorata, appliqué à tous les mois traités :

```
vente retenue = vente mensuelle × (21 − ABS) / 21
achat retenu  = achat mensuel × jours travaillés / jours ouvrés du mois
ABS           = jours ouvrés du mois − jours travaillés
```

Les deux bases diffèrent, 21 pour la vente et les jours ouvrés réels pour
l'achat. Ce n'est pas une erreur, c'est la règle de la compta, retrouvée au
centime sur 12 des 13 lignes à contrat unique de septembre. Août compte 21
jours ouvrés, septembre 22.

**Comment on valide le script** : on le lance sur septembre. Il doit sortir
**84 443 € et 37 clients**, le chiffre du classeur, une fois l'étape 0 faite.
S'il ne retombe pas dessus, il est faux et août ne vaut rien.

### Étape 3. Mensualiser les lignes Monday d'août

Une ligne Monday n'est pas une ligne de mois : **63 des 79 lignes qui portent
août portent aussi septembre**, pour 70 518 €. Écrire un montant d'août dessus
contaminerait septembre.

Le geste existe déjà. `server/scripts/mensualiser-profils-legacy.mjs`, écrit le
18 août, a fait exactement ce découpage sur les 1 584 lignes legacy, avec
comparaison du CA mois par mois avant et après et abandon au moindre écart. Son
en-tête annonce même la suite : « Monday va par ailleurs écrire du mensuel,
on uniformise sur ce format ». Le chantier a simplement été interrompu.

On le calque pour Monday, une seule coupe, au 2026-09-01 00:00Z, dans une
transaction :

1. `UPDATE` de la ligne existante, `valid_to = 2026-09-01`
2. **puis** `INSERT` de la queue `[2026-09-01, ancien valid_to)`, tous les
   champs recopiés, `vente_reel` laissé vide

L'ordre est imposé par l'index partiel `ux_profils_open`, unique sur
`profil_id WHERE valid_to IS NULL` : insérer avant de fermer le fait échouer.

Aucune coupe à gauche n'est nécessaire, aucune ligne Monday ne commence avant
le 1er août.

**Empreinte de contrôle, à retrouver au centime après la coupe :**

| Mois | Lignes ancrées | Éligibles | Vente | Achat |
|---|---|---|---|---|
| 2026-08 | 169 | 79 | 85 313 € | 38 210,40 € |
| 2026-09 | 187 | 91 | 100 245 € | 43 562 € |
| 2026-10 | 187 | 82 | 92 705 € | 40 958 € |

La coupe est une réécriture de forme, elle ne doit déplacer aucun chiffre. Tout
écart déclenche un `ROLLBACK`.

### Étape 4. Écrire les montants d'août

Dans la même transaction, `UPDATE vente_reel` et `achat_reel` sur les seules
lignes bornées `[.., 2026-09-01)`, depuis le CSV de l'étape 2, **zéros
compris** pour les lignes que la règle neutralise.

Après écriture, août doit valoir le montant sorti de l'étape 2, 66 066 € sur
les données d'aujourd'hui et davantage une fois les quatre dates de fin
saisies. Septembre comme octobre doivent
être inchangés au centime.

Deux pièges à connaître :

`closeAndInsert`, dans `server/src/scd2.js`, construit son `INSERT` depuis les
seules clés de `mapProfilFields`, qui ne contient ni `vente_reel` ni
`achat_reel`. Une valeur écrite sur une ligne **ouverte** serait perdue à la
version suivante. On n'écrit donc que sur des lignes fermées.

Le filtre de statut est dans le `ON` du `LEFT JOIN`, `api.js` ligne 109, donc
**avant** le `COALESCE`. Une ligne dont le statut à l'ancre n'est ni Actif ni
TLM ne reçoit jamais la valeur écrite. Pour que les missions arrêtées en cours
de mois comptent, la ligne mensuelle doit porter le statut en vigueur pendant
le mois, pas celui observé après coup. C'est déjà la convention des lignes
legacy.

### Étape 5. Septembre, une fois le mois clos

Même enchaînement, même règle, coupe au 2026-10-01 puis écriture.
Cible 84 443 €.

### Étape 6. La photo de non-régression

Il n'existe aucun test dans le dépôt, ni script `test` dans `package.json`. On
en fabrique le minimum : un script qui appelle `/api/kpis`, `/api/monthly`,
`/api/comptes/secteurs`, `/api/comptes/perdus`, `/api/profils/missions` sur
juin, juillet, août et septembre, écrit les JSON, et se rejoue après pour
produire un diff.

Assertions qui doivent tenir : juin 2026 à 64 966 € et 34 clients, juillet 2026
à 68 305 € et 36 clients. Aucun centime de bougé sur ces deux mois, sinon on
a touché au legacy.

## Ce qu'on ne fait pas

On ne recalcule aucun mois antérieur à août, même pour homogénéiser.

On ne touche pas à `api.js`. Si une étape l'exige, c'est que l'approche est
mauvaise, pas que le fichier doit être rouvert.

On n'affiche rien à l'écran sur le changement de méthode.

On ne ferme pas les lignes fantômes par une date rétroactive. Une fermeture
porte la date du jour, c'est la règle de la table, et la corriger après coup
ferait mentir l'historique.

## Les pièges, par ordre de gravité

1. **Le paramètre `$6`.** Un remplacement de chaîne dans `api.js` touche
   plusieurs requêtes qui partagent le même SQL mais pas le même nombre de
   paramètres. C'est ce qui a mis la production à terre le 8 octobre. Le plan
   l'évite en ne touchant pas au fichier.
2. **`sync-dates-fin.js` sans filtre `valid_to`**, étape 1. À réparer avant le
   premier gel.
3. **`closeAndInsert` ne reporte pas `vente_reel`.** N'écrire que sur des
   lignes fermées.
4. **L'index `ux_profils_open`.** Fermer avant d'insérer.
5. **Le statut porté par la ligne mensuelle.** Sans décision explicite, il
   manque 2 786 € en septembre.
6. **Les quatre dates de fin manquantes.** Sans elles, août perd 4 770 € qui
   correspondent à du travail réellement effectué.

## L'effort

| Étape | Nature | Ordre de grandeur |
|---|---|---|
| 0. Corriger Monday | saisie métier, pas de code | une heure à deux, à faire par qui tient les fiches |
| 1. `sync-dates-fin.js` | une ligne | dix minutes |
| 2. Script de calcul | nouveau script, lecture seule | une demi-journée, validation comprise |
| 3. Mensualiser août | script calqué sur l'existant | une demi-journée |
| 4. Écrire les montants | même transaction que l'étape 3 | compris ci-dessus |
| 5. Septembre | rejouer 3 et 4 | une heure |
| 6. Photo de non-régression | nouveau script | une demi-journée |

## Ce qui reste à trancher

Le statut que porte une ligne mensuelle, voir le piège 5. Je propose le statut
en vigueur pendant le mois, comme pour le legacy, mais c'est une décision.

La date de fin réelle des quatre missions sans date. Elle conditionne 4 770 €
d'août et personne d'autre que l'opérationnel ne peut la donner.

Octobre et les mois suivants suivent la même règle, par continuité. Il n'y a
plus qu'une seule méthode à partir d'août, donc plus rien à arbitrer de ce
côté : chaque mois se fige à sa clôture, de la même façon.
