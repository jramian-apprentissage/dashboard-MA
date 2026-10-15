# -*- coding: utf-8 -*-
"""La troisieme feuille : chaque indicateur du dashboard, face au recalcul.

   Le but n'est pas de refaire le dashboard, c'est de pouvoir conclure. Pour
   chaque carte : comment le dashboard la calcule, ce que l'ecran affiche sur
   septembre, ce que l'export donne, l'ecart, et ce qu'on en tire.

   LES REGLES SONT LUES DANS LE CODE, PAS DEVINEES. Elles ne sont pas citees
   dans les cellules, un classeur de travail n'a pas a renvoyer a un chemin de
   fichier source, mais voici d'ou elles viennent :
     - server/src/routes/api.js, COMPTES_PERIOD_SQL : un profil compte si sa
       version SCD2 est ouverte a la FIN du mois et si son statut figure dans
       STATUTS_PROFIL_ACTIF = ['Actif', 'TLM']. Aucune condition de date,
       aucun prorata : le recurrent mensuel entier est projete.
     - server/src/leadsEtats.js : le classement des etats, et la regle qui
       rattache un deal gagne a sa date de demarrage.

   UN INDICATEUR QUE LES DEUX EXPORTS NE PERMETTENT PAS DE REFAIRE est dit tel
   quel, avec sa raison, sur fond gris. Rien n'est estime, rien n'est approche.
"""
from collections import defaultdict


