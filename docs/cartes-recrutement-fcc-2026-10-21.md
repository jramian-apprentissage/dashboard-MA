# Dashboard Recrutement et pipeline : ce qu'on peut coder avec le FCC

Analyse du 21/10/2026 sur `#04 RH - GESTION COMMANDE CLIENT (FCC) (2).xlsx`,
onglet « Suivi de commande RH Q2 », 59 commandes. Chaque chiffre a été
calculé puis recalculé indépendamment par un second lecteur. Les 21 verdicts
ont tenu.

## Ce que la nouvelle version du FCC apporte

Une seule chose, et elle ne débloque aucune carte : **« Numéro Commande » est
passée de 5 % à 100 %**. Une colonne « Commentaire » a été ajoutée mais elle
est vide sur les 59 lignes. Les 24 autres colonnes sont identiques au cent
près, et les 59 commandes sont les mêmes.

Ce que cela change quand même : il existe désormais une clé primaire stable.
C'est exactement le blocage que le document des 50 indicateurs signalait
(« `Numéro Commande` est vide dans les lignes observées »), et c'est la clé de
jointure vers le classeur GESTION RECRUTEMENT TALENTS, seul endroit où les
étapes R0 à R7 sont datées.

Réserve de lecture : la clé n'est pas homogène. 56 lignes portent CMD001 à
CMD056, sans trou ni doublon, et 3 portent un identifiant numérique brut
(5084897275, 5003291363, 2942763180). Les valeurs restent uniques, donc la
jointure tient, mais **un filtre sur le préfixe « CMD » perdrait 3 commandes,
et les 3 sont pourvues**.

## Le piège qui fausse tout inventaire de ce fichier

Les cellules `-` et `N/A` sont des marqueurs de vide saisis à la main. Comptées
comme renseignées, elles gonflent les taux : « Date de démarrage » paraît
remplie à 56 % alors qu'elle ne porte que **18 vraies dates sur 59, soit
31 %**. Il y a 104 `-` et 1 `N/A` répartis sur 7 colonnes.

Mon inventaire du 20/10, écrit dans les trois vues du dépôt, tombait dans ce
piège. Les taux corrigés sont ci-dessous.

| Colonne | annoncé le 20/10 | réel |
|---|---|---|
| Date de démarrage | 56 % | **31 %** |
| Fiche de commande | 54 % | **8 %** |
| Budget de la mission | 52 % | **12 %** |
| Responsable presentation RRH | 61 % | **31 %** |
| Date RDV présentation client R5 | 57 % | **27 %**, dont 13 vraies dates |
| #candidat à Présentés R4 | 67 % | **42 %** |

## Deux colonnes vivantes, à ne jamais ingérer comme des faits

**`Temps de recrutement`** (86 % remplie, texte du type « 71 Jours ») n'est pas
une durée de recrutement. Sa formule a été retrouvée et vérifiée sur les 51
valeurs : `max(0, (Fin de recherche R3 ou la date du jour) moins Echéance R3)`.
C'est un compteur de **retard**, borné à zéro, et 26 de ses valeurs grossissent
d'un jour chaque jour, y compris sur des commandes annulées depuis des mois.
Elle porte 12 valeurs « 0 Jour » là où la recherche a réellement duré de 1 à
43 jours. Reprise telle quelle elle afficherait une durée moyenne de 55 jours,
qui ne mesure rien.

**`Dif`** (83 % remplie) vaut l'ancienneté en heures depuis la date de
commande, recalculée à chaque ouverture du classeur. Même nature, même
interdiction.

Les deux sont à exclure de l'ingestion. Toute ancienneté et toute durée se
recalculent depuis les dates.

## Classement des 21 cartes

### On code maintenant, 8 cartes

| Carte | Vue | Valeur aujourd'hui | Couverture |
|---|---|---|---|
| Besoin de recrutement en cours | 1 | **21** besoins, 20 profils demandés | 59/59 |
| Taux des besoins ouverts depuis plus de 15 jours | 1 | **89 %** (16 sur 18 datés) | 18/21 des besoins |
| Ancienneté des besoins en cours | 1 | 2 / 3 / 0 / 13 par tranche | 18/21 des besoins |
| Commandes en cours de recrutement | 2 | **28** en cours, 16 abouties, 14 annulées | 57/59 |
| Processus de recrutement R0 à R7 | 2 | R4 en tête avec 9 commandes | 28/29 du périmètre |
| Taux de besoins non aboutis | 3 | **27,5 %** (14 sur 51) | 51/59 |
| Besoins clôturés sans recrutement | 3 | **14** | 14/14 |
| Détail des besoins clôturés | 3 | 14 lignes complètes | 14/14 |

Deux réserves sur ce groupe.

