# -*- coding: utf-8 -*-
"""Tous les indicateurs de septembre 2026, recalcules a la main depuis les
   exports Monday, ranges comme dans le dashboard.

    python scripts/indicateurs-septembre.py <Comptes.xlsx> <Leads_Prospects.xlsx>

   LA STRUCTURE SUIT CELLE DU DASHBOARD, carte par carte
     Feuille « Comptes »       -> onglet Synthese (partie Comptes) + Focus client
     Feuille « Lead Prospect » -> onglet Focus commercial
     Les KPI « Deals gagnes » et « Pipeline pondere » de la Vue consolidee sont
     sur la seconde feuille, puisqu'ils viennent de l'autre board.

   LES REGLES SONT CELLES DU CODE, pas des miennes
     - Etats gagnes, perdus, stand-by et actifs : server/src/leadsEtats.js.
     - Win rate = gagnes / (gagnes + perdus + en cours), les stand-by hors
       denominateur.
     - Pipeline pondere : le KPI ne retient que les affaires a 30 % et plus,
       alors que la repartition affiche les trois tranches. C'est voulu.
     - Un deal GAGNE appartient au mois de sa DATE DE DEMARRAGE, les autres au
       mois de leur DATE RDV.

   CE QUI DIFFERE DU DASHBOARD, et pourquoi
     Le CA est ici PRORATISE comme le fait la compta : vente x (21 - ABS) / 21
     et achat x jours travailles / jours ouvres. Le dashboard, lui, projette le
     recurrent mensuel entier des qu'un profil est actif a la fin du mois. Les
     deux chiffres sont donnes cote a cote.

   DEUX PIEGES DES EXPORTS MONDAY, traites ici
     1. L'en-tete des comptes porte DEUX colonnes « Nom » : la societe en
        premiere position, le contact en sixieme. On indexe par POSITION.
     2. Monday ajoute une LIGNE DE TOTAUX au bas de chaque groupe : dates en
        plages, montants en sommes, probabilite en moyenne. On l'ecarte.
"""
import io
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DEB, FIN = date(2026, 9, 1), date(2026, 9, 30)
AUJOURD = date(2026, 10, 9)
BASE_VENTE = 21

# La palette du dashboard
MYRTILLE = '26001F'
SABLE = 'E3E1D8'
TEXTE3 = '8A7F86'
SOLEIL = 'FFF993'
BLEU = 'DCE6F2'
VERT = 'DDF0DD'
VIOLET = 'E8E0F0'
ROSE = 'F7E2DC'
EURO2 = '# ##0,00 "\u20ac";-# ##0,00 "\u20ac";"-"'
PCT = '0,0 %'
FIN_BORD = Side(style='thin', color='D8D3D6')

POLES = {'SO': 'Commercial', 'AV': 'Administratif', 'CS': 'Customer Success',
         'IT': 'Informatique', 'DS': 'Digital'}

# server/src/leadsEtats.js, repris mot pour mot
ETAT_ORDRE = ['Recherche profil', 'Presentation profil', 'Point de cadrage',
              'R1 Planifie', 'R1 Reporte', 'Relance en cours', 'Relance a faire',
              'Attente retour client', 'ATRC apres prez', 'Suivi MEP J+7',
              'Suivi MEP J+21', 'R2 a planifier/planifie',
              'Date de demarrage planifie/Contrat signe']
ETAT_GAGNE = {'contrat signe', 'date de demarrage planifie/contrat signe',
              'resilie / arret de collaboration', 'fin de contrat',
              'suspension de contrat'}
ETAT_PERDU = {'arret suivi', 'stop contact'}
ETAT_STANDBY = {'stand by'}
# Les deux sources de prospection, nommees telles quelles. La notion d'agregat
# « calling » a ete abandonnee le 09/10 : on ne la reintroduit pas, ni dans la
# feuille ni dans le support.
PROSPECTION = {'Commerciaux MA', 'Pol Envol'}
SANS_ACTION = {'attente retour client', 'relance a faire', 'point de cadrage',
               'presentation profil', 'recherche profil', 'r1 planifie',
               'relance en cours', 'atrc apres prez'}


