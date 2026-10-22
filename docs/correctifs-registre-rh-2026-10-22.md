# Registre des collaborateurs : les 11 corrections à faire

Relevé du 22/10/2026 sur `#04 RH - LISTE DES COLLABORATEURS MA`, version
reçue le 22/10. Le registre est passé de 22 à 11 anomalies depuis la version
du 20/10. Voici ce qui reste, par ordre d'urgence.

Les numéros de ligne sont ceux du classeur, pour que la correction se fasse
directement dans la feuille.

## Urgent : 3 dates de fin antérieures au début

Une mission qui se termine avant d'avoir commencé fausse l'ancienneté et le
calcul du turnover. Ces trois lignes sont écartées de tout calcul de durée.

- **Suivi Sorties L168, RANAIVOJAONA Njara, entité MA.** Début 13/11/2025,
  fin 25/03/2025. **Nouvelle anomalie introduite par la mise à jour du 22/10 :
  la date de fin était vide, elle vient d'être renseignée, et la valeur
  saisie précède le début de huit mois.** C'est probablement 25/03/2026 qui
  était visé, mais seule l'équipe peut le confirmer.
- **Suivi Sorties L9, RAKOTOARIMALALA Brenda Idéale, entité POSITIV.** Début
  16/02/2026, fin 03/01/2025. Écart de plus d'un an, déjà signalé le 20/10.
- **Suivi Sorties L254, BRU183 BRUNIA Anthonita, entité CEP.** Début
  27/08/2026, fin 18/08/2026. Neuf jours d'écart, déjà signalé le 20/10.

## 3 sorties sans date de fin

La personne est déclarée sortie mais rien ne dit quand. Son départ n'est
compté dans aucun mois, et elle reste dans l'effectif.

- **Suivi Sorties L157, RATSIMBAZAFY Andriamijoro Jacquis Paul, entité CEP.**
  Début 07/10/2025.
- **Suivi Sorties L163, RAKOTOZAFY Hasinirina Lovaniaina Xavia, entité CEP.**
  Début 03/11/2025.
- **Suivi Sorties L192, RAKOTOBE Andry, entité MA.** Début 16/02/2026.

## 1 date de début remplacée par un tiret

- **Suivi Sorties L210, RASOLOFOMANANA Hanitra Harena, entité JS SERVICE.**
  La date de fin vient d'être renseignée au 30/07/2024, mais la date de début
  porte un tiret. Sans début, aucune durée de mission ne se calcule.

## 4 lignes sans aucune date, en bas de Suivi Entrées

Ces quatre lignes se trouvent après la zone de saisie habituelle, vers la
ligne 950. Elles portent un identifiant et un nom, mais ni entité, ni date
d'entrée, ni mission. Il faut soit les compléter, soit les supprimer.

- **L952, RAD117, RABEARISOA Radonirina.** Attention : cette personne a déjà
  une ligne complète en L109, entrée le 19/10 chez MA. Celle du bas est
  probablement un doublon à supprimer.
- **L953, SAR115, RAKOTONIRINA Anjara Sarobidy.**
- **L954, MIR181, Tsimandefitra Ony Mireille.** Elle a une seconde ligne dans
  Données Talents, inactive, entrée le 24/08, et une active au 20/10 : c'est
  un retour, pas un doublon.
- **L955, TIA182, RAMIARINTSOA Tiavina.** Même cas que MIR181.

## 5 personnes comptées deux fois, par variante d'orthographe

Le dashboard rapproche les lignes par nom et prénom, faute d'identifiant sur
les trois quarts des sorties. Quand le prénom est écrit de deux façons, la
même personne devient deux personnes : son ancienneté repart de zéro, son
retour en mission se lit comme une arrivée, et si les deux écritures sont en
poste en même temps elle compte double dans l'effectif.

Les cinq cas, à harmoniser dans le registre :

- **NAR044, RAKOTOARISON.** « Narindrasoa » et « Narindra ». **Le cas le plus
  grave : les deux écritures sont en poste aujourd'hui**, l'une chez CCE
  depuis le 20/07, l'autre chez INOVIA depuis le 07/09. Soit c'est une seule
  personne sur deux missions et l'effectif la compte deux fois, soit ce sont
  deux personnes et il leur faut deux identifiants.
- **SAR115, RAKOTONIRINA.** « Anjara » et « Anjara Sarobidy ». **Scission
  introduite par la mise à jour du 22/10** : le prénom a été allongé dans
  Suivi Entrées mais pas sur la ligne du 14/10, restée en « Anjara ».
- **ANJ103, HAJARIVONY.** « Anjara » sortie le 23/04, « Anjara Tsihoarana »
  en poste depuis le 09/09. Son retour en mission se lit comme l'arrivée
  d'une inconnue.
- **AVO106, SEDIHAINGOMAMY.** « Avotraina Fiombonantsoa » sortie le 04/04 et
  « Avotraina Fiomonanstoa » en poste depuis le 30/04. La seconde écriture
  est une faute de frappe.
- **DIAM075, Andrianavalisoa.** « Diamanticah Aina Mamin'ny fo » et
  « Diamanticah Aina ». Les deux missions sont closes, donc l'effectif n'est
  pas touché, mais l'ancienneté l'est.

## Deux points à régler hors anomalies

**Les identifiants manquent sur 190 sorties.** La colonne `ID - MA` n'est
renseignée que sur 65 des 255 lignes de Suivi Sorties, soit 25 %, et ce taux
n'a pas bougé depuis le 20/10. Tant qu'il reste à ce niveau, les personnes se
rapprochent par nom et prénom, ce qui échoue dès qu'une orthographe varie.

**Quatre identifiants sont portés par deux lignes dans Données Talents.**
Deux sont des retours en mission et c'est légitime (MIR181 et TIA182, sorties
le 24/08 puis revenues le 20/10). Les deux autres sont des doublons
d'écriture à fusionner :

- **DIAM075**, Andrianavalisoa Diamanticah Aina, écrit une fois avec un
  suffixe et une fois sans, avec deux dates d'entrée différentes.
- **JEA130**, RAHERINIAINA Jean Aimé, deux fois à la même date d'entrée, une
  fois en capitales et une fois en minuscules.