« Taux des besoins ouverts depuis plus de 15 jours » tient à 85,7 % de
couverture, soit 0,7 point au-dessus du seuil. **Une seule commande ouverte
sans date de plus et la carte bascule en partielle.** Trois cellules à saisir
la mettent définitivement à l'abri.

« Besoins clôturés sans recrutement » est à **supprimer**, voir plus bas.

### On code, mais la carte sera muette sur une partie du fichier, 11 cartes

| Carte | Vue | Valeur | Parle de |
|---|---|---|---|
| Taux de besoins pourvus | 1 | 25 % (13 sur 51) | 51/59, en rate 3 pourvues |
| Recrutements réalisés | 1 | 18 affichés, **8 crédibles** | 18/59 |
| Suivi des besoins par entité | 1 | 15 entités | 100 % pour la 1re colonne, 31 % pour la 2e |
| Candidats en cours de recrutement | 2 | 26 ou 10 selon le périmètre | 12/28 des commandes en cours |
| Délai moy. pour pourvoir un poste | 2 | médiane **10 j**, moyenne 28 j | 11/59 |
| Durée moy. du recrutement | 2 | médiane **8 j**, moyenne 17 j | 26/59 |
| Taux de recrutements réalisés dans les délais | 2 | 40 à 48 % selon la règle | 25/59 |
| Candidats en recrutement par entité | 2 | 8 entités | 12/59 |
| Taux de transformation des profils présentés | 2 | **44,8 %** (30 sur 67) | 22/59 |
| Profils présentés par commande | 2 | 2,88 par commande, 1,67 par besoin | 25/59 |
| Charge assignée par recruteur | 3 | Hirijy 15 besoins sur 21, soit 71 % | 18/21 assignés |

### À ne pas coder cette semaine, 2 cartes

**Évolution du délai pour pourvoir un poste.** Quatre points de courbe
construits sur 1 à 5 commandes par mois, et la série s'arrête au 05/08/2026,
dernière date de démarrage du fichier. Sur une période « année en cours » la
courbe plongerait à zéro en septembre et octobre, et le lecteur y lirait un
délai qui s'effondre alors qu'il n'y a aucun démarrage saisi. Proposer à
Clémence un nuage de 11 points avec l'effectif assumé, ou l'état vide « pas
assez de démarrages saisis pour une tendance ».

**Graphe mensuel taux de recrutement réalisé contre taux de besoins non
aboutis**, demandé par Clémence sur la planche 16. Le mois ne peut venir que
de `Date de la commande`, seule date de naissance disponible, donc chaque mois
porterait une issue survenue des mois plus tard. Les effectifs mensuels vont
de 3 à 9 commandes, si bien qu'une seule annulation déplace le taux de 11 à
33 points : la série calculée donne un zigzag illisible (février 33 %, mars
50 %, avril 67 %, mai 0 %, juin 14 %, juillet 0 %, août 25 %, septembre 44 %,
octobre 0 %). À rouvrir une fois la date d'annulation collectée.

## Deux cartes à supprimer, et Clémence avait vu les deux

**« Recrutements réalisés » de la planche 16 est un doublon complet de celle
de la planche 13.** Même colonne, même règle, même valeur, 18, et le même
sous-titre « 18 sur 53 » sur les deux planches. Son annotation « Mettre
Recrutements réalisés comme sur la slide 13 ? » appelait cette réponse : oui,
et il faut en supprimer une. Si la planche 16 garde la sienne, elle doit
changer d'unité (profils placés, 20) et de libellé.

**« Besoins clôturés sans recrutement » est le numérateur du taux de besoins
non aboutis, sorti de sa fraction.** Même filtre, même périmètre, strictement
le même ensemble de 14 lignes. Son annotation « le volume n'est-il pas déjà
dans le taux ? Si oui, l'intégrer à la description plutôt qu'un widget de
plus » est exacte. Le volume va dans le sous-titre, « 14 besoins annulés sur
51 commandes ouvertes en 2026 », et une tuile se libère sur la rangée.

## Trois chiffres de la maquette qui ne tiennent plus

**Le « 21 % » des besoins ouverts depuis plus de 15 jours est une erreur
d'unité, pas un écart.** 21 était le volume, pas le taux : au 27/09 le graphe
de la même planche donnait 24 besoins datés dont 21 au delà de 15 jours, soit
88 %. La tuile avait recopié le compte. La valeur correcte est **89 %
aujourd'hui**, et l'écart de 68 points avec la maquette se verra en revue. Il
faut le dire avant.

