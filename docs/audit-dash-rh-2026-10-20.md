# Audit du Dash RH — 20 octobre 2026

Vérification de A à Z des chiffres affichés par les trois pages du Suivi des
effectifs, et inventaire de ce qui manque pour qu'ils soient fiables à 100 %.

## Comment cet audit a été fait

Dix dimensions ont été mesurées en parallèle, chacune par un agent qui a
**reconstitué les chiffres depuis la table brute sans recopier les requêtes en
service** : recopier la requête n'aurait rien vérifié. Chaque mesure a ensuite
été soumise à une contre-épreuve chargée de la mettre en défaut.

147 constats produits, **30 réfutés** par la contre-épreuve, 117 retenus :
24 bloquants, 38 écarts, 38 manques, 17 conformités.

Les trois constats les plus lourds ont été revérifiés à la main avant d'être
écrits ici. Deux d'entre eux ont été corrigés à la hausse par cette
revérification, parce que des agents travaillant sur des dimensions séparées ne
pouvaient pas voir que leurs défauts se cumulent.

Tout a été mesuré contre l'API **de production**, celle qui alimente l'écran,
et non contre une version locale.

## 1. Les chiffres faux aujourd'hui, et de combien

### L'effectif est surévalué de 2 personnes

L'écran affiche **96** au 19/10. Le vrai chiffre est **94**. Deux défauts
indépendants ajoutent chacun une personne, et aucun agent ne pouvait voir le
cumul depuis sa seule dimension.

| Règle appliquée | Effectif au 19/10 |
|---|---|
| Règle actuelle, affichée | 96 |
| En reconnaissant NAR044 comme une seule personne | 95 |
| En honorant la sortie de RAHARISOA | 95 |
| **Les deux corrections** | **94** |

**NAR044.** `RAKOTOARISON Narindra` et `RAKOTOARISON Narindrasoa` portent le
même identifiant MA. C'est une seule personne, saisie avec deux orthographes du
prénom, et ses deux lignes actives sont comptées deux fois.

**RAHARISOA Anjaratiana Gabriella.** Sa mission MA est déclarée close dans
Suivi Sorties (ligne 21, état Inactif, motif Arrêt client), mais cette ligne n'a
pas de date de fin, donc elle est écartée comme anomalie. Or le dédoublonnage ne
ferme une ligne d'entrée que sur une sortie **saine** : la copie côté Entrées
survit, et la personne reste active indéfiniment. Le biais court depuis février
2026.

### Le garde-fou qui dit que tout va bien ne peut pas échouer

`/api/rh/controle` répond `conforme: true` sur tous les mois. C'est une
**identité algébrique**, pas une vérification.

Les trois nombres sortent du même ensemble `w` : `sorties = |w| − effectif`, et
`effectif(M−1)` vaut exactement `count(a_la_veille) = |w| − entrées`. Donc
`effectif(M−1) + entrées − sorties = effectif(M)` est vrai **quelles que soient
les données**. Un agent l'a confirmé empiriquement en corrompant volontairement
le jeu de données avec trois fautes graves : l'écart est resté nul sur 23 mois
sur 23.

L'en-tête de la route s'intitule « LA ROUTE QUI DIT SI LA RÈGLE TIENT DEBOUT ».
Elle ne le dit pas.

### La réintégration est le chiffre le plus faux de l'écran

| | Affiché | Réel |
|---|---|---|
| Taux de réintégration 2026 | 6,8 % | 10,3 % |
| Reprises comptées | 4 | 6 |
| Délai moyen | 49 j | 63 j |

Cet indicateur consiste précisément à reconnaître la même personne avant et
après son départ : c'est ce qu'une variante d'orthographe détruit.
`RAOBELINA Cynthia Lovaniaina` quitte Open Formation le 31/03/2026 et revient
chez MA le 14/09/2026 sous « Cynthia » : 167 jours, totalement invisible.

### Treize fins de mission de 2026 sont invisibles, et le mix des motifs est biaisé

| | Affiché | Réel |
|---|---|---|
| Fins de mission 2026 | 86 | 99 |
| dont arrêt client | 45 (52,3 %) | 56 (56,6 %) |

Quatorze lignes de Suivi Sorties portent un motif, un état Inactif et une date
de début en 2026, et sont écartées de tout parce qu'il leur manque la date de
fin. Le biais est **systématique** : 74 % d'arrêt client parmi les lignes
écartées contre 57 % à l'écran.