def sa(x):
    x = unicodedata.normalize('NFD', str(x or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', x).strip()


def cle(x):
    return sa(x).lower()


def txt(x):
    """Le texte tel qu'il est saisi dans Monday, accents compris.

       sa() retire les accents, ce qui est indispensable pour comparer un
       libelle a une liste en dur ou pour retrouver une colonne dans l'en-tete.
       Mais une cellule affichee doit garder son orthographe : « Arret » et
       « Demission » dans un classeur, ca se voit. Donc txt() pour tout ce qui
       s'affiche, cle() pour tout ce qui se compare."""
    return re.sub(r'\s+', ' ', str(x or '')).strip()


def nb(v):
    if v in (None, '', '.'):
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    t = str(v).replace('\xa0', '').replace(' ', '').replace('\u20ac', '').replace(',', '.')
    t = re.sub(r'[^0-9.\-]', '', t)
    try:
        return float(t) if t not in ('', '-', '.') else 0.0
    except ValueError:
        return 0.0


def jour(v):
    if v in (None, '', '.'):
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    t = str(v)[:10]
    for f in ('%Y-%m-%d', '%d/%m/%Y', '%d/%m/%y'):
        try:
            return datetime.strptime(t, f).date()
        except ValueError:
            pass
    return None


def ouvres(a, b):
    """Jours ouvres, lundi au vendredi, feries non deduits."""
    if b < a:
        return 0
    n, d = 0, a
    while d <= b:
        if d.weekday() < 5:
            n += 1
        d += timedelta(days=1)
    return n


JO = ouvres(DEB, FIN)


def milliers(x):
    return format(int(round(x)), ',d').replace(',', ' ')


def dec(x, n=1):
    """Un decimal dans une phrase : virgule, pas point. « 53,4 % », jamais
       « 53.4 % », qui trahit immediatement un texte genere."""
    return ('%.*f' % (n, x)).replace('.', ',')


# ====================================================== lecture des comptes ==
def lire_comptes(chemin):
    wb = load_workbook(chemin, data_only=True, read_only=True)
    rows = [list(r) for r in wb[wb.sheetnames[0]].iter_rows(values_only=True)]
    wb.close()
    ent_p, courant, profils = None, None, []
    for r in rows:
        c0 = sa(r[0]) if r else ''
        c1 = sa(r[1]) if len(r) > 1 else ''
        if c0 == 'Subitems':
            ent_p = [sa(x) for x in r]
            continue
        if c0 == 'Nom' and 'ments' in c1:
            continue
        if c0 == 'Comptes' or (c0 and all(not sa(x) for x in r[1:])):
            continue
        if c0:
            courant = txt(r[0])              # la SOCIETE, par sa position
            continue
        if not c0 and c1 and ent_p and courant:
            d = dict(zip(ent_p, [str(x) if hasattr(x, 'year') else x for x in r]))
            d['_client'] = courant
            profils.append(d)
    return profils


def normalise(profils):
    """Toutes les lignes de l'export, sans filtre de mois.

       Indispensable pour juger un depart : une campagne TLM se vend au mois,
       et la ligne de renouvellement demarre le 1er du mois SUIVANT. Elle est
       donc hors du perimetre de septembre, alors que c'est elle qui dit si le
       client est parti ou pas."""
    out = []
    for p in profils:
        out.append({
            'client': p['_client'], 'profil': txt(p.get('Name')),
            'statut': txt(p.get('Statut')), 'poste': txt(p.get('Poste')),
            'debut': jour(p.get("Date d'integration")), 'fin': jour(p.get('Date de fin')),
            'plein': nb(p.get('Vente P')), 'achat_plein': nb(p.get('Achat P')),
        })
    return out


def est_tlm(x):
    """Une ligne de campagne de telemarketing, vendue au mois."""
    return (x['statut'].upper() == 'TLM'
            or 'TELEMARKET' in x['poste'].upper()
            or x['profil'].upper().startswith('TLM'))


def renouvelee(x, tous):
    """Vrai si une autre campagne TLM du meme client reprend juste apres.

       REGLE DONNEE PAR JIMMY LE 09/10 : une campagne TLM se vend au mois. Au
       renouvellement, une NOUVELLE ligne est creee pour le mois a venir et la
       precedente se termine le dernier jour du mois de prestation. Une fin au
       30/09 suivie d'un demarrage au 01/10 n'est donc pas une mission perdue,
       c'est un renouvellement. Sans ce test, YOOOWIN passait pour un client
       perdu alors que sa campagne tourne toujours."""
    if not x['fin'] or not est_tlm(x):
        return None
    for y in tous:
        if y is x or y['client'] != x['client'] or not est_tlm(y) or not y['debut']:
            continue
        if 0 < (y['debut'] - x['fin']).days <= 5:
            return y
    return None


def survit(client, tous, apres=FIN):
    """Vrai si le client porte encore une ligne ouverte apres la fin du mois."""
    for y in tous:
        if y['client'] != client:
            continue
        if y['fin'] is None or y['fin'] > apres:
            return True
        if y['debut'] and y['debut'] > apres:
            return True
    return False


def comptes_septembre(profils):
    out = []
    for p in profils:
        st = txt(p.get('Statut'))
        # L'en-tete a ete desaccentue par sa() : la cle ne porte pas d'accent.
        # Avec « Date d'intégration » on recupere None partout, et le script
        # croit alors que personne n'est arrive dans le mois.
        di = jour(p.get("Date d'integration"))
        df = jour(p.get('Date de fin'))
        # REGLE ARBITREE PAR JIMMY LE 09/10 : statut Actif ou TLM, ou bien une
        # date de fin qui tombe en septembre ou apres, et dans tous les cas une
        # mission qui ne s'est pas terminee avant le mois. Le detour par la date
        # de fin est indispensable : dans l'export, un profil arrete en
        # septembre porte le statut « Arret », pas « Actif ». Sans lui, sept
        # lignes et 2 786 EUR deja factures sortent du mois, dont BR ROCHE
        # CONSULTING qui est l'un des deux clients perdus.
        if not ((st in ('Actif', 'TLM')) or (df and df >= DEB)):
            continue
        if df and df < DEB:
            continue
        trav = ouvres(max(di, DEB) if di else DEB, min(df, FIN) if df else FIN)
        # Un profil qui demarre apres le 30 ne fait aucun jour en septembre : il
        # n'appartient pas au mois, meme proratise a zero.
        if trav == 0:
            continue
        absn = JO - trav
        tarif, cout = nb(p.get('Vente P')), nb(p.get('Achat P'))
        out.append({
            'client': p['_client'], 'profil': txt(p.get('Name')), 'statut': st,
            'poste': txt(p.get('Poste')),
            'pole': POLES.get(sa(p.get('Poste')).split(' -')[0], 'Non renseigné'),
            'contrat': txt(p.get('Type de contrat')), 'debut': di, 'fin': df,
            'jours': trav, 'abs': absn,
            'plein': tarif, 'achat_plein': cout,
            'ca': tarif * max(0, BASE_VENTE - absn) / BASE_VENTE,
            'achat': cout * trav / JO,
            'motif': txt(p.get('Motif arret')),
        })
    return out


# ======================================================== lecture des leads ==
def place(ent, *noms):
    for n in noms:
        for i, t in enumerate(ent):
            if cle(t) == cle(n):
                return i
    for n in noms:
        for i, t in enumerate(ent):
            if t and cle(t).startswith(cle(n)):
                return i
    return None


def lire_leads(chemin):
    wb = load_workbook(chemin, data_only=True, read_only=True)
    rows = [list(r) for r in wb[wb.sheetnames[0]].iter_rows(values_only=True)]
    wb.close()
    ent, lignes = None, []
    for r in rows:
        t = [sa(x) for x in r]
        if not any(t):
            continue
        if t[0] == 'Nom' and 'Closer' in t:
            ent = t
            continue
        if ent is not None:
            lignes.append(list(r))

    I = {'nom': 0, 'closer': place(ent, 'Closer'), 'etat': place(ent, 'Etat'),
         'canal': place(ent, "Canaux d'acquisition"), 'rdv': place(ent, 'Date RDV'),
         'vente': place(ent, 'Vente P'), 'achat': place(ent, 'Achat P'),
         'proba': place(ent, '% de probabilite'), 'motif': place(ent, 'Motif refus'),
         'profil': place(ent, 'Profil/Fonction'), 'contrat': place(ent, 'Type de contrat'),
         'demarrage': place(ent, 'Date de demarrage souhaite')}

    def v(r, k):
        i = I[k]
        return r[i] if (i is not None and i < len(r)) else None

    out = []
    for r in lignes:
        brut = v(r, 'rdv')
        if ' to ' in str(brut) or not sa(v(r, 'nom')):     # ligne de totaux Monday
            continue
        rdv = jour(brut)
        dem = jour(v(r, 'demarrage'))
        ref = dem or rdv
        dans_rdv = bool(rdv and DEB <= rdv <= FIN)
        dans_gagne = bool(ref and DEB <= ref <= FIN)
        if not dans_rdv and not dans_gagne:
            continue
        out.append({
            'nom': txt(v(r, 'nom')), 'etat': txt(v(r, 'etat')) or '-',
            'closer': txt(v(r, 'closer')) or '-',
            'canal': txt(v(r, 'canal')) or '(non renseigné)',
            'rdv': rdv, 'dem': dem,
            'vente': nb(v(r, 'vente')), 'achat': nb(v(r, 'achat')),
            'proba': nb(v(r, 'proba')), 'motif': txt(v(r, 'motif')),
            'profil': txt(v(r, 'profil')), 'contrat': txt(v(r, 'contrat')),
            'rdv_periode': dans_rdv, 'gagne_periode': dans_gagne,
        })
    return out


def categorie(e):
    k = cle(e)
    return ('Gagne' if k in ETAT_GAGNE else 'Perdu' if k in ETAT_PERDU
            else 'Stand-by' if k in ETAT_STANDBY else 'En cours')


def rang_etat(e):
    for i, t in enumerate(ETAT_ORDRE):
        if cle(t) == cle(e):
            return i
    return 50


# ============================================================== mise en page ==
class Feuille:
    """Une feuille qui s'ecrit de haut en bas, comme le dashboard se lit."""

    def __init__(self, ws):
        self.ws = ws
        self.r = 1

    def bandeau(self, titre, sous):
        c = self.ws.cell(row=self.r, column=1, value=titre)
        c.font = Font(bold=True, size=16, color=MYRTILLE)
        self.r += 1
        c = self.ws.cell(row=self.r, column=1, value=sous)
        c.font = Font(size=9, italic=True, color=TEXTE3)
        c.alignment = Alignment(wrap_text=True, vertical='top')
        self.ws.merge_cells(start_row=self.r, start_column=1, end_row=self.r, end_column=11)
        self.ws.row_dimensions[self.r].height = 44
        self.r += 2

    def section(self, texte, badge=None):
        """Le SectionLabel du dashboard, avec son badge de source."""
        lib = texte.upper() + (('     [ %s ]' % badge) if badge else '')
        c = self.ws.cell(row=self.r, column=1, value=lib)
        c.font = Font(bold=True, size=11, color='FFFFFF')
        c.fill = PatternFill('solid', fgColor=MYRTILLE)
        c.alignment = Alignment(vertical='center', indent=1)
        for i in range(2, 12):
            self.ws.cell(row=self.r, column=i).fill = PatternFill('solid', fgColor=MYRTILLE)
        self.ws.row_dimensions[self.r].height = 20
        self.r += 2

    def kpis(self, cartes):
        """Les KPICard : libelle, valeur, ligne de tendance, puis la regle."""
        for i, (lib, val, fmt, trend, regle, couleur) in enumerate(cartes):
            col = 1 + i * 3
            for dr, (v, police) in enumerate([
                    (lib.upper(), Font(bold=True, size=9, color=TEXTE3)),
                    (val, Font(bold=True, size=15, color=MYRTILLE)),
                    (trend, Font(size=9, color=MYRTILLE))]):
                c = self.ws.cell(row=self.r + dr, column=col, value=v)
                c.font = police
                c.fill = PatternFill('solid', fgColor=couleur)
                if dr == 1 and fmt:
                    c.number_format = fmt
                for j in range(1, 3):
                    self.ws.cell(row=self.r + dr, column=col + j).fill = \
                        PatternFill('solid', fgColor=couleur)
                self.ws.merge_cells(start_row=self.r + dr, start_column=col,
                                    end_row=self.r + dr, end_column=col + 2)
            c = self.ws.cell(row=self.r + 3, column=col, value=regle)
            c.font = Font(size=8, italic=True, color=TEXTE3)
            c.alignment = Alignment(wrap_text=True, vertical='top')
            self.ws.merge_cells(start_row=self.r + 3, start_column=col,
                                end_row=self.r + 3, end_column=col + 2)
        self.ws.row_dimensions[self.r + 3].height = 58
        self.r += 5

    def carte(self, titre, note=None):
        """Le Card title du dashboard."""
        c = self.ws.cell(row=self.r, column=1, value=titre)
        c.font = Font(bold=True, size=12, color=MYRTILLE)
        self.r += 1
        if note:
            c = self.ws.cell(row=self.r, column=1, value=note)
            c.font = Font(size=9, italic=True, color=TEXTE3)
            c.alignment = Alignment(wrap_text=True, vertical='top')
            self.ws.merge_cells(start_row=self.r, start_column=1,
                                end_row=self.r, end_column=11)
            self.ws.row_dimensions[self.r].height = 28
            self.r += 1

    def entete(self, cols):
        for i, (t, l) in enumerate(cols):
            c = self.ws.cell(row=self.r, column=1 + i, value=t)
            c.font = Font(bold=True, color='FFFFFF', size=10)
            c.fill = PatternFill('solid', fgColor=MYRTILLE)
            c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            lettre = get_column_letter(1 + i)
            if (self.ws.column_dimensions[lettre].width or 0) < l:
                self.ws.column_dimensions[lettre].width = l
        self.ws.row_dimensions[self.r].height = 28
        self.r += 1

    def ligne(self, vals, formats=None, gras=False, teinte=None):
        for i, v in enumerate(vals):
            c = self.ws.cell(row=self.r, column=1 + i, value=v)
            c.border = Border(bottom=FIN_BORD)
            if gras:
                c.font = Font(bold=True)
            if teinte:
                c.fill = PatternFill('solid', fgColor=teinte)
            f = (formats or {}).get(i)
            if f:
                c.number_format = f
            elif isinstance(v, (int, float)):
                c.alignment = Alignment(horizontal='center')
        self.r += 1
        return self.r - 1

    def total(self, vals, formats=None):
        return self.ligne(vals, formats, gras=True, teinte=SABLE)

    def saut(self, n=1):
        self.r += n


def feuille_comptes(f, C, TOUS):
    ca = sum(x['ca'] for x in C)
    achat = sum(x['achat'] for x in C)
    plein = sum(x['plein'] for x in C)
    achat_plein = sum(x['achat_plein'] for x in C)
    clients = sorted({x['client'] for x in C})
    partiels = [x for x in C if x['jours'] < JO]
    sans_achat = [x for x in C if x['achat_plein'] == 0 and x['plein'] > 0]
    arrivees = [x for x in C if x['debut'] and x['debut'] >= DEB]
    anciens = {x['client'] for x in C if x['debut'] and x['debut'] < DEB}
    nouveaux = sorted({x['client'] for x in arrivees} - anciens)

    # Les fins de mois se trient en deux : les vraies fins de mission, et les
    # campagnes TLM dont la ligne du mois suivant existe deja. Les secondes ne
    # sont pas des pertes, c'est la mecanique de facturation mensuelle.
    toutes_fins = [x for x in C if x['fin'] and DEB <= x['fin'] <= FIN]
    suites = {id(x): renouvelee(x, TOUS) for x in toutes_fins}
    renouvellements = [x for x in toutes_fins if suites[id(x)]]
    departs = [x for x in toutes_fins if not suites[id(x)]]
    # Un client n'est perdu que si plus AUCUNE ligne de l'export ne tourne
    # apres le 30/09, renouvellements compris.
    perdus = sorted({x['client'] for x in departs if not survit(x['client'], TOUS)})

    f.bandeau(
        'Comptes clients, septembre 2026',
        "Export Monday du 9 octobre. Le CA est proratisé comme en compta, au prorata des jours "
        "réellement travaillés. La colonne « mois plein » donne le récurrent entier, celui "
        "qu'affiche le dashboard. L'écart entre les deux se facturera en octobre.")

    f.section('Vue consolidée', 'source Monday')
    f.kpis([
        ('CA', round(ca, 2), EURO2, 'Clients actifs : %d' % len(clients),
         'Facturable sur le mois, prorata compris. Mois plein : %s €.' % milliers(plein), BLEU),
        ('Marge brute', round(ca - achat, 2), EURO2,
         'Taux de marge brute : %s %%' % dec(100 * (ca - achat) / ca if ca else 0),
         'Vente moins achat, les deux proratisés.', VERT),
        ('Effet du prorata', round(plein - ca, 2), EURO2,
         '%d profils en mois incomplet' % len(partiels),
         'Produit en septembre, facturé en octobre.', SOLEIL),
        ('Profils facturés', len(C), None, '%d clients' % len(clients),
         'Actifs du mois, départs de septembre compris.', ROSE),
    ])

    f.section('Santé du portefeuille client')
    agg = defaultdict(lambda: {'ca': 0.0, 'a': 0.0, 'p': 0.0, 'n': 0})
    for x in C:
        g = agg[x['client']]
        g['ca'] += x['ca']
        g['a'] += x['achat']
        g['p'] += x['plein']
        g['n'] += 1
    rang = sorted(agg.items(), key=lambda kv: -kv[1]['ca'])

    f.carte('CA et marge brute par client',
            'Trié par CA décroissant.')
    f.entete([('Client', 30), ('Profils', 8), ('CA facturable', 14), ('Part du CA', 11),
              ("Prix d'achat", 13), ('Marge brute', 13), ('Taux de marge', 12),
              ('CA mois plein', 14), ('Écart', 12)])
    for nom, g in rang:
        m = g['ca'] - g['a']
        f.ligne([nom, g['n'], round(g['ca'], 2), g['ca'] / ca if ca else '-',
                 round(g['a'], 2), round(m, 2), m / g['ca'] if g['ca'] else '-',
                 round(g['p'], 2), round(g['p'] - g['ca'], 2)],
                {2: EURO2, 3: PCT, 4: EURO2, 5: EURO2, 6: PCT, 7: EURO2, 8: EURO2})
    f.total(['TOTAL', len(C), round(ca, 2), 1.0, round(achat, 2), round(ca - achat, 2),
             (ca - achat) / ca if ca else '-', round(plein, 2), round(plein - ca, 2)],
            {2: EURO2, 3: PCT, 4: EURO2, 5: EURO2, 6: PCT, 7: EURO2, 8: EURO2})
    f.saut()

    f.carte('Concentration du CA',
            'Ce que le mois perdrait si les premiers clients partaient.')
    f.entete([('Tranche', 30), ('Clients', 9), ('CA facturable', 14), ('Part du CA', 11)])
    for lib, k in [('Le premier client', 1), ('Les 3 premiers', 3),
                   ('Les 5 premiers', 5), ('Les 10 premiers', 10)]:
        v = sum(g['ca'] for _, g in rang[:k])
        f.ligne([lib, min(k, len(rang)), round(v, 2), v / ca if ca else '-'],
                {2: EURO2, 3: PCT})
    f.total(['Les 37 clients', len(rang), round(ca, 2), 1.0], {2: EURO2, 3: PCT})
    f.saut()

    f.carte('Répartition du revenu par type de mission',
            'Pôle lu sur le préfixe du poste.')
    f.entete([('Pôle', 24), ('Profils', 9), ('CA facturable', 14), ('Part', 10),
              ('Revenu moyen par profil', 20)])
    ap = defaultdict(lambda: [0.0, 0])
    for x in C:
        ap[x['pole']][0] += x['ca']
        ap[x['pole']][1] += 1
    for nom, (v, n) in sorted(ap.items(), key=lambda kv: -kv[1][0]):
        f.ligne([nom, n, round(v, 2), v / ca if ca else '-', round(v / n, 2)],
                {2: EURO2, 3: PCT, 4: EURO2})
    f.saut()

    f.section('Focus client', 'source Monday')
    ca_nouv = sum(x['ca'] for x in arrivees)
    m_nouv = sum(x['ca'] - x['achat'] for x in arrivees)
    f.kpis([
        ('Nouveaux clients', len(nouveaux), None,
         'CA associé : %s €' % milliers(ca_nouv),
         '%s.' % (', '.join(nouveaux) or '-'), VERT),
        ('Missions perdues', len(departs), None,
         '%d client%s perdu%s : %s' % (len(perdus), 's' if len(perdus) > 1 else '',
                                       's' if len(perdus) > 1 else '',
                                       ', '.join(perdus) or '-'),
         'Fins de mission du mois, hors les %d campagne%s TLM renouvelée%s.'
         % (len(renouvellements), 's' if len(renouvellements) > 1 else '',
            's' if len(renouvellements) > 1 else ''), ROSE),
        ('Portefeuille de clients actifs', len(clients), None, '%d profils' % len(C),
         'Sociétés portant au moins une mission en septembre.', BLEU),
        ('Marge brute nouveaux clients', round(m_nouv, 2), EURO2,
         '%d arrivées de profil' % len(arrivees),
         'Nouveaux clients et renforts chez un client existant confondus.', VIOLET),
    ])

    f.carte('Les arrivées du mois',
            "« Facturé » est ce que la compta encaisse, « non facturé » ce qui attend octobre.")
    f.entete([('Client', 26), ('Nouveau client', 13), ('Profil', 18), ('Poste', 24),
              ('Début', 12), ('Jours', 9), ('Mensuel', 12), ('Facturé', 12),
              ('Non facturé', 12)])
    for x in sorted(arrivees, key=lambda y: y['debut']):
        f.ligne([x['client'], 'oui' if x['client'] in nouveaux else '-', x['profil'],
                 x['poste'] or '-', x['debut'].isoformat(), '%d/%d' % (x['jours'], JO),
                 round(x['plein'], 2), round(x['ca'], 2), round(x['plein'] - x['ca'], 2)],
                {6: EURO2, 7: EURO2, 8: EURO2})
    f.total(['TOTAL', '', '', '', '', '', round(sum(x['plein'] for x in arrivees), 2),
             round(ca_nouv, 2), round(sum(x['plein'] - x['ca'] for x in arrivees), 2)],
            {6: EURO2, 7: EURO2, 8: EURO2})
    f.saut()

    f.carte('Les fins de mission',
            "« Client perdu » signale les sociétés qui ne gardent aucune mission après le 30/09.")
    f.entete([('Client', 26), ('Client perdu', 12), ('Profil', 18), ('Poste', 24),
              ('Fin', 12), ('Jours faits', 11), ('Mensuel', 12), ('Facturé', 12),
              ('Récurrent perdu', 15), ('Motif', 38)])
    for x in sorted(departs, key=lambda y: y['fin']):
        f.ligne([x['client'], 'oui' if x['client'] in perdus else '-', x['profil'],
                 x['poste'] or '-', x['fin'].isoformat(), '%d/%d' % (x['jours'], JO),
                 round(x['plein'], 2), round(x['ca'], 2), round(x['plein'], 2),
                 x['motif'] or '-'], {6: EURO2, 7: EURO2, 8: EURO2})
    f.total(['TOTAL %d missions' % len(departs), '', '', '', '', '',
             round(sum(x['plein'] for x in departs), 2),
             round(sum(x['ca'] for x in departs), 2),
             round(sum(x['plein'] for x in departs), 2), ''],
            {6: EURO2, 7: EURO2, 8: EURO2})
    f.ligne(['dont clients perdus', '', '', '', '', '', '',
             '', round(sum(x['plein'] for x in departs if x['client'] in perdus), 2),
             ', '.join(perdus) or '-'], {8: EURO2}, gras=True)
    f.saut()

    # La carte qui n'existe pas dans le dashboard, et qui evite de compter une
    # campagne renouvelee comme une perte.
    f.carte('Campagnes TLM renouvelées',
            'Une campagne se vend au mois : la ligne du mois suivant existe déjà. Ce ne sont pas '
            'des pertes.')
    f.entete([('Client', 26), ('Ligne qui se termine', 20), ('Fin', 12),
              ('Ligne qui reprend', 20), ('Début', 12), ('Mensuel', 12),
              ('Facturé en septembre', 18)])
    for x in sorted(renouvellements, key=lambda y: y['fin']):
        s = suites[id(x)]
        f.ligne([x['client'], x['profil'], x['fin'].isoformat(), s['profil'],
                 s['debut'].isoformat(), round(x['plein'], 2), round(x['ca'], 2)],
                {5: EURO2, 6: EURO2})
    if not renouvellements:
        f.ligne(['Aucun renouvellement ce mois-ci', '-', '-', '-', '-', '-', '-'])
    else:
        f.total(['TOTAL %d campagne%s' % (len(renouvellements),
                                          's' if len(renouvellements) > 1 else ''),
                 '', '', '', '', round(sum(x['plein'] for x in renouvellements), 2),
                 round(sum(x['ca'] for x in renouvellements), 2)], {5: EURO2, 6: EURO2})
    f.saut()

    f.carte('Tous les profils facturés',
            "En jaune, les mois incomplets et les prix d'achat manquants.")
    f.entete([('Client', 26), ('Profil', 18), ('Statut', 10), ('Poste', 24), ('Contrat', 13),
              ('Début', 11), ('Fin', 11), ('Jours', 9), ('Mensuel', 12),
              ('CA facturable', 13), ('Achat mensuel', 13), ('Achat facturé', 13)])
    for x in sorted(C, key=lambda y: (y['client'], y['profil'])):
        lg = f.ligne([x['client'], x['profil'], x['statut'], x['poste'] or '-',
                      x['contrat'] or '-',
                      x['debut'].isoformat() if x['debut'] else '-',
                      x['fin'].isoformat() if x['fin'] else '-', '%d/%d' % (x['jours'], JO),
                      round(x['plein'], 2), round(x['ca'], 2), round(x['achat_plein'], 2),
                      round(x['achat'], 2)],
                     {8: EURO2, 9: EURO2, 10: EURO2, 11: EURO2})
        if x['jours'] < JO:
            f.ws.cell(row=lg, column=8).fill = PatternFill('solid', fgColor=SOLEIL)
        if x['achat_plein'] == 0 and x['plein'] > 0:
            f.ws.cell(row=lg, column=11).fill = PatternFill('solid', fgColor=SOLEIL)
    f.total(['TOTAL', len(C), '', '', '', '', '', '', round(plein, 2), round(ca, 2),
             round(achat_plein, 2), round(achat, 2)],
            {8: EURO2, 9: EURO2, 10: EURO2, 11: EURO2})
    f.saut()

    f.carte('À vérifier')
    f.entete([('Point', 34), ('Nombre', 9), ('Détail', 80)])
    f.ligne(["Prix d'achat manquant", len(sans_achat),
             ', '.join('%s / %s' % (x['client'], x['profil']) for x in sans_achat) or '-'])
    f.ligne(['Mois incomplet', len(partiels),
             '%s € produits en septembre qui tomberont sur la facture d\'octobre.'
             % milliers(plein - ca)])
    f.ligne(['Départ sans motif', len([x for x in departs if not x['motif']]),
             ', '.join('%s / %s' % (x['client'], x['profil'])
                       for x in departs if not x['motif']) or '-'])
    # La trace de l'arbitrage du 09/10 : sans elle, personne ne pourra savoir
    # dans trois mois pourquoi la feuille retient 85 profils et pas 78.
    ecartes = [x for x in TOUS if (x['statut'] not in ('Actif', 'TLM'))
               and not (x['fin'] and x['fin'] >= DEB)
               and x['plein'] > 0
               and (x['debut'] is None or x['debut'] <= FIN)
               and x['statut'].upper().replace('-', '').replace(' ', '') == 'STANDBY']
    if ecartes:
        f.ligne(['Lignes en stand-by', len(ecartes),
                 'Non facturées, donc hors du mois. À confirmer si la prestation a repris : %s.'
                 % ', '.join('%s / %s, %s €'
                             % (x['client'], x['profil'], milliers(x['plein']))
                             for x in ecartes)])
    arretes = [x for x in C if x['statut'] not in ('Actif', 'TLM')]
    f.ligne(['Profils en « Arrêt » conservés', len(arretes),
             'Facturés une partie du mois, pour %s €. Les écarter ramènerait le CA à %s € '
             'sur %d profils, et ferait disparaître %s. Il s\'agit de : %s.'
             % (milliers(sum(x['ca'] for x in arretes)),
                milliers(ca - sum(x['ca'] for x in arretes)),
                len(C) - len(arretes),
                ', '.join(perdus) or '-',
                ', '.join('%s / %s' % (x['client'], x['profil']) for x in arretes))])
    f.ws.freeze_panes = 'A4'
    return dict(ca=ca, plein=plein, achat=achat, clients=clients, arrivees=arrivees,
                departs=departs, nouveaux=nouveaux, profils=len(C),
                renouvellements=renouvellements, perdus=perdus)


def feuille_leads(g, L):
    # UNE SEULE COHORTE, decision du 09/10 : les clients qu'on a pris en
    # rendez-vous ce mois-ci, et ce que ces rendez-vous ont donne. La lecture
    # « cohorte demarrage » du dashboard est abandonnee ici, et elle etait de
    # toute facon fragile : sur 2 des 3 affaires signees, la date de demarrage
    # souhaitee PRECEDE la date du rendez-vous de plus de six mois.
    cohorte = [x for x in L if x['rdv_periode']]
    gagnes = [x for x in cohorte if categorie(x['etat']) == 'Gagne']
    perdus = [x for x in cohorte if categorie(x['etat']) == 'Perdu']
    standby = [x for x in cohorte if categorie(x['etat']) == 'Stand-by']
    actifs = [x for x in cohorte if categorie(x['etat']) == 'En cours']
    denom = len(cohorte)
    pipeline = sum(x['vente'] for x in actifs)
    fort = sum(x['vente'] * x['proba'] / 100 for x in actifs if x['proba'] >= 75)
    modere = sum(x['vente'] * x['proba'] / 100 for x in actifs if 30 <= x['proba'] < 75)
    faible = sum(x['vente'] * x['proba'] / 100 for x in actifs if 1 <= x['proba'] < 30)
    pondere = fort + modere

    g.bandeau(
        'Leads et prospects, septembre 2026',
        "Export Monday du 9 octobre. Une seule question : quels clients avons-nous rencontrés "
        "en septembre, et où en est chacun aujourd'hui. Une affaire appartient donc au mois de "
        "son rendez-vous.")

    g.section('Vue consolidée', 'source Monday')
    g.kpis([
        ('Pipeline total', round(pipeline, 2), EURO2, '%d affaires en cours' % len(actifs),
         'Attention : %s de ces %d affaires porte%s un montant.'
         % ('une seule' if sum(1 for x in actifs if x['vente'] > 0) == 1
            else str(sum(1 for x in actifs if x['vente'] > 0)), len(actifs),
            '' if sum(1 for x in actifs if x['vente'] > 0) == 1 else 'nt'), VIOLET),
        ('Pipeline pondéré', round(pondere, 2), EURO2, 'Seuil de 30 % de probabilité',
         'Montant multiplié par la probabilité. Sans montant saisi, une affaire pèse zéro.',
         VIOLET),
        ('Taux de signature', len(gagnes) / denom if denom else 0, PCT,
         '%d signés sur %d rendez-vous' % (len(gagnes), denom),
         'Les affaires encore ouvertes comptent au dénominateur : le taux ne peut que monter.',
         SOLEIL),
        ('Contrats signés', len(gagnes), None,
         'Récurrent associé : %s €' % milliers(sum(x['vente'] for x in gagnes)),
         '%s.' % (', '.join(x['nom'] for x in gagnes) or '-'), VERT),
    ])

    g.carte("Les rendez-vous de septembre et ce qu'ils ont donné",
            'Un rendez-vous, un client. État au 9 octobre, soit entre 9 et 38 jours après.')
    g.entete([('', 38), ('Clients', 10), ('Part', 10), ('Récurrent mensuel', 17),
              ('Lesquels', 62)])
    g.ligne(['Clients pris en rendez-vous', len(cohorte), 1.0,
             round(sum(x['vente'] for x in cohorte), 2),
             '%d sociétés distinctes, aucun doublon' % len({x['nom'] for x in cohorte})],
            {2: PCT, 3: EURO2}, gras=True, teinte=SABLE)
    g.ligne(['dont contrats signés', len(gagnes), len(gagnes) / len(cohorte) if cohorte else '-',
             round(sum(x['vente'] for x in gagnes), 2),
             ', '.join('%s, %s €' % (x['nom'], milliers(x['vente'])) for x in gagnes) or '-'],
            {2: PCT, 3: EURO2}, teinte=VERT)
    g.ligne(['dont affaires arrêtées', len(perdus), len(perdus) / len(cohorte) if cohorte else '-',
             round(sum(x['vente'] for x in perdus), 2),
             ', '.join('%s, %s' % (x['nom'], (x['motif'] or 'sans motif').lower())
                       for x in perdus) or '-'],
            {2: PCT, 3: EURO2}, teinte=SOLEIL)
    g.ligne(['dont encore ouvertes', len(actifs), len(actifs) / len(cohorte) if cohorte else '-',
             round(sum(x['vente'] for x in actifs), 2),
             '%d au point de cadrage, %d en relance, %d en recherche de profil.'
             % (sum(1 for x in actifs if cle(x['etat']) == 'point de cadrage'),
                sum(1 for x in actifs if 'relance' in cle(x['etat'])),
                sum(1 for x in actifs if cle(x['etat']) == 'recherche profil'))],
            {2: PCT, 3: EURO2})
    if standby:
        g.ligne(['dont en stand-by', len(standby), len(standby) / len(cohorte),
                 round(sum(x['vente'] for x in standby), 2),
                 ', '.join(x['nom'] for x in standby)], {2: PCT, 3: EURO2})
    g.saut()

    g.carte('Ce qui reste à jouer',
            'Les affaires ouvertes, par ancienneté du rendez-vous.')
    g.entete([('Délai depuis le rendez-vous', 30), ('Affaires ouvertes', 16), ('Part', 10),
              ('Lesquelles', 86)])
    for lib, mini, maxi in [('Moins de 15 jours', 0, 15), ('De 15 à 30 jours', 15, 31),
                            ('Plus de 30 jours', 31, 10000)]:
        dedans = [x for x in actifs if x['rdv'] and mini <= (AUJOURD - x['rdv']).days < maxi]
        g.ligne([lib, len(dedans), len(dedans) / len(actifs) if actifs else '-',
                 ', '.join(x['nom'] for x in dedans) or '-'], {2: PCT})
    g.total(['TOTAL', len(actifs), 1.0, ''], {2: PCT})
    g.saut()

    g.section('Où en sont les affaires')
    g.carte('Par étape commerciale',
            'Les %d affaires du mois. Ordre des étapes repris de Monday, pas un classement par '
            'volume.' % len(cohorte))
    g.entete([('Étape', 32), ('Affaires', 10), ('Part', 10), ('Montant cumulé', 15),
              ('Résultat', 14)])
    par_etat = Counter(x['etat'] for x in cohorte)
    montant_etat = defaultdict(float)
    for x in cohorte:
        montant_etat[x['etat']] += x['vente']
    for e in sorted(par_etat, key=lambda k: (rang_etat(k), -par_etat[k])):
        n, cat = par_etat[e], categorie(e)
        g.ligne([e, n, n / len(cohorte) if cohorte else '-', round(montant_etat[e], 2), cat],
                {2: PCT, 3: EURO2},
                teinte=VERT if cat == 'Gagne' else SOLEIL if cat == 'Perdu' else None)
    g.total(['TOTAL', len(cohorte), 1.0, round(sum(x['vente'] for x in cohorte), 2), ''],
            {2: PCT, 3: EURO2})
    g.saut()

    g.carte('Pipeline pondéré par probabilité',
            "En euros et en nombre d'affaires. Le KPI ci-dessus ne retient que les deux "
            'premières tranches.')
    g.entete([('Tranche', 22), ('Affaires', 10), ('dont avec un montant', 18), ('Montant', 13),
              ('Pondéré', 13), ('Part', 10), ('Lesquelles', 50)])
    tt = (fort + modere + faible) or 1
    for lib, mini, maxi, val in [('Forte, 75 % et plus', 75, 101, fort),
                                 ('Modérée, 30 à 74 %', 30, 75, modere),
                                 ('Faible, 1 à 29 %', 1, 30, faible)]:
        dedans = [x for x in actifs if mini <= x['proba'] < maxi]
        avec = [x for x in dedans if x['vente'] > 0]
        g.ligne([lib, len(dedans), len(avec), round(sum(x['vente'] for x in dedans), 2),
                 round(val, 2), val / tt,
                 ', '.join('%s %.0f %%' % (x['nom'], x['proba']) for x in dedans[:4])
                 + (' ...' if len(dedans) > 4 else '')],
                {3: EURO2, 4: EURO2, 5: PCT})
    zero = [x for x in actifs if x['proba'] < 1]
    g.ligne(['Sans probabilité', len(zero), sum(1 for x in zero if x['vente'] > 0),
             round(sum(x['vente'] for x in zero), 2), 0.0, 0.0,
             ', '.join(x['nom'] for x in zero)], {3: EURO2, 4: EURO2, 5: PCT})
    g.total(['TOTAL', len(actifs), sum(1 for x in actifs if x['vente'] > 0),
             round(pipeline, 2), round(tt if tt != 1 else 0, 2), 1.0, ''],
            {3: EURO2, 4: EURO2, 5: PCT})

    # L'alerte, en clair : sans elle la carte se lit comme un pipeline vide.
    sans_montant = [x for x in actifs if x['vente'] == 0]
    plus_probable = max(sans_montant, key=lambda x: x['proba']) if sans_montant else None
    avec_montant = [x for x in actifs if x['vente'] > 0]
    c = g.ws.cell(row=g.r, column=1, value=(
        '%d des %d affaires en cours ne portent aucun montant. Le pondéré ne mesure donc que '
        '%s. %sIl manque la saisie, le pipeline n\'est pas vide pour autant.'
        % (len(sans_montant), len(actifs),
           ' et '.join('%s, %.0f € à %.0f %%' % (x['nom'], x['vente'], x['proba'])
                       for x in avec_montant) or 'rien',
           ('La plus probable sans montant est %s, à %.0f %%, qui pèse donc zéro. '
            % (plus_probable['nom'], plus_probable['proba'])) if plus_probable else '')))
    c.font = Font(size=10, bold=True, color=MYRTILLE)
    c.fill = PatternFill('solid', fgColor=SOLEIL)
    c.alignment = Alignment(wrap_text=True, vertical='center')
    g.ws.merge_cells(start_row=g.r, start_column=1, end_row=g.r, end_column=7)
    g.ws.row_dimensions[g.r].height = 32
    g.r += 2

    g.section('D\'où viennent les affaires')
    g.carte('Par source de lead',
            'Les libellés sont ceux du board, sans regroupement.')
    g.entete([('Source', 28), ('Affaires', 10), ('Part', 10), ('Signées', 10),
              ('Taux de signature', 15), ('Montant', 13)])
    par_canal = Counter(x['canal'] for x in cohorte)
    for c, n in par_canal.most_common():
        dedans = [x for x in cohorte if x['canal'] == c]
        sg = sum(1 for x in dedans if categorie(x['etat']) == 'Gagne')
        g.ligne([c, n, n / len(cohorte) if cohorte else '-', sg, sg / n if n else '-',
                 round(sum(x['vente'] for x in dedans), 2)], {2: PCT, 4: PCT, 5: EURO2})
    nb_pros = sum(n for c, n in par_canal.items() if c in PROSPECTION)
    g.total(['dont prospection, commerciaux MA et Pol Envol', nb_pros,
             nb_pros / len(cohorte) if cohorte else '-', '', '', ''], {2: PCT})
    g.saut()

    g.carte('Par closer',
            'Qui porte les affaires du mois.')
    g.entete([('Closer', 22), ('Affaires', 10), ('Part', 10), ('Signées', 10), ('Arrêtées', 10),
              ('En cours', 10), ('Montant', 13)])
    for c, n in Counter(x['closer'] for x in cohorte).most_common():
        dedans = [x for x in cohorte if x['closer'] == c]
        g.ligne([c, n, n / len(cohorte) if cohorte else '-',
                 sum(1 for x in dedans if categorie(x['etat']) == 'Gagne'),
                 sum(1 for x in dedans if categorie(x['etat']) == 'Perdu'),
                 sum(1 for x in dedans if categorie(x['etat']) in ('En cours', 'Stand-by')),
                 round(sum(x['vente'] for x in dedans), 2)], {2: PCT, 6: EURO2})
    g.saut()

    g.section('Ce qui bloque')
    g.carte('Pourquoi les affaires se sont arrêtées',
            'Sur les %d affaires arrêtées du mois.' % len(perdus))
    g.entete([('Motif', 46), ('Affaires', 10), ('Lesquelles', 50)])
    mot = defaultdict(list)
    for x in perdus:
        mot[x['motif'] or '-'].append(x['nom'])
    for m, noms in sorted(mot.items(), key=lambda kv: -len(kv[1])):
        g.ligne([m, len(noms), ', '.join(noms)])
    if not mot:
        g.ligne(['Aucune affaire arrêtée ce mois-ci', 0, '-'])
    g.saut()

    g.carte('Affaires sans prochaine action',
            "Celles dont l'état ne porte aucune étape planifiée.")
    sans = [x for x in actifs if cle(x['etat']) in SANS_ACTION]
    g.entete([('Client', 30), ('État', 24), ('Closer', 14), ('Rendez-vous', 13),
              ('Jours écoulés', 13), ('Montant', 12), ('Proba', 9)])
    for x in sorted(sans, key=lambda y: y['rdv'] or FIN):
        g.ligne([x['nom'], x['etat'], x['closer'], x['rdv'].isoformat() if x['rdv'] else '-',
                 (AUJOURD - x['rdv']).days if x['rdv'] else '-',
                 round(x['vente'], 2), x['proba'] / 100], {5: EURO2, 6: PCT})
    g.total(['%d affaires' % len(sans), '', '', '', '',
             round(sum(x['vente'] for x in sans), 2), ''], {5: EURO2})
    g.saut()

    g.section('Le détail')
    g.carte('Tous les rendez-vous du mois',
            'Les %d clients rencontrés en septembre. En vert les signés, en jaune les arrêtés.'
            % len(cohorte))
    g.entete([('Client', 34), ('État', 26), ('Résultat', 12), ('Closer', 14),
              ('Source', 20), ('Rendez-vous', 13), ('Jours écoulés', 13), ('Montant', 12),
              ("Prix d'achat", 12), ('Marge', 11), ('Proba', 9), ('Profil cherché', 28),
              ('Motif', 34)])
    ordre_cat = {'Gagne': 0, 'En cours': 1, 'Stand-by': 2, 'Perdu': 3}
    for x in sorted(cohorte, key=lambda y: (ordre_cat[categorie(y['etat'])],
                                            rang_etat(y['etat']), y['nom'])):
        cat = categorie(x['etat'])
        g.ligne([x['nom'], x['etat'],
                 {'Gagne': 'Signé', 'Perdu': 'Arrêté'}.get(cat, cat), x['closer'], x['canal'],
                 x['rdv'].isoformat() if x['rdv'] else '-',
                 (AUJOURD - x['rdv']).days if x['rdv'] else '-',
                 round(x['vente'], 2), round(x['achat'], 2),
                 round(x['vente'] - x['achat'], 2), x['proba'] / 100,
                 x['profil'] or '-', x['motif'] or '-'],
                {7: EURO2, 8: EURO2, 9: EURO2, 10: PCT},
                teinte=VERT if cat == 'Gagne' else SOLEIL if cat == 'Perdu' else None)
    g.total(['TOTAL %d clients' % len(cohorte), '', '', '', '', '', '',
             round(sum(x['vente'] for x in cohorte), 2),
             round(sum(x['achat'] for x in cohorte), 2),
             round(sum(x['vente'] - x['achat'] for x in cohorte), 2), '', '', ''],
            {7: EURO2, 8: EURO2, 9: EURO2})
    g.ws.freeze_panes = 'A4'
    return dict(cohorte=cohorte, gagnes=gagnes, perdus=perdus, standby=standby,
                actifs=actifs, denom=denom, pipeline=pipeline, pondere=pondere,
                fort=fort, modere=modere, faible=faible, lignes=len(L))


def main():
    if len(sys.argv) < 3:
        sys.exit('usage : python scripts/indicateurs-septembre.py <comptes.xlsx> <leads.xlsx>')
    # Troisieme argument optionnel : le fichier de sortie. Excel verrouille un
    # classeur ouvert, d'ou la possibilite d'ecrire a cote sans fermer l'autre.
    cible = (sys.argv[3] if len(sys.argv) > 3
             else r'E:\Claude code\mon-ambassadeur-dashboard\Indicateurs-septembre-2026.xlsx')

    brut = lire_comptes(sys.argv[1])
    TOUS = normalise(brut)
    C = comptes_septembre(brut)
    L = lire_leads(sys.argv[2])

    wb = Workbook()
    wb.active.title = 'Comptes'
    rc = feuille_comptes(Feuille(wb.active), C, TOUS)
    rl = feuille_leads(Feuille(wb.create_sheet('Lead Prospect')), L)
    # La troisieme feuille vit dans son propre module : elle ne calcule rien de
    # neuf, elle confronte les regles du dashboard au recalcul.
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import feuille_dashboard
    rd = feuille_dashboard.construire(
        Feuille(wb.create_sheet('Dashboard')), TOUS, C, L,
        (DEB, FIN, AUJOURD, EURO2, PCT, SABLE, SOLEIL, VERT, cle, categorie,
         milliers, renouvelee, survit, SANS_ACTION, dec))
    wb.save(cible)

    print('ecrit : %s' % cible)
    print('Comptes       : %d profils, %d clients, CA %.2f, mois plein %.2f, marge %.2f'
          % (rc['profils'], len(rc['clients']), rc['ca'], rc['plein'], rc['ca'] - rc['achat']))
    print('                %d arrivees (%d nouveaux clients), %d fins de mission, '
          '%d campagne(s) TLM renouvelee(s), %d client(s) perdu(s) : %s'
          % (len(rc['arrivees']), len(rc['nouveaux']), len(rc['departs']),
             len(rc['renouvellements']), len(rc['perdus']), ', '.join(rc['perdus']) or '-'))
    print('Lead/Prospect : %d lignes lues, %d avec un RDV en septembre'
          % (rl['lignes'], len(rl['cohorte'])))
    print('                %d gagnes, %d perdus, %d stand-by, %d en cours, win rate %.1f %%'
          % (len(rl['gagnes']), len(rl['perdus']), len(rl['standby']), len(rl['actifs']),
             100 * len(rl['gagnes']) / rl['denom'] if rl['denom'] else 0))
    print('                pipeline %.0f, pondere %.0f (fort %.0f, modere %.0f, faible %.0f)'
          % (rl['pipeline'], rl['pondere'], rl['fort'], rl['modere'], rl['faible']))
    print('Dashboard     : regle du dashboard, CA %.0f, marge %.0f, %d clients, '
          '%d fins de mission, %d deals gagnes, win rate %.1f %%'
          % (rd['ca_d'], rd['marge_d'], rd['clients_d'], rd['fins_d'], rd['gagnes_d'],
             100 * rd['win_d']))


if __name__ == '__main__':
    main()