**« Recrutements réalisés 18 » est gelé.** Le compte est le même qu'au 27/09
alors que 6 commandes se sont ajoutées et 38 sont closes. Le dernier démarrage
saisi est le 05/08/2026, il y a 77 jours. Et sur ces 18 lignes, 5 portent une
seule et même date recopiée en bloc (2026-06-05, cinq commandes REGARD INC,
toutes à 0 profil retenu, dont deux annulées et trois encore en sourcing),
4 autres partagent le 2026-05-25, 5 des 18 portent sur une commande annulée, et
10 affichent 0 profil retenu. **Le chiffre défendable est 8, pas 18.** À dire à
Clémence avant qu'elle ne lise 18 sur deux planches comme une production
d'équipe.

**Le taux de besoins non aboutis est passé de 17 % à 27,5 % en 24 jours**, par
6 annulations saisies depuis le 27/09. Ce n'est pas un défaut de mesure, c'est
le fichier. Mais comme aucune colonne ne date la clôture, le taux d'une cohorte
ne peut que monter avec le temps : 21 commandes sur 59 sont encore ouvertes et
peuvent encore basculer. La carte doit porter la mention « provisoire » et
afficher le nombre de commandes encore ouvertes dans la cohorte.

## La question de Clémence : commande ou besoin ?

Sur la planche 15 elle demande « c'est quoi une commande par rapport à un
besoin ? Si c'est pareil, mettre besoin ». Le fichier répond :

**Une ligne du FCC est une commande, et cette commande porte N besoins via
`# PROFIL`.** Sur les 56 lignes renseignées la somme fait 91 postes : 44
commandes portent 1 poste, 6 en portent 2, 2 en portent 3, une 4, une 5, et
deux en portent 10 (CMD008 MA télémarketeur B2B, CMD019 CCE conseiller
commercial). Les deux mots ne sont donc pas la même unité.

En pratique la question est presque sans effet, puisque 44 des 59 commandes
portent exactement 1 poste : compter les besoins revient à compter les postes,
ce qui est l'arbitrage que Clémence a elle même posé le 30/09, « un recrutement
= un poste de facto ». **Mais le libellé doit nommer l'unité**, sinon la
confusion persiste, et elle est instable : qu'une commande à 10 postes entre en
recherche et la carte dirait 29 commandes pour 37 besoins.

Il reste un vrai écart à trancher, et il ne porte pas sur l'unité mais sur le
**périmètre**. La planche 13 compte 21 besoins (par `Statut commande`), la
planche 15 compte 28 commandes (par `Statut RH`), et leur intersection n'est
que de 19. Deux commandes n'existent que sur la planche 13, neuf que sur la
planche 15. Tant que l'arbitrage n'est pas rendu, **deux pages du dashboard
afficheront deux vérités**.

## Le conflit de statuts, à arbitrer avant de coder

`Statut commande` et `Statut RH` se contredisent sur **9 commandes** : CMD021,
CMD025, CMD026, CMD028, CMD030, CMD034, CMD043, CMD044 et CMD055 sont
« Terminé » tout en restant déclarées à R2, R4, R5, R6 ou R7.

L'enjeu est un facteur 1,5 sur la carte « Commandes en cours » : 28 en croyant
`Statut RH`, 19 en croyant `Statut commande`. Le bas du tunnel R6 et R7 est
intégralement composé de ces lignes contradictoires.

À poser à Julien Prevost, référent de 44 des 59 lignes, et à Hirijy
Razakaratrimo, responsable de 32 recherches.

## Ce qu'il faut demander à l'équipe RH, par ordre de rendement

**1. Huit cellules sur cinq lignes.** C'est de loin le meilleur rapport.

- `Date de la commande` sur CMD027, CMD031, CMD056
- `Responsable de la recherche` sur CMD003, CMD031, CMD032
- `# PROFIL` sur CMD027, CMD056

Gains : le taux des besoins de plus de 15 jours quitte le fil du rasoir et
passe à 21 sur 21 ; le graphe d'ancienneté couvre les 21 besoins ; la colonne
ancienneté du tableau par entité passe de 80 % à 100 %, ce qui suffit à faire
basculer cette carte dans le premier groupe ; la charge par recruteur perd sa
ligne « non assigné » à 14 %.

**2. Deux colonnes nouvelles : date de clôture et motif à liste fermée**, à
remplir sur les 14 annulées. Aucune des 26 colonnes ne porte de motif, et la
colonne `Commentaire` ajoutée dans cette version est vide sur les 59 lignes.
La case existe donc déjà, il ne faut pas en demander une de plus mais une
nomenclature dedans.

Gains : le filtre Période et le bouton Comparer deviennent possibles sur toute
la planche 16, le graphe mensuel demandé par Clémence devient défendable, et
la colonne de tri du détail des besoins clôturés cesse de mentir.

**3. Le nettoyage de `Date de démarrage`**, environ 16 cellules dont la moitié
à retirer : ajouter les 8 dates des commandes « En poste » qui n'en ont pas
(CMD003, CMD017, CMD033, CMD035, CMD036, CMD038, CMD039, CMD042), retirer les
saisies en bloc, et corriger les 4 lignes dont le démarrage précède
l'ouverture de recherche, jusqu'à 152 jours d'écart.

