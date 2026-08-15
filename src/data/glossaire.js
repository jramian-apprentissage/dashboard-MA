/* Définitions de référence des KPI affichés dans les dashboards.
 *
 * Ce fichier doit décrire ce que les cartes calculent RÉELLEMENT, pas ce
 * qu'elles étaient censées calculer. Il avait dérivé : le CA y était décrit
 * comme « la somme des ventes signées » alors qu'il additionne des montants
 * facturés, le score de santé mentionnait des « retards de paiement » qui
 * n'entrent dans aucun calcul, et le cycle commercial partait de la création
 * de l'opportunité alors qu'il part de la Date RDV. Relu de bout en bout et
 * réaligné sur le code le 2026-08-13.
 *
 * `source` indique d'où vient le chiffre. C'est volontairement affiché : la
 * question posée en réunion n'est jamais « comment c'est calculé » mais
 * « ça sort d'où ». Trois valeurs possibles — Monday CRM (extraction chaque
 * soir à 21 h), les archives d'appels Ringover / CloudTalk, et le fichier
 * RDV.
 *
 * Le compte d'exploitation n'y figure pas, bien qu'il ait servi à
 * reconstituer l'historique : c'est un travail interne de reprise, pas une
 * source que les utilisateurs consultent. Pour eux, la donnée vient de
 * Monday (décision de Jimmy, 2026-08-13).
 */