### La cohorte annuelle compte comme sortis des gens en poste

| Cohorte | Affiché | Réel |
|---|---|---|
| 2024 | 50 / 16 encore actifs / 34 sortis | 50 / 19 / **31** |
| 2025 | 119 / 18 / 101 | 119 / 20 / **99** |

Le drapeau « encore là » est posé sur les seules lignes de la fenêtre, laquelle
exige `date_debut <= 31/12` de l'année de cohorte. Une mission démarrée après
cette date ne peut donc pas prouver que la personne est encore là, même si elle
l'est. Cinq personnes tombent exactement dans ce cas. C'est une correction de
requête, rien ne manque dans la source.

### L'ancienneté de la page 1 part de la mauvaise mission

Elle compte depuis la première mission **encore active**, pas depuis la première
mission de la personne. C'est le piège que la page 2 documente et évite.

| Département | Affiché au 30/09 | Depuis la vraie première mission |
|---|---|---|
| Commercial | 11,7 | 12,7 |
| Administratif | 20,5 | 20,9 |
| Service digital | 5,1 | 7,7 |
| Tech | 6,0 | 7,9 |

Conséquence visible : la barre Tech affiche une durée moyenne de mission
(6,3 mois) **supérieure** à l'ancienneté moyenne (6,0). C'est arithmétiquement
impossible sur une même population, et c'est le symptôme de ce décalage.

### La page 3 est vide sur la période où elle s'ouvre

L'application démarre sur le mois précédent, et le sélecteur n'offre aucune
période « année ». Sur septembre 2026, la page affiche :

- turnover **5,3 %** au lieu des 90 % de l'année
- réintégration **0 %** (0 sur 5)
- délai de replacement **vide**

Les chiffres commentés dans le code et dans nos échanges ne s'obtiennent qu'en
passant par « Personnaliser ».

### Le turnover par département n'est pas déterministe

L'effectif moyen par famille se lit avec un `array_agg` sans second critère de
tri. Deux personnes ont plusieurs missions valides commençant le même jour dans
des familles différentes : selon l'ordre rendu par la base, le classement
Administratif / Commercial de 2024 **s'inverse**. C'est un défaut de code, rien
à décider côté métier.

## 2. Les six causes racines

1. **Il n'existe aucune clé de personne fiable.** Le nom normalisé éclate une
   même personne en variantes d'orthographe : 13 personnes en trop sur 274, soit
   4,7 %. L'identifiant MA ne couvre que 46 % des lignes saines, donc il ne peut
   pas prendre le relais aujourd'hui.
2. **Quarante-trois lignes sont écartées et personne ne le voit.** 26 personnes
   sur 300 n'apparaissent nulle part. Aucun écran ne le mentionne.
3. **Le garde-fou est une tautologie.** Il donne une assurance qu'il ne peut pas
   fournir.
4. **Quelques défauts de requête ponctuels**, tous corrigeables sans toucher à
   la source : l'ancienneté de la page 1, la cohorte annuelle, le tri non
   déterministe des départements.
5. **La page 3 n'est pas lisible sur sa période par défaut**, et ses deux
   derniers indicateurs reposent sur quatre cas.
6. **Il n'existe aucun historique.** La table est remplacée en entier à chaque
   ingestion, qui est manuelle. Un mois passé n'est jamais stocké, il se
   reconstitue depuis l'état courant du classeur. Les valeurs de contrôle
   écrites dans le dépôt ne se reproduisent d'ailleurs **déjà plus** : l'en-tête
   annonce 74 placés et 23 internes au 30/09, l'API en rend 73 et 22.

## 3. Ce qui manque pour un chiffre fiable à 100 %

### Dans le classeur, par ordre d'effet

1. **Un identifiant de personne sur toutes les lignes des deux feuilles.**
   170 des 318 lignes saines n'en ont aucun. C'est le manque qui débloque tout le
   reste : il rendrait décidables, sans arbitrage humain, les neuf fusions
   probables de noms. **Il existe déjà** : l'onglet « Données Talents » du
   classeur porte l'ID-MA et l'adresse mail, et il n'est pas ingéré.