**4. Seize cellules sur `#candidat à Présentés R4`**, en priorité les trois
commandes TESSAN, toutes à l'étape R4 sans aucun candidat compté, et trois
REGARD INC. Gains : quatre cartes. Mais même remplie, la colonne reste un
volume de shortlist et non un stock de personnes : l'indicateur commandé
réclame le classeur PIPELINE TALENTS.

**5. Vingt deux cellules sur `Nombre de Profil Retenue`**, dont 11 sur les
besoins ouverts, pour la charge nette et les taux pondérés par places.

**6. `Fin de recherche R3` et `Debut Recherche R0`**, 33 et 30 cellules. C'est
l'effort le plus lourd et le moins fiable à reconstituer après coup : une date
rétro documentée de mémoire vaut moins qu'une case vide assumée. Ces deux
colonnes bloquent pourtant les trois quarts du bloc délais.

## Ce qu'aucune saisie dans le FCC ne réparera

**`#04 RH MA - PIPELINE TALENTS`** pour « candidats en cours de recrutement »
et « candidats par entité ». La déduplication par e mail n'existe que là ; un
même candidat présenté à deux clients est aujourd'hui compté deux fois sans
qu'on puisse le savoir.

**`#04 RH - GESTION RECRUTEMENT TALENTS`**, onglet `Suivi Recrutement - Q2`,
pour le processus R0 à R7. C'est la seule source où les étapes sont des tâches
datées. Aujourd'hui l'étape est purement déclarative et jamais datée, ce qui
interdit toute ancienneté par étape et rend les contrôles Période et Comparer
inopérants sur cette planche. **La clé de jointure existe depuis cette version
du FCC.**

**`#04 RH - LISTE DES COLLABORATEURS`**, onglet `Suivi Entrées`, qui porte les
vraies dates d'entrée que la colonne gelée du FCC n'a pas. Mais la jointure est
impossible : le FCC ne porte aucune colonne `ID - MA`, et le rapprochement par
entreprise plus nom du poste est interdit par la commande. Deux voies, et la
seconde est bien moins chère : ajouter `ID - MA` au FCC, ou faire saisir les
8 dates de démarrage manquantes.

## Trois points à régler sur les libellés

Le titre de section de la planche 16 reste **« Performance des recruteurs &
suivi des besoins »** alors que le mail demande de recentrer sur la charge.
Poser « charge assignée par recruteur » dans une section nommée « performance »
rétablit exactement la lecture en palmarès que Clémence refuse. Le titre doit
changer aussi.

**« Taux de recrutements réalisés dans les délais » promet un recrutement et
mesure une fin de recherche.** Sur les 25 commandes comptées, 13 n'ont aucune
date de démarrage. La commande des 50 indicateurs recommande « respect des
échéances R3 ».

**« Durée moy. du recrutement » n'est pas un time to hire.** Elle mesure R0
vers fin de recherche R3, et aucune colonne ne porte la date d'acceptation
d'offre. Le document le signale et demande de ne pas la publier sous ce nom.

## Deux colonnes bien remplies que personne n'utilise

**`Priorité`, remplie à 97 %**, est la seule colonne solide qu'aucune carte ne
lit. Sur les 21 besoins ouverts : 15 P1, 4 P2, 1 P3. Sur les 16 ouverts depuis
plus de 15 jours, 12 sont P1. Sur les 13 au delà de 60 jours, 9 sont P1.
Ajouter « dont 12 P1 » au sous titre de la carte d'alerte ne coûte aucune
saisie. C'est aussi le filtre disponible à mettre à la place du « type de
prestation » de la maquette, qui n'existe dans aucune colonne.

**`Satisfaction de l'entretien`, 16 valeurs sur 59.** La section de la planche
16 s'intitule « qualité de recrutement » et aucune carte ne mesure une qualité.
Trop mince pour une carte, et sa liste est mixte (« Relance Recherche » n'est
pas une satisfaction), mais il faut le dire plutôt que de laisser un titre
promettre une mesure qui n'existe pas.

## Détail à ne pas oublier côté ingestion

Les en têtes du classeur portent des espaces parasites et des coquilles :
`Statut RH ` avec une espace finale, `Date de demarrage  ` avec deux,
`Echéance de la commmande R3` avec trois m, `Budget  de la mission` avec deux
espaces. L'ingestion doit rogner les en têtes et ne pas se fier à
l'orthographe.

Enfin, `Entreprise` est remplie à 100 % mais n'est pas normalisée : `MA` et
`MA - Superviseur TLM` sont la même entité écrite de deux façons. Il faudra un
référentiel avant de grouper, comme pour les motifs de sortie du Dash RH.