export const glossaireData = [

  /* ── Revenus et marge ─────────────────────────────────────────────── */
  {
    terme: 'CA',
    definition: "Somme des montants réellement facturés sur la période. L'historique est stocké en intervalles mensuels : chaque mois dont le début tombe dans la période sélectionnée compte pour un mois facturé. Ce sont les montants effectivement facturés, après prorata des entrées et sorties en cours de mois.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Marge brute',
    definition: "Prix de vente moins prix d'achat, sur les mêmes montants réels que le CA. Le prix d'achat correspond à la rémunération du collaborateur placé. C'est l'indicateur central de rentabilité.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Taux de marge brute',
    definition: 'Marge brute rapportée au CA, en pourcentage.',
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'CA par client / Marge brute par client',
    definition: "Ventilation du CA et de la marge sur la période, client par client. Les parts sont calculées sur le total de la période, ce qui permet de les additionner jusqu'à 100 %.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Concentration du CA',
    definition: "Part du CA réalisée par les plus gros clients. Mesure le risque de dépendance : plus la concentration est forte, plus la perte d'un seul compte pèse.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Répartition du revenu par type de mission',
    definition: "CA ventilé par poste occupé par les collaborateurs placés. Le total correspond au CA de la période — chaque mois d'un intervalle est compté une fois.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: "CA par secteur d'activité",
    definition: "CA ventilé selon le secteur d'activité renseigné sur la fiche client. Instantané des comptes actuels : le secteur n'est pas historisé, la ventilation ne suit donc pas la période sélectionnée.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },

  /* ── Portefeuille client ──────────────────────────────────────────── */
  {
    terme: 'Portefeuille de clients actifs',
    definition: "Clients ayant généré du CA sur la période sélectionnée. Différent du nombre total de comptes existants, qui inclut les comptes non facturés sur la période.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Nouveaux clients',
    definition: "Comptes dont la date de démarrage tombe dans la période. C'est le démarrage effectif de la mission qui fait foi, pas la date de signature ni la création de la fiche.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Missions perdues',
    definition: "Profils dont la date de fin tombe dans la période. C'est la mission qui est comptée, pas le client : un contrat qui porte cinq profils dont un s'arrête ne perd pas un client, mais perd bien du revenu. Le critère est la date de fin et elle seule, jamais le statut — celui-ci est souvent laissé en « préavis » longtemps après l'arrêt réel. Sur les cartes de perte, les couleurs de comparaison sont inversées : une baisse s'affiche en vert, puisqu'une baisse des pertes est une bonne nouvelle.",
    source: 'Historique Excel',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Revenus perdus',
    definition: "CA mensuel que représentaient les missions arrêtées sur le mois. C'est un revenu récurrent qui disparaît, pas une perte ponctuelle.",
    source: 'Historique Excel',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Niveau de santé client',
    definition: "Traduction de la note de satisfaction (0–100) produite par l'IA de Monday, qui lit les échanges avec le client. Trois niveaux : sain à partir de 65, sous vigilance entre 35 et 64, risque de départ en dessous de 35. Le niveau est déduit de la note au moment de l'affichage — il ne peut donc plus la contredire, ce qui arrivait auparavant.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },

  /* ── Acquisition : deals et pipeline ──────────────────────────────── */
  {
    terme: 'Date RDV',
    definition: "Date de référence de tout le suivi acquisition. Un lead entre dans une période par sa Date RDV, et c'est sur elle que se calculent le pipeline, le funnel et l'âge des opportunités. Seule exception : les deals gagnés, rattachés à leur date de démarrage.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Deals gagnés',
    definition: "Affaires signées, rattachées à leur DATE DE DÉMARRAGE — c'est le démarrage qui matérialise la signature. Un compte résilié, suspendu ou arrivé au terme de son contrat reste un deal gagné : il est forcément passé par une signature. La perte du client est suivie séparément, côté portefeuille.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Deals perdus',
    definition: "Affaires perdues EN ACQUISITION uniquement, c'est-à-dire jamais signées : arrêt du suivi ou stop contact. Une résiliation ou une fin de contrat n'entre pas ici — elle concerne un client déjà signé, donc un deal gagné.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Deals stand-by',
    definition: "Affaires en attente d'une décision externe (client, budget, timing), sans être ni gagnées ni abandonnées.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Win rate',
    definition: 'Deals gagnés divisés par le total des deals gagnés, perdus et en cours. Mesure la part des affaires du portefeuille acquisition qui aboutissent.',
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Pipeline total',
    definition: "Somme des montants d'achat des opportunités en cours dont la Date RDV tombe dans la période. Ne porte que sur l'acquisition.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Pipeline pondéré',
    definition: "Part du pipeline dont la probabilité de signature atteint au moins 30 %. Donne une vision prévisionnelle plus réaliste que le pipeline total.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Funnel par étape commerciale',
    definition: "Répartition des opportunités ouvertes selon leur étape dans le processus, triée par volume décroissant. Reflète l'état actuel de chaque lead, sans historique des transitions.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Âge moyen des opportunités',
    definition: 'Nombre de jours écoulés depuis la Date RDV, en moyenne, sur les opportunités encore ouvertes. Un âge élevé signale des affaires qui stagnent.',
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Durée du cycle commercial',
    definition: "Temps moyen entre la Date RDV et la date de démarrage, mesuré sur les affaires signées. C'est le délai réel entre le premier rendez-vous et le début de la mission.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Opportunités sans prochaine action',
    definition: "Affaires ouvertes sans date de relance planifiée, ou dont la relance est déjà passée. Ce sont les dossiers qui dorment.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },
  {
    terme: 'Motifs des deals perdus / stand-by',
    definition: "Raisons renseignées lors du passage d'une affaire en perdu ou en attente. Permet d'identifier les objections récurrentes.",
    source: 'Monday CRM',
    dashboards: ['commercial-rc'],
  },

  /* ── Activité téléphonique : Sales ────────────────────────────────── */
  {
    terme: 'Appels émis',
    definition: "Nombre total d'appels sortants passés sur la période, quel qu'en soit le résultat.",
    source: 'Ringover (Sales) / CloudTalk (TLM)',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Taux de décroché',
    definition: "Part des appels auxquels un interlocuteur a répondu, d'après le statut Ringover et non d'après une durée. La durée totale d'un appel inclut la sonnerie : 3 670 appels annulés et 1 558 manqués dépassent la seconde sans que personne n'ait décroché, et l'ancien seuil de 30 secondes en comptait 1 617 à tort, messageries vocales comprises.",
    source: 'Ringover',
    dashboards: ['commercial-activite'],
  },
  {
    terme: "Taux d'échanges > 30 s",
    definition: "Part des appels décrochés dont la conversation a dépassé 30 secondes. Mesurée sur la durée de communication seule — hors sonnerie, attente et post-appel, qui surestimaient le compte de 27 %.",
    source: 'Ringover',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Appels argumentés',
    definition: "Appels au cours desquels le prospect a écouté le pitch, qu'il soit intéressé ou non.",
    source: 'Ringover',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Taux de fiches exploitables',
    definition: "Part des appels ayant produit une information utilisable par l'équipe Sales.",
    source: 'Ringover',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'RDV pris',
    definition: 'Rendez-vous commerciaux planifiés à la suite de la prospection téléphonique.',
    source: 'Fichier RDV (Google Sheet)',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Taux de RDV honorés',
    definition: "Rendez-vous effectivement tenus rapportés aux rendez-vous pris. Mesure la qualité des rendez-vous générés, au-delà de leur volume.",
    source: 'Fichier RDV (Google Sheet)',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Répartition par qualification',
    definition: "Ventilation des appels selon la qualification saisie par le collaborateur à la fin de l'appel.",
    source: 'Ringover',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Motifs de refus',
    definition: "Principaux freins rencontrés en prospection, tels que qualifiés à l'issue de l'appel. Plusieurs motifs sont possibles pour un même appel.",
    source: 'Ringover / CloudTalk',
    dashboards: ['commercial-activite'],
  },

  /* ── Activité téléphonique : TLM ──────────────────────────────────── */
  {
    terme: 'Appels exploitables',
    definition: "Appels ayant permis de collecter une information business utile : besoin, décisionnaire ou échéance.",
    source: 'CloudTalk',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Appels non exploitables',
    definition: "Appels sans information collectée : mauvais numéro, interlocuteur injoignable, refus immédiat.",
    source: 'CloudTalk',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Fiches complétées',
    definition: "Fiches prospect renseignées avec un besoin ou un intérêt identifié.",
    source: 'CloudTalk',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Taux de transformation nette',
    definition: "Rendez-vous pris rapportés aux appels émis, hors data non exploitable. Le dénominateur écarte les fiches qu'aucun agent ne pouvait exploiter, pour ne pas pénaliser la prospection avec des contacts inutilisables.",
    source: 'CloudTalk',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Leads à recycler',
    definition: "Leads n'ayant pas abouti mais pouvant être recontactés après un délai, généralement 30 jours.",
    source: 'CloudTalk',
    dashboards: ['commercial-activite'],
  },
  {
    terme: 'Leads restants à contacter',
    definition: "Volume de leads encore non traités dans le stock confié à l'équipe TLM.",
    source: 'CloudTalk',
    dashboards: ['commercial-activite'],
  },

  /* ── Lecture des dashboards ───────────────────────────────────────── */
  {
    terme: 'Période de référence',
    definition: "Tout ce qui est affiché dépend de la période choisie en haut de page : chiffres, graphiques et tableaux se recalculent ensemble. Par défaut, le mois précédent.",
    source: '—',
    dashboards: ['commercial-rc', 'commercial-activite'],
  },
  {
    terme: 'Comparaison',
    definition: "Lorsque « Comparer » est actif, chaque indicateur affiche son évolution face à la période précédente ou à l'année précédente. Sur les indicateurs de perte, les couleurs sont inversées : le vert signale une baisse.",
    source: '—',
    dashboards: ['commercial-rc', 'commercial-activite'],
  },
  {
    terme: 'Mise à jour arrêtée au…',
    definition: "Les données sont extraites une fois par jour, à 21 h. La date affichée en haut de chaque page indique jusqu'à quand les données sont à jour — ce n'est jamais du temps réel.",
    source: '—',
    dashboards: ['commercial-rc', 'commercial-activite'],
  },
];