def construire(d, TOUS, C, L, outils):
    """Remplit la feuille. `outils` porte les helpers du script principal."""
    (DEB, FIN, AUJOURD, EURO2, PCT, SABLE, SOLEIL, VERT, cle, categorie,
     milliers, renouvelee, survit, SANS_ACTION, dec) = outils

    # La regle du dashboard, appliquee a l'export
    D = [x for x in TOUS if x['statut'] in ('Actif', 'TLM')]
    ca_d = sum(x['plein'] for x in D)
    ach_d = sum(x['achat_plein'] for x in D)
    cl_d = {x['client'] for x in D}

    # Le recalcul, celui des deux premieres feuilles
    ca_r = sum(x['ca'] for x in C)
    ach_r = sum(x['achat'] for x in C)
    plein_r = sum(x['plein'] for x in C)
    cl_r = {x['client'] for x in C}

    coh = [x for x in L if x['rdv_periode']]
    gag = [x for x in coh if categorie(x['etat']) == 'Gagne']
    per = [x for x in coh if categorie(x['etat']) == 'Perdu']
    act = [x for x in coh if categorie(x['etat']) == 'En cours']
    gag_d = [x for x in L if categorie(x['etat']) == 'Gagne' and x['gagne_periode']]
    denom_d = len(gag_d) + len(per) + len(act)
    pipe = sum(x['vente'] for x in act)
    pond = sum(x['vente'] * x['proba'] / 100 for x in act if x['proba'] >= 30)

    arrivees = [x for x in C if x['debut'] and x['debut'] >= DEB]
    mi_mois = [x for x in arrivees if x['debut'] > DEB]
    toutes_fins = [x for x in C if x['fin'] and DEB <= x['fin'] <= FIN]
    renouv = [x for x in toutes_fins if renouvelee(x, TOUS)]
    vrais = [x for x in toutes_fins if not renouvelee(x, TOUS)]
    perdus = sorted({x['client'] for x in vrais if not survit(x['client'], TOUS)})
    ca_perdu = sum(x['plein'] for x in vrais if x['client'] in perdus)
    sans_action = [x for x in act if cle(x['etat']) in SANS_ACTION]
    sans_montant = [x for x in act if x['vente'] == 0]
    ages = [(AUJOURD - x['rdv']).days for x in act if x['rdv']]
    age_moy = round(sum(ages) / len(ages)) if ages else 0
    cadrage = sum(1 for x in act if cle(x['etat']) == 'point de cadrage')
    taux_d = 100 * len(gag_d) / denom_d if denom_d else 0
    taux_r = 100 * len(gag) / len(coh) if coh else 0

    d.bandeau(
        'Septembre 2026, le dashboard face au recalcul',
        "Pour chaque indicateur du dashboard : comment il est calculé, ce que l'écran affiche "
        "sur septembre, ce que donnent les deux exports Monday, et l'écart. Les lignes grises "
        "sont les indicateurs que les exports ne permettent pas de refaire, avec leur raison.")

    def entete():
        d.entete([('Indicateur', 30), ('Comment le dashboard le calcule', 56),
                  ('Dashboard', 13), ('Recalculé', 13), ('Écart', 12),
                  ('Ce qui se passe', 62)])

    def ind(nom, regle, vd, vr, concl, fmt=EURO2, teinte=None):
        ecart = ''
        if isinstance(vd, (int, float)) and isinstance(vr, (int, float)):
            ecart = round(vr - vd, 2)
        d.ligne([nom, regle, vd, vr, ecart, concl], {2: fmt, 3: fmt, 4: fmt}, teinte=teinte)

    def manquant(nom, regle, pourquoi):
        d.ligne([nom, regle, '-', '-', '-', pourquoi], teinte=SABLE)

    # ====================================================== onglet Synthese ==
    d.section('Synthèse', 'onglet 1')
    entete()
    ind('CA',
        'Somme des montants de vente des profils actifs au 30 septembre. Pas de prorata : le '
        'récurrent entier est projeté.',
        round(ca_d, 2), round(ca_r, 2),
        "Le dashboard annonce %s € de plus que ce qui sera facturé. L'écart vient des arrivées "
        'et des départs de mi-mois.' % milliers(ca_d - ca_r))
    ind('Marge brute',
        "CA moins les prix d'achat, même périmètre, sans prorata.",
        round(ca_d - ach_d, 2), round(ca_r - ach_r, 2),
        'Même cause. La marge réellement dégagée est inférieure de %s €.'
        % milliers((ca_d - ach_d) - (ca_r - ach_r)))
    ind('Taux de marge brute', 'Marge brute divisée par le CA.',
        (ca_d - ach_d) / ca_d, (ca_r - ach_r) / ca_r,
        'Surévalué de %s points. Le prorata réduit la vente plus fort que l\'achat.'
        % dec(100 * ((ca_d - ach_d) / ca_d - (ca_r - ach_r) / ca_r)), PCT)
    # L'ecart net de 1 cache deux mouvements en sens inverse : le dire.
    ind('Clients actifs',
        'Sociétés distinctes portant au moins un profil actif au 30 septembre.',
        len(cl_d), len(cl_r),
        "L'écart de %d cache deux mouvements. Le dashboard garde %s, au statut actif mais sans "
        'un jour travaillé en septembre. Le recalcul garde %s, passé en arrêt le 19 mais '
        'facturé 14 jours sur 22.'
        % (len(cl_d) - len(cl_r), ' et '.join(sorted(cl_d - cl_r)) or '-',
           ' et '.join(sorted(cl_r - cl_d)) or '-'), None)
    ind('Deals gagnés',
        "Affaires signées, rattachées au mois de leur date de démarrage souhaitée et non à "
        'celle du rendez-vous.',
        len(gag_d), len(gag),
        'Deux lectures différentes, pas une erreur de calcul. Mais la date de démarrage est peu '
        'fiable : sur 2 des 3 signés de septembre, elle précède le rendez-vous de plus de six '
        'mois.', None, SOLEIL)
    ind('Pipeline pondéré',
        'Montant multiplié par la probabilité, sur les affaires en cours à 30 % et plus.',
        round(pond, 2), round(pond, 2),
        'Le calcul se refait à l\'identique. Mais il ne mesure qu\'une seule affaire, PROPULSA : '
        '%d des %d affaires ouvertes n\'ont aucun montant saisi.'
        % (len(sans_montant), len(act)))
    agg_d = defaultdict(float)
    for x in D:
        agg_d[x['client']] += x['plein']
    agg_r = defaultdict(float)
    for x in C:
        agg_r[x['client']] += x['ca']
    t5d = sum(sorted(agg_d.values(), reverse=True)[:5])
    t5r = sum(sorted(agg_r.values(), reverse=True)[:5])
    ind('Concentration, les 5 premiers',
        'CA des cinq premiers clients divisé par le CA total.',
        t5d / ca_d, t5r / ca_r,
        'Les deux lectures disent la même chose : près de la moitié du mois repose sur cinq '
        'clients. La dépendance est réelle, elle ne vient pas du mode de calcul.', PCT)
    manquant('Évolution sur 6 mois',
             'Six mois de CA, de marge et de taux, lus mois par mois.',
             "Un export Monday ne porte que l'état du jour. Il faudrait un export par mois.")
    manquant('Santé client',
             'Répartition des clients en sain, vigilance et risque, sur la note de '
             'satisfaction.',
             "La note de satisfaction n'est pas dans cet export.")
    d.saut()

    # ================================================== onglet Focus client ==
    d.section('Focus client', 'onglet 2')
    entete()
    manquant('Nouveaux clients',
             "Clients sans aucune facturation les mois précédents, sur tout l'historique.",
             'La comparaison porte sur tous les mois antérieurs, impossible avec un seul '
             "export. La feuille Comptes applique une règle de substitution, qu'elle indique : "
             'aucun profil du client ne démarre avant le 1er septembre, soit 5 clients.')
    ind('Missions perdues',
        'Profils dont la date de fin tombe dans le mois. Le renouvellement mensuel d\'une '
        'campagne TLM compte comme une fin de mission.',
        len(toutes_fins), len(vrais),
        'Le dashboard compte %d mission de trop : la campagne TLM de YOOOWIN, arrivée à '
        'échéance le 30 septembre et renouvelée dès le 1er octobre.' % len(renouv), None, SOLEIL)
    ind('Clients perdus',
        'Clients dont la dernière mission se termine dans le mois.',
        len(perdus) + len(renouv), len(perdus),
        'Un seul vrai départ, %s, pour %s € de récurrent. Le support de septembre en annonce '
        'deux pour 2 280 € : le second est le renouvellement YOOOWIN.'
        % (', '.join(perdus) or '-', milliers(ca_perdu)), None, SOLEIL)
    ind('Portefeuille de clients actifs',
        'Sociétés distinctes portant un profil actif sur la période.',
        len(cl_d), len(cl_r), 'Même écart que les clients actifs de la synthèse.', None)
    ind('Marge brute nouveaux clients',
        'Marge des profils arrivés dans le mois, sans prorata.',
        round(sum(x['plein'] - x['achat_plein'] for x in arrivees), 2),
        round(sum(x['ca'] - x['achat'] for x in arrivees), 2),
        'Les %d arrivées du mois rapportent moins que leur récurrent, puisque %d sont arrivées '
        'après le 1er.' % (len(arrivees), len(mi_mois)))
    manquant('Revenus perdus sur 6 mois',
             'Récurrent perdu mois par mois.', 'Demande un historique mensuel.')
    d.saut()

    # ============================================== onglet Focus commercial ==
    d.section('Focus commercial', 'onglet 3')
    entete()
    ind('Pipeline total',
        'Somme des montants des affaires en cours dont le rendez-vous tombe dans le mois.',
        round(pipe, 2), round(pipe, 2),
        'Juste, et presque vide : un seul montant saisi sur %d affaires ouvertes.' % len(act))
    ind('Win rate',
        'Signés divisés par signés plus arrêtés plus en cours. Les affaires en stand-by sont '
        'hors dénominateur.',
        len(gag_d) / denom_d if denom_d else 0, len(gag) / len(coh) if coh else 0,
        'Le dashboard affiche %s %%, le recalcul %s %%. Tout l\'écart tient à la date '
        'retenue pour un signé. Les deux sont provisoires : %d affaires sur %d ne sont ni '
        'signées ni arrêtées.' % (dec(taux_d), dec(taux_r), len(act), len(coh)), PCT, SOLEIL)
    ind('Affaires en cours',
        'Nombre d\'affaires ouvertes sur la période, réparties par étape.',
        len(act), len(act),
        'Le goulot est net : %d des %d affaires ouvertes sont au point de cadrage.'
        % (cadrage, len(act)), None)
    ind('Âge moyen',
        'Moyenne des jours écoulés depuis le rendez-vous, sur les affaires en cours.',
        age_moy, age_moy,
        "%d jours de moyenne, la plus ancienne à %d jours. Rien n'a encore pourri, mais tout "
        'septembre est à relancer.' % (age_moy, max(ages) if ages else 0), None)
    manquant('Durée de cycle',
             'Jours entre le rendez-vous et le démarrage, sur les affaires signées.',
             'Sur 2 des 3 signés, la date de démarrage précède le rendez-vous, de 190 et de '
             '286 jours. La durée calculée serait négative. La colonne est à nettoyer avant de '
             'publier cet indicateur.')
    manquant("CA par secteur d'activité",
             'Répartition du CA par secteur.',
             "L'export ne porte aucune colonne de secteur. La colonne Typologie, qui pourrait "
             'en tenir lieu, est vide sur 454 lignes et contient en réalité des motifs de '
             'refus.')
    ind('Affaires sans prochaine action',
        "Affaires en cours dont l'état ne porte aucune étape planifiée.",
        len(sans_action), len(sans_action),
        'Inexploitable ce mois-ci : les %d affaires ouvertes y tombent toutes, parce que les '
        'cinq états présents en septembre figurent dans la liste. La carte ne distingue rien.'
        % len(act), None, SABLE)
    d.saut()

    # ============================================================ la lecture ==
    d.section("Ce qu'on en retient")
    d.carte('Cinq constats, chacun adossé à un indicateur ci-dessus')
    d.entete([('Constat', 38), ("Sur quoi il s'appuie", 74), ('Ce que ça implique', 74)])
    d.ligne(['Le mois a produit plus que la facture',
             'CA mois plein %s € contre %s € facturables, soit %s € de prorata sur %d arrivées '
             'postérieures au 1er.'
             % (milliers(plein_r), milliers(ca_r), milliers(plein_r - ca_r), len(mi_mois)),
             'Octobre part avec ces %s € déjà acquis, à condition que les %d arrivées tiennent.'
             % (milliers(plein_r - ca_r), len(mi_mois))])
    d.ligne(['Le dashboard surévalue le mois',
             'Il affiche %s € de CA et %s %% de marge, contre %s € et %s %% recalculés.'
             % (milliers(ca_d), dec(100 * (ca_d - ach_d) / ca_d), milliers(ca_r),
                dec(100 * (ca_r - ach_r) / ca_r)),
             'Ne jamais rapprocher un chiffre du dashboard et un chiffre de la compta sans dire '
             'lequel des deux on cite.'])
    d.ligne(['Un seul client a vraiment été perdu',
             '%s, %s € de récurrent. YOOOWIN est un renouvellement de campagne TLM, pas un '
             'départ.' % (', '.join(perdus) or '-', milliers(ca_perdu)),
             'Le dashboard, et le support de septembre, comptent YOOOWIN comme une perte. À '
             'corriger avant de présenter un chiffre de pertes.'])
    d.ligne(["Le pipeline n'est pas vide, il n'est pas rempli",
             "%d des %d affaires ouvertes n'ont aucun montant. Le pondéré de %s € ne mesure "
             "qu'une affaire." % (len(sans_montant), len(act), milliers(pond)),
             'Tant que le montant reste vide, tout indicateur de pipeline en euros est '
             "illisible. C'est une consigne de saisie, pas un développement."])
    d.ligne(['Le mois entier est encore à jouer',
             '%d des %d clients rencontrés sont encore ouverts, dont %d au seul point de '
             'cadrage, avec %d jours de moyenne depuis le rendez-vous.'
             % (len(act), len(coh), cadrage, age_moy),
             "Le taux de signature de %s %% n'est pas un résultat, c'est un état "
             "d'avancement. Il ne peut que monter, et c'est au cadrage qu'il se gagnera."
             % dec(taux_r)])
    d.ws.freeze_panes = 'A4'
    return dict(ca_d=ca_d, marge_d=ca_d - ach_d, clients_d=len(cl_d),
                fins_d=len(toutes_fins), gagnes_d=len(gag_d),
                win_d=len(gag_d) / denom_d if denom_d else 0)
