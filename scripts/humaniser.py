# -*- coding: utf-8 -*-
"""Remet les textes du classeur en francais normal.

   Les calculs ne bougent pas. Seuls changent les libelles affiches : accents
   remis, notes raccourcies, references au code retirees. Un classeur de
   travail n'a pas a citer un chemin de fichier source ni une date de decision.

   Chaque remplacement est verifie : si un libelle a change entre temps, le
   script s'arrete au lieu d'ecrire un fichier a moitie corrige.
"""
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

P1 = 'scripts/indicateurs-septembre.py'
P2 = 'scripts/feuille_dashboard.py'

# ---------------------------------------------------------------- feuille 1 --
R1 = [
    # Le bandeau : court, et sans le mode d'emploi du prorata.
    ("""        "Recalcule a la main depuis l'export Monday du 9 octobre, sans passer par la base du "
        "dashboard. Le CA est proratise comme le fait la compta : vente x (21 - ABS) / 21, achat "
        "x jours travailles / %d jours ouvres. Le dashboard, lui, projette le recurrent mensuel "
        "entier des qu'un profil est actif a la fin du mois : la colonne « mois plein » donne ce "
        "chiffre-la. L'ecart entre les deux n'est pas une erreur, c'est ce qui se facturera en "
        "octobre." % JO)""",
     """        "Export Monday du 9 octobre. Le CA est proratisé comme en compta, au prorata des jours "
        "réellement travaillés. La colonne « mois plein » donne le récurrent entier, celui "
        "qu'affiche le dashboard. L'écart entre les deux se facturera en octobre.")"""),

    ("f.section('Vue consolidee', 'Monday - board Comptes')",
     "f.section('Vue consolidée', 'Monday')"),
    ("f.section('Sante du portefeuille client')",
     "f.section('Santé du portefeuille client')"),
    ("f.section('Focus client', 'Monday - board Comptes')",
     "f.section('Focus client', 'Monday')"),

    # Les quatre cartes de KPI.
    ("""        ('CA', round(ca, 2), EURO2, 'Clients actifs : %d' % len(clients),
         'Somme de vente x (21 - ABS) / 21 sur les %d profils retenus. Mois plein, sans prorata : '
         '%s EUR.' % (len(C), milliers(plein)), BLEU),""",
     """        ('CA', round(ca, 2), EURO2, 'Clients actifs : %d' % len(clients),
         'Facturable sur le mois, prorata compris. Mois plein : %s €.' % milliers(plein), BLEU),"""),
    ("""        ('Marge brute', round(ca - achat, 2), EURO2,
         'Taux de marge brute : %.1f %%' % (100 * (ca - achat) / ca if ca else 0),
         "Vente proratisee moins achat proratise. L'achat se prorate sur les %d jours ouvres "
         "reels, la vente sur 21 : les deux bases diffèrent, c'est la regle de la compta, "
         "verifiee au centime sur 12 des 13 lignes a contrat unique." % JO, VERT),""",
     """        ('Marge brute', round(ca - achat, 2), EURO2,
         'Taux de marge brute : %.1f %%' % (100 * (ca - achat) / ca if ca else 0),
         'Vente moins achat, les deux proratisés.', VERT),"""),
    ("""        ('Effet du prorata', round(plein - ca, 2), EURO2,
         '%d profils en mois incomplet' % len(partiels),
         "Ce qui a ete produit mais pas facture, faute d'un mois complet. Le dashboard ne voit "
         "pas cet ecart : il affiche le mois plein.", SOLEIL),""",
     """        ('Effet du prorata', round(plein - ca, 2), EURO2,
         '%d profils en mois incomplet' % len(partiels),
         'Produit en septembre, facturé en octobre.', SOLEIL),"""),
    ("""        ('Profils factures', len(C), None, '%d clients' % len(clients),
         "Statut Actif ou TLM, ou bien une date de fin au 1er septembre ou apres, et une mission "
         "qui ne s'est pas terminee avant le mois. Les 7 profils passes en « Arret » pendant "
         "septembre sont donc gardes, proratises jusqu'a leur date de fin.", ROSE),""",
     """        ('Profils facturés', len(C), None, '%d clients' % len(clients),
         'Actifs du mois, départs de septembre compris.', ROSE),"""),

    ("""    f.carte('CA par client  /  Marge brute par client',
            "Les deux cartes du dashboard reunies dans un seul tableau, trie par CA decroissant.")""",
     """    f.carte('CA et marge brute par client',
            'Trié par CA décroissant.')"""),
    ("""    f.carte('Concentration du CA',
            "Le dashboard affiche la part du top 5. Elle mesure ce que le mois perdrait si une "
            "poignee de clients partait.")""",
     """    f.carte('Concentration du CA',
            'Ce que le mois perdrait si les premiers clients partaient.')"""),
    ("""    f.carte('Repartition du revenu par type de mission',
            "Le pole est lu sur le prefixe du champ Poste : SO commercial, AV administratif, "
            "CS customer success, IT informatique, DS digital.")""",
     """    f.carte('Répartition du revenu par type de mission',
            'Pôle lu sur le préfixe du poste.')"""),
    ("""    f.carte('Detail des arrivees du mois',
            "Une arrivee en cours de mois ne se facture pas en entier : la colonne « facture » "
            "montre ce que la compta encaisse, la suivante ce qui attend octobre.")""",
     """    f.carte('Les arrivées du mois',
            "« Facturé » est ce que la compta encaisse, « non facturé » ce qui attend octobre.")"""),
    ("""    f.carte('Detail des missions perdues',
            "Le motif vient de la colonne « Motif arret ». Vide quand personne ne l'a renseigne : "
            "c'est une saisie manquante, pas une absence de motif. La colonne « client perdu » "
            "dit si la societe garde au moins une ligne apres le 30/09.")""",
     """    f.carte('Les fins de mission',
            "« Client perdu » signale les sociétés qui ne gardent aucune mission après le 30/09.")"""),
    ("""    f.carte('Campagnes TLM arrivees a echeance, renouvelees',
            "Une campagne de telemarketing se vend au mois. Au renouvellement, une nouvelle ligne "
            "est creee pour le mois a venir et la precedente se termine le dernier jour du mois "
            "de prestation. Ces lignes ne sont donc PAS des missions perdues.")""",
     """    f.carte('Campagnes TLM renouvelées',
            'Une campagne se vend au mois : la ligne du mois suivant existe déjà. Ce ne sont pas '
            'des pertes.')"""),
    ("""    f.carte('Detail des profils factures',
            "Toutes les lignes retenues. En jaune, les mois incomplets et les prix d'achat "
            "absents, qui surevaluent la marge d'autant.")""",
     """    f.carte('Tous les profils facturés',
            "En jaune, les mois incomplets et les prix d'achat manquants.")"""),
    ("f.carte('Les points a trancher')", "f.carte('À vérifier')"),

    # Les en-tetes de colonnes.
    ("""    f.entete([('Client', 30), ('Profils', 8), ('CA proratise', 14), ('Part du CA', 11),
              ("Prix d'achat", 13), ('Marge brute', 13), ('Taux de marge', 12),
              ('CA mois plein', 14), ('Ecart de prorata', 14)])""",
     """    f.entete([('Client', 30), ('Profils', 8), ('CA facturable', 14), ('Part du CA', 11),
              ("Prix d'achat", 13), ('Marge brute', 13), ('Taux de marge', 12),
              ('CA mois plein', 14), ('Écart', 12)])"""),
    ("""    f.entete([('Tranche', 30), ('Clients', 9), ('CA proratise', 14), ('Part du CA', 11)])""",
     """    f.entete([('Tranche', 30), ('Clients', 9), ('CA facturable', 14), ('Part du CA', 11)])"""),
    ("""    f.entete([('Pole', 24), ('Profils', 9), ('CA proratise', 14), ('Part', 10),
              ('Revenu moyen par profil', 20)])""",
     """    f.entete([('Pôle', 24), ('Profils', 9), ('CA facturable', 14), ('Part', 10),
              ('Revenu moyen par profil', 20)])"""),
    ("""    f.entete([('Client', 26), ('Nouveau client', 13), ('Profil', 18), ('Poste', 24),
              ('Date de debut', 13), ('Jours', 9), ('Mensuel', 12), ('Facture', 12),
              ('Non facture', 12)])""",
     """    f.entete([('Client', 26), ('Nouveau client', 13), ('Profil', 18), ('Poste', 24),
              ('Début', 12), ('Jours', 9), ('Mensuel', 12), ('Facturé', 12),
              ('Non facturé', 12)])"""),
    ("""    f.entete([('Client', 26), ('Client perdu', 12), ('Profil', 18), ('Poste', 24),
              ('Date de fin', 13), ('Jours faits', 11), ('Mensuel', 12), ('Facture', 12),
              ('Recurrent perdu par mois', 20), ('Motif', 34)])""",
     """    f.entete([('Client', 26), ('Client perdu', 12), ('Profil', 18), ('Poste', 24),
              ('Fin', 12), ('Jours faits', 11), ('Mensuel', 12), ('Facturé', 12),
              ('Récurrent perdu', 15), ('Motif', 38)])"""),
    ("""    f.entete([('Client', 26), ('Ligne qui se termine', 20), ('Fin', 12),
              ('Ligne qui reprend', 20), ('Debut', 12), ('Mensuel', 12),
              ('Facture en septembre', 18)])""",
     """    f.entete([('Client', 26), ('Ligne qui se termine', 20), ('Fin', 12),
              ('Ligne qui reprend', 20), ('Début', 12), ('Mensuel', 12),
              ('Facturé en septembre', 18)])"""),
    ("""    f.entete([('Client', 26), ('Profil', 18), ('Statut', 10), ('Poste', 24), ('Contrat', 13),
              ('Debut', 11), ('Fin', 11), ('Jours', 8), ('Mensuel', 12),
              ('CA proratise', 13), ('Achat mensuel', 13), ('Achat proratise', 14)])""",
     """    f.entete([('Client', 26), ('Profil', 18), ('Statut', 10), ('Poste', 24), ('Contrat', 13),
              ('Début', 11), ('Fin', 11), ('Jours', 8), ('Mensuel', 12),
              ('CA facturable', 13), ('Achat mensuel', 13), ('Achat facturé', 13)])"""),
    ("    f.entete([('Constat', 34), ('Nombre', 9), ('Detail', 80)])",
     "    f.entete([('Point', 34), ('Nombre', 9), ('Détail', 80)])"),

    # Les libelles de lignes.
    ("""    for lib, k in [('Top 1', 1), ('Top 3', 3), ('Top 5', 5), ('Top 10', 10)]:""",
     """    for lib, k in [('Le premier client', 1), ('Les 3 premiers', 3),
                   ('Les 5 premiers', 5), ('Les 10 premiers', 10)]:"""),
    ("    f.total(['Tous les clients', len(rang), round(ca, 2), 1.0], {2: EURO2, 3: PCT})",
     "    f.total(['Les 37 clients', len(rang), round(ca, 2), 1.0], {2: EURO2, 3: PCT})"),
    ("""    f.ligne(['dont clients perdus', '', '', '', '', '', '',
             '', round(sum(x['plein'] for x in departs if x['client'] in perdus), 2),
             ', '.join(perdus) or 'aucun'], {8: EURO2}, gras=True)""",
     """    f.ligne(['dont clients perdus', '', '', '', '', '', '',
             '', round(sum(x['plein'] for x in departs if x['client'] in perdus), 2),
             ', '.join(perdus) or '-'], {8: EURO2}, gras=True)"""),
    ("""        f.ligne(['Aucun renouvellement de campagne sur le mois', '', '', '', '', '', ''])""",
     """        f.ligne(['Aucun renouvellement ce mois-ci', '-', '-', '-', '-', '-', '-'])"""),

    # Les trois lignes du bloc de controle.
    ("""    f.ligne(["Prix d'achat absent", len(sans_achat),""",
     """    f.ligne(["Prix d'achat manquant", len(sans_achat),"""),
    ("""    f.ligne(['Mois incomplet', len(partiels),
             '%s EUR de recurrent produit mais non facture, qui tombera en octobre.'
             % milliers(plein - ca)])""",
     """    f.ligne(['Mois incomplet', len(partiels),
             '%s € produits en septembre qui tomberont sur la facture d\\'octobre.'
             % milliers(plein - ca)])"""),
    ("""    f.ligne(['Depart sans motif renseigne', len([x for x in departs if not x['motif']]),""",
     """    f.ligne(['Départ sans motif', len([x for x in departs if not x['motif']]),"""),
    ("""        f.ligne(['Lignes en stand-by, hors du mois', len(ecartes),
                 'Statut stand-by et aucune date de fin : la ligne ne se facture pas, elle '
                 'sort donc du mois. A verifier si la prestation a repris. Detail : %s.'
                 % ', '.join('%s / %s, %s EUR de recurrent'
                             % (x['client'], x['profil'], milliers(x['plein']))
                             for x in ecartes)])""",
     """        f.ligne(['Lignes en stand-by', len(ecartes),
                 'Non facturées, donc hors du mois. À confirmer si la prestation a repris : %s.'
                 % ', '.join('%s / %s, %s €'
                             % (x['client'], x['profil'], milliers(x['plein']))
                             for x in ecartes)])"""),
    ("""    f.ligne(['Profils passes en « Arret » gardes', len(arretes),
             'Decision du 09/10 : ils ont ete factures une partie du mois, pour '
             '%s EUR. Les ecarter ramenerait le CA a %s EUR sur %d profils et ferait '
             'disparaitre %s du perimetre. Detail : %s.'
             % (milliers(sum(x['ca'] for x in arretes)),
                milliers(ca - sum(x['ca'] for x in arretes)),
                len(C) - len(arretes),
                ', '.join(perdus) or 'aucun client perdu',
                ', '.join('%s / %s' % (x['client'], x['profil']) for x in arretes))])""",
     """    f.ligne(['Profils en « Arrêt » conservés', len(arretes),
             'Facturés une partie du mois, pour %s €. Les écarter ramènerait le CA à %s € '
             'sur %d profils, et ferait disparaître %s. Il s\\'agit de : %s.'
             % (milliers(sum(x['ca'] for x in arretes)),
                milliers(ca - sum(x['ca'] for x in arretes)),
                len(C) - len(arretes),
                ', '.join(perdus) or '-',
                ', '.join('%s / %s' % (x['client'], x['profil']) for x in arretes))])"""),
]
R1 += [
    # Les KPI du Focus client.
    ("""        ('Nouveaux clients', len(nouveaux), None,
         'CA associe : %s EUR' % milliers(ca_nouv),
         'Clients dont aucun profil ne tournait avant le 1er septembre : %s.'
         % (', '.join(nouveaux) or 'aucun'), VERT),""",
     """        ('Nouveaux clients', len(nouveaux), None,
         'CA associé : %s €' % milliers(ca_nouv),
         '%s.' % (', '.join(nouveaux) or '-'), VERT),"""),
    ("""        ('Missions perdues', len(departs), None,
         '%d client%s perdu%s : %s' % (len(perdus), 's' if len(perdus) > 1 else '',
                                       's' if len(perdus) > 1 else '',
                                       ', '.join(perdus) or 'aucun'),
         "Fins de mission dans le mois, HORS les %d campagne%s TLM dont la ligne du mois suivant "
         "existe deja : un renouvellement mensuel n'est pas une perte. Un client n'est compte "
         "perdu que si plus aucune ligne de l'export ne tourne apres le 30/09."
         % (len(renouvellements), 's' if len(renouvellements) > 1 else ''), ROSE),""",
     """        ('Missions perdues', len(departs), None,
         '%d client%s perdu%s : %s' % (len(perdus), 's' if len(perdus) > 1 else '',
                                       's' if len(perdus) > 1 else '',
                                       ', '.join(perdus) or '-'),
         'Fins de mission du mois, hors les %d campagne%s TLM renouvelée%s.'
         % (len(renouvellements), 's' if len(renouvellements) > 1 else '',
            's' if len(renouvellements) > 1 else ''), ROSE),"""),
    ("""        ('Portefeuille de clients actifs', len(clients), None, '%d profils' % len(C),
         'Societes portant au moins un profil retenu sur le mois.', BLEU),""",
     """        ('Portefeuille de clients actifs', len(clients), None, '%d profils' % len(C),
         'Sociétés portant au moins une mission en septembre.', BLEU),"""),
    ("""        ('Marge brute nouveaux clients', round(m_nouv, 2), EURO2,
         '%d arrivees de profil' % len(arrivees),
         'Marge proratisee des profils arrives dans le mois, nouveaux clients et renforts chez '
         'un client existant confondus.', VIOLET),""",
     """        ('Marge brute nouveaux clients', round(m_nouv, 2), EURO2,
         '%d arrivées de profil' % len(arrivees),
         'Nouveaux clients et renforts chez un client existant confondus.', VIOLET),"""),
]