2. **La date de fin, rendue obligatoire sur Suivi Sorties.** 31 lignes n'en ont
   pas, dont 18 où la cellule porte un tiret tapé à la main et 11 où elle est
   vide. Le tiret est un geste volontaire, le vide est un oubli : les deux se
   corrigent différemment et rien ne les distingue en base.
3. **Une colonne de motif de faute.** Il n'en existe aucune : le « non fautif »
   du taux de réintégration englobe aujourd'hui au moins 8 départs pour faute.
4. **Un référentiel de clients.** Un même client est éclaté sur jusqu'à trois
   écritures, d'où 36 clients affichés là où il y en a 34.
5. **Une date de constat**, ou un statut daté. Rien ne distingue « encore en
   poste » de « départ pas encore saisi », donc les mois récents sont surévalués
   et bougeront.
6. **Une colonne pour le « statut agent »** du filtre de la maquette, qui n'a
   toujours aucune source.

### Des décisions à prendre, qui ne coûtent aucune saisie

1. **Que fait-on des 31 sorties sans date de fin ?** Trois lectures sont
   possibles et donnent trois dashboards différents : les écarter comme
   aujourd'hui, les compter dans les totaux et les motifs sans les faire entrer
   dans les séries datées, ou leur imputer une date en la marquant comme imputée.
   Le choix actuel n'a jamais été fait, il ressemble à un effet de bord d'un
   filtre écrit pour l'effectif.
2. **Au-delà de combien de jours une reprise n'est-elle plus un replacement ?**
   Aucune borne n'existe, donc une réembauche à 609 jours pèse autant qu'un
   replacement à 3 jours, et 2024 et 2025 sont mécaniquement avantagés face à
   2026 qui n'a pas encore eu le temps.
3. **« Stand by » est-il un départ ?** Il est compté comme tel, alors que le mot
   dit une suspension.
4. **Que vaut l'ancienneté quand quelqu'un part puis revient ?** Sept personnes
   ont des trous de présence, comptés aujourd'hui comme du temps travaillé.
5. **Quelle est la définition de « date de sortie » ?** La borne inclusive en
   service est un arbitrage, pas une règle de la source.

### Dans le code

- Un garde-fou qui porte sur autre chose que l'identité : rapprocher le nombre de
  lignes Inactif du nombre de sorties comptées, et compter les lignes écartées.
- Afficher quelque part le nombre de lignes écartées. Aujourd'hui, rien.
- Un instantané mensuel figé à la clôture, pour qu'un chiffre annoncé en séance
  reste reproductible.

## 4. Ce qui est conforme

Dix-sept constats de conformité, dont les principaux :

- La partition placés + internes = total tombe juste à toutes les dates testées.
- Les sorties par département somment exactement à la tuile Sorties.
- Le turnover par département est une vraie décomposition : les sorties somment
  à 75 et les effectifs moyens à 83,3.
- La normalisation des motifs fait son travail : les variantes de casse et les
  fautes de frappe tombent bien au même endroit.
- Les 9 lignes d'entrées écartées ne coûtent rien : ce sont des noms sans aucune
  donnée, et les 6 personnes concernées sont déjà présentes ailleurs.
- La grille de lecture des commentaires ne laisse aucun texte non classé.

## 5. Dans quel ordre je m'y prendrais

**Sans rien attendre de personne**, quatre corrections de code à l'effet
immédiat et mesuré :

1. Honorer une sortie même sans date de fin dans le dédoublonnage (RAHARISOA).
2. Corriger la cohorte annuelle, qui compte cinq personnes en poste comme
   sorties.
3. Corriger l'ancienneté de la page 1, qui part de la mauvaise mission.
4. Ajouter une clé de départage au tri des départements.

**Après une seule saisie**, celle de l'identifiant MA sur les lignes de sorties
qui n'en ont pas, ou l'ingestion de l'onglet « Données Talents » qui le porte
déjà : la bascule de la clé de personne, qui corrige l'effectif, la
réintégration, le turnover et la rétention d'un seul coup.

**Après une décision**, celle sur les 31 dates de fin manquantes : les 13 fins
de mission invisibles de 2026 et le biais du mix des motifs.

**Et dans tous les cas**, remplacer le garde-fou par un contrôle qui puisse
échouer, parce qu'aujourd'hui il annonce que tout va bien sur un dashboard dont
l'effectif est faux de 2.