# ------------------------------------------------- feuille 2, Lead Prospect --
R1 += [
    ("""        "Recalcule a la main depuis l'export Monday du 9 octobre. La feuille repond a une seule "
        "question : quels clients avons-nous pris en rendez-vous en septembre, et qu'est-ce que "
        "ces rendez-vous ont donne. Une affaire appartient donc au mois ou son RENDEZ-VOUS s'est "
        "tenu. Le classement des etats vient de server/src/leadsEtats.js. Les lignes de totaux "
        "que Monday ajoute en bas de chaque groupe sont ecartees : comptees par erreur, elles "
        "ajoutent une affaire fantome.")""",
     """        "Export Monday du 9 octobre. Une seule question : quels clients avons-nous rencontrés "
        "en septembre, et où en est chacun aujourd'hui. Une affaire appartient donc au mois de "
        "son rendez-vous.")"""),
    ("g.section('Vue consolidee', 'Monday - board Lead/Prospect')",
     "g.section('Vue consolidée', 'Monday')"),
    ("g.section('Le funnel commercial')", "g.section('Où en sont les affaires')"),
    ("g.section('La provenance des affaires')", "g.section("
     "'D\\'où viennent les affaires')"),
    ("g.section('Ce qui bloque')", "g.section('Ce qui bloque')"),
    ("g.section('Le detail')", "g.section('Le détail')"),

    ("""        ('Pipeline total', round(pipeline, 2), EURO2, '%d affaires en cours' % len(actifs),
         "Somme des Vente P des affaires encore en cours, ni gagnees ni perdues ni stand-by. "
         'Seules %d de ces %d affaires portent un montant.'
         % (sum(1 for x in actifs if x['vente'] > 0), len(actifs)), VIOLET),""",
     """        ('Pipeline total', round(pipeline, 2), EURO2, '%d affaires en cours' % len(actifs),
         'Attention, seules %d de ces %d affaires portent un montant.'
         % (sum(1 for x in actifs if x['vente'] > 0), len(actifs)), VIOLET),"""),
    ("""        ('Pipeline pondere', round(pondere, 2), EURO2, 'Seuil de 30 % de probabilite',
         "Vente P x probabilite, limite aux affaires a 30 % et plus. Une affaire sans montant "
         "saisi pese zero quelle que soit sa probabilite : c'est ce qui vide la tranche forte.",
         VIOLET),""",
     """        ('Pipeline pondéré', round(pondere, 2), EURO2, 'Seuil de 30 % de probabilité',
         'Montant multiplié par la probabilité. Sans montant saisi, une affaire pèse zéro.',
         VIOLET),"""),
    ("""        ('Taux de signature', len(gagnes) / denom if denom else 0, PCT,
         '%d signes sur %d rendez-vous' % (len(gagnes), denom),
         'Affaires signees divisees par les %d rendez-vous du mois. Tout le monde est au '
         'denominateur, y compris les affaires encore ouvertes : le taux ne peut donc que '
         'monter dans les mois qui viennent.' % denom, SOLEIL),""",
     """        ('Taux de signature', len(gagnes) / denom if denom else 0, PCT,
         '%d signés sur %d rendez-vous' % (len(gagnes), denom),
         'Les affaires encore ouvertes comptent au dénominateur : le taux ne peut que monter.',
         SOLEIL),"""),
    ("""        ('Contrats signes', len(gagnes), None,
         'Recurrent associe : %s EUR' % milliers(sum(x['vente'] for x in gagnes)),
         'Rendez-vous de septembre deja transformes : %s.'
         % (', '.join(x['nom'] for x in gagnes) or 'aucun'), VERT),""",
     """        ('Contrats signés', len(gagnes), None,
         'Récurrent associé : %s €' % milliers(sum(x['vente'] for x in gagnes)),
         '%s.' % (', '.join(x['nom'] for x in gagnes) or '-'), VERT),"""),

    ("""    g.carte("Les rendez-vous de septembre et ce qu'ils ont donne",
            "Un rendez-vous = un client rencontre. Les trois colonnes de droite disent ou en est "
            "chacun au 9 octobre, soit entre 9 et 38 jours apres le rendez-vous.")""",
     """    g.carte("Les rendez-vous de septembre et ce qu'ils ont donné",
            'Un rendez-vous, un client. État au 9 octobre, soit entre 9 et 38 jours après.')"""),
    ("""    g.entete([('', 38), ('Clients', 10), ('Part', 10), ('Recurrent mensuel', 17),
              ('Lesquels', 62)])""",
     """    g.entete([('', 38), ('Clients', 10), ('Part', 10), ('Récurrent mensuel', 17),
              ('Lesquels', 62)])"""),
    ("""             '%d societes distinctes, aucun doublon' % len({x['nom'] for x in cohorte})],""",
     """             '%d sociétés distinctes, aucun doublon' % len({x['nom'] for x in cohorte})],"""),
    ("    g.ligne(['dont contrats signes', len(gagnes),",
     "    g.ligne(['dont contrats signés', len(gagnes),"),
    ("""             ', '.join('%s, %s EUR' % (x['nom'], milliers(x['vente'])) for x in gagnes) or '-'],""",
     """             ', '.join('%s, %s €' % (x['nom'], milliers(x['vente'])) for x in gagnes) or '-'],"""),
    ("    g.ligne(['dont affaires arretees', len(perdus),",
     "    g.ligne(['dont affaires arrêtées', len(perdus),"),
    ("""             ', '.join('%s (%s)' % (x['nom'], x['motif'] or 'sans motif') for x in perdus) or '-'],""",
     """             ', '.join('%s, %s' % (x['nom'], (x['motif'] or 'sans motif').lower())
                       for x in perdus) or '-'],"""),
    ("""             '%d au point de cadrage, %d en relance, %d en recherche de profil'""",
     """             '%d au point de cadrage, %d en relance, %d en recherche de profil.'"""),
    ("""    g.carte('Ce qui reste a jouer sur ces rendez-vous',
            "Les affaires ouvertes ne sont ni gagnees ni perdues : c'est la matiere des "
            "semaines qui viennent. L'age se compte depuis la date du rendez-vous.")""",
     """    g.carte('Ce qui reste à jouer',
            'Les affaires ouvertes, par ancienneté du rendez-vous.')"""),
    ("""    g.entete([('Delai depuis le rendez-vous', 30), ('Affaires ouvertes', 16), ('Part', 10),
              ('Lesquelles', 86)])""",
     """    g.entete([('Délai depuis le rendez-vous', 30), ('Affaires ouvertes', 16), ('Part', 10),
              ('Lesquelles', 86)])"""),
    ("""    for lib, mini, maxi in [('Moins de 15 jours', 0, 15), ('De 15 a 30 jours', 15, 31),
                            ('Plus de 30 jours', 31, 10000)]:""",
     """    for lib, mini, maxi in [('Moins de 15 jours', 0, 15), ('De 15 à 30 jours', 15, 31),
                            ('Plus de 30 jours', 31, 10000)]:"""),
    ("""    g.carte('Funnel par etape commerciale',
            "Cohorte du mois : les %d affaires dont le RENDEZ-VOUS s'est tenu en septembre. "
            "L'ordre des etapes est celui de la colonne Etat dans Monday, pas un classement par "
            "volume." % len(cohorte))""",
     """    g.carte('Par étape commerciale',
            'Les %d affaires du mois. Ordre des étapes repris de Monday, pas un classement par '
            'volume.' % len(cohorte))"""),
    ("""    g.entete([('Etape', 32), ('Affaires', 10), ('Part', 10), ('Vente P cumulee', 15),
              ('Categorie', 14)])""",
     """    g.entete([('Étape', 32), ('Affaires', 10), ('Part', 10), ('Montant cumulé', 15),
              ('Résultat', 14)])"""),
    ("""    g.carte('Pipeline pondere par probabilite',
            "Les trois tranches du dashboard, en euros ET en nombre d'affaires. Le KPI ci-dessus "
            "ne retient que les deux premieres, la repartition montre les trois.")""",
     """    g.carte('Pipeline pondéré par probabilité',
            "En euros et en nombre d'affaires. Le KPI ci-dessus ne retient que les deux "
            'premières tranches.')"""),
    ("""    g.entete([('Tranche', 22), ('Affaires', 10), ('dont avec un montant', 18), ('Vente P', 13),
              ('Pondere', 13), ('Part du pondere', 14), ('Affaires concernees', 46)])""",
     """    g.entete([('Tranche', 22), ('Affaires', 10), ('dont avec un montant', 18), ('Montant', 13),
              ('Pondéré', 13), ('Part', 10), ('Lesquelles', 50)])"""),
    ("""    for lib, mini, maxi, val in [('Forte (75 % et plus)', 75, 101, fort),
                                 ('Moderee (30 a 74 %)', 30, 75, modere),
                                 ('Faible (1 a 29 %)', 1, 30, faible)]:""",
     """    for lib, mini, maxi, val in [('Forte, 75 % et plus', 75, 101, fort),
                                 ('Modérée, 30 à 74 %', 30, 75, modere),
                                 ('Faible, 1 à 29 %', 1, 30, faible)]:"""),
    ("    g.ligne(['Sans probabilite', len(zero),", "    g.ligne(['Sans probabilité', len(zero),"),
    ("""        'ATTENTION : %d des %d affaires en cours ne portent aucun montant. Le pondere ne mesure '
        'donc que %s. %s%sC\\'est une saisie manquante, pas un pipeline vide.'
        % (len(sans_montant), len(actifs),
           ' et '.join('%s, %.0f EUR a %.0f %%' % (x['nom'], x['vente'], x['proba'])
                       for x in avec_montant) or 'rien',
           ('La plus probable sans montant est %s, a %.0f %%, qui pese donc zero. '
            % (plus_probable['nom'], plus_probable['proba'])) if plus_probable else '',
           '')))""",
     """        '%d des %d affaires en cours ne portent aucun montant. Le pondéré ne mesure donc que '
        '%s. %sIl manque la saisie, le pipeline n\\'est pas vide pour autant.'
        % (len(sans_montant), len(actifs),
           ' et '.join('%s, %.0f € à %.0f %%' % (x['nom'], x['vente'], x['proba'])
                       for x in avec_montant) or 'rien',
           ('La plus probable sans montant est %s, à %.0f %%, qui pèse donc zéro. '
            % (plus_probable['nom'], plus_probable['proba'])) if plus_probable else '')))"""),
    ("""    g.carte('Performance par source de lead',
            "Le calling regroupe les commerciaux MA, Pol Envol et les listes de cold calling. "
            "Cette colonne n'existe pas dans la base du dashboard, elle vient de l'export.")""",
     """    g.carte('Par source de lead',
            'Le calling regroupe les commerciaux MA, Pol Envol et les listes de cold calling.')"""),
    ("""    g.entete([('Source', 28), ('Affaires', 10), ('Part', 10), ('Signees', 10),
              ('Taux de signature', 15), ('Vente P', 13)])""",
     """    g.entete([('Source', 28), ('Affaires', 10), ('Part', 10), ('Signées', 10),
              ('Taux de signature', 15), ('Montant', 13)])"""),
    ("""    g.carte('Detail par closer',
            "Qui porte les affaires du mois. Cette repartition n'a pas de carte dans le "
            "dashboard, elle est ajoutee ici parce qu'elle explique la concentration.")""",
     """    g.carte('Par closer',
            'Qui porte les affaires du mois.')"""),
    ("""    g.entete([('Closer', 22), ('Affaires', 10), ('Part', 10), ('Signees', 10), ('Perdues', 10),
              ('En cours', 10), ('Vente P', 13)])""",
     """    g.entete([('Closer', 22), ('Affaires', 10), ('Part', 10), ('Signées', 10), ('Arrêtées', 10),
              ('En cours', 10), ('Montant', 13)])"""),
    ("""    g.carte('Motifs des deals perdus',
            "Colonne « Motif refus », sur les %d affaires arretees du mois." % len(perdus))""",
     """    g.carte('Pourquoi les affaires se sont arrêtées',
            'Sur les %d affaires arrêtées du mois.' % len(perdus))"""),
    ("""    g.entete([('Motif', 46), ('Affaires', 10), ('Affaires concernees', 50)])""",
     """    g.entete([('Motif', 46), ('Affaires', 10), ('Lesquelles', 50)])"""),
    ("""        g.ligne(['Aucune affaire perdue sur le mois', 0, '-'])""",
     """        g.ligne(['Aucune affaire arrêtée ce mois-ci', 0, '-'])"""),
    ("""    g.carte('Opportunites sans prochaine action',
            "Les affaires en cours dont l'etat ne porte aucune action planifiee. La liste "
            "d'etats est celle retenue dans le code, plus restreinte que le funnel complet.")""",
     """    g.carte('Affaires sans prochaine action',
            "Celles dont l'état ne porte aucune étape planifiée.")"""),
    ("""    g.entete([('Affaire', 30), ('Etat', 24), ('Closer', 14), ('Date RDV', 12),
              ('Age en jours', 12), ('Vente P', 12), ('Proba', 9)])""",
     """    g.entete([('Client', 30), ('État', 24), ('Closer', 14), ('Rendez-vous', 13),
              ('Jours écoulés', 13), ('Montant', 12), ('Proba', 9)])"""),
    ("""    g.carte('Detail des rendez-vous du mois',
            "Les %d clients pris en rendez-vous en septembre, un par ligne. En vert les signes, "
            "en jaune les arretes. Les %d autres lignes de l'export ont un rendez-vous hors du "
            "mois : elles ne sont pas ici." % (len(cohorte), len(L) - len(cohorte)))""",
     """    g.carte('Tous les rendez-vous du mois',
            'Les %d clients rencontrés en septembre. En vert les signés, en jaune les arrêtés.'
            % len(cohorte))"""),
    ("""    g.entete([('Client', 34), ('Etat', 26), ('Resultat', 12), ('Closer', 14),
              ('Source', 20), ('Date RDV', 12), ('Age en jours', 12), ('Vente P', 12),
              ('Achat P', 12), ('Marge', 11), ('Proba', 9), ('Profil cherche', 28),
              ('Motif refus', 34)])""",
     """    g.entete([('Client', 34), ('État', 26), ('Résultat', 12), ('Closer', 14),
              ('Source', 20), ('Rendez-vous', 13), ('Jours écoulés', 13), ('Montant', 12),
              ("Prix d'achat", 12), ('Marge', 11), ('Proba', 9), ('Profil cherché', 28),
              ('Motif', 34)])"""),
    ("""                 {'Gagne': 'Signe', 'Perdu': 'Arrete'}.get(cat, cat), x['closer'], x['canal'],""",
     """                 {'Gagne': 'Signé', 'Perdu': 'Arrêté'}.get(cat, cat), x['closer'], x['canal'],"""),
]


def applique(chemin, regles):
    s = io.open(chemin, encoding='utf-8').read()
    faits, rates = 0, []
    for vieux, neuf in regles:
        if vieux in s:
            s = s.replace(vieux, neuf, 1)
            faits += 1
        else:
            rates.append(vieux.strip().splitlines()[0][:78])
    io.open(chemin, 'w', encoding='utf-8', newline='\n').write(s)
    print('%s : %d remplacements' % (chemin, faits))
    for r in rates:
        print('   NON TROUVE : %s' % r)
    return len(rates)


if __name__ == '__main__':
    manques = applique(P1, R1)
    sys.exit(1 if manques else 0)
