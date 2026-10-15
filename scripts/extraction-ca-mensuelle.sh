#!/usr/bin/env bash
# Rejoue toute la chaine CA d'un mois : extraction depuis la base, fichier
# proratise, et rapprochement avec la compta.
#
#   bash scripts/extraction-ca-mensuelle.sh 2026-09
#
# A relancer apres chaque extraction Monday (quotidienne a 21h, ou a la demande
# depuis le menu profil). La base ne bouge QUE lors de cette extraction : tant
# qu'elle n'a pas tourne, une modification faite dans Monday est invisible ici.
#
# Prerequis : le fichier compta exporte en xlsx, chemin en 2e argument
# (defaut : C:/Users/HP/OneDrive/Documents/compta.xlsx).
set -euo pipefail

MOIS="${1:-2026-09}"
COMPTA="${2:-C:/Users/HP/OneDrive/Documents/compta.xlsx}"
RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRAVAIL="${RACINE}/.extraction-ca"

DEBUT="${MOIS}-01"
SUIVANT="$(python -c "
import datetime
d = datetime.date.fromisoformat('${DEBUT}')
print((d.replace(day=28) + datetime.timedelta(days=4)).replace(day=1).isoformat())
")"
FIN="$(python -c "
import datetime
print((datetime.date.fromisoformat('${SUIVANT}') - datetime.timedelta(days=1)).isoformat())
")"
NB_JOURS="$(python -c "
import datetime
print((datetime.date.fromisoformat('${SUIVANT}') - datetime.date.fromisoformat('${DEBUT}')).days)
")"

mkdir -p "${TRAVAIL}"
echo "mois ${MOIS} : du ${DEBUT} au ${FIN} (${NB_JOURS} jours)"

# --- 1. fraicheur de la replication ------------------------------------------
echo
echo "--- fraicheur de la base ---"
( cd "${RACINE}/server" && node scripts/q.mjs "
select 'profils' t, max(valid_from) derniere_extraction from profils_history where compte_id not like 'legacy:%'
union all select 'comptes', max(valid_from) from comptes_history where compte_id not like 'legacy:%'" )

# --- 2. extraction, regle du support (finance.sql) ---------------------------
# Un profil compte s'il est Actif ou TLM, OU BIEN s'il s'est arrete pendant le
# mois, a condition d'avoir demarre avant la fin du mois et de ne pas s'etre
# arrete avant son debut. Point dans le temps au 1er du mois suivant, Paris.
echo
echo "--- extraction ---"
( cd "${RACINE}/server" && node scripts/q.mjs --json "
WITH mois AS (SELECT '${DEBUT}'::date debut,'${SUIVANT}'::date suivant,'${FIN}'::date fin_mois,${NB_JOURS} nb_jours,(('${SUIVANT}'::timestamp) AT TIME ZONE 'Europe/Paris') borne),
lignes AS (
SELECT c.nom client, p.nom prenom, p.poste, p.statut, p.date_integration, p.date_fin,
 split_part(coalesce(nullif(p.poste,''),''),' -',1) prefixe,
 nullif(btrim(substr(coalesce(p.poste,''), length(split_part(coalesce(p.poste,''),' -',1))+2)), '') fonction,
 coalesce(p.vente_reel,p.vente_mensuel,0)::numeric ca,
 coalesce(p.achat_reel,p.achat_mensuel,0)::numeric achat,
 (p.vente_reel IS NOT NULL) montant_reel,
 (p.statut IN ('Actif','TLM') OR (p.date_fin>=m.debut AND p.date_fin<m.suivant))
 AND (coalesce(p.date_integration,c.date_demarrage) IS NULL OR coalesce(p.date_integration,c.date_demarrage)<m.suivant)
 AND (p.date_fin IS NULL OR p.date_fin>=m.debut) eligible,
 m.debut, m.fin_mois, m.nb_jours
FROM mois m
JOIN comptes_history c ON c.valid_from<m.borne AND (c.valid_to IS NULL OR c.valid_to>=m.borne) AND c.compte_id NOT LIKE 'legacy:%'
JOIN profils_history p ON p.compte_id=c.compte_id AND p.valid_from<m.borne AND (p.valid_to IS NULL OR p.valid_to>=m.borne))
SELECT prenom, date_integration::text debut, date_fin::text fin, prefixe, fonction, statut, client,
 ca::float ca, achat::float achat, montant_reel,
 (date_part('year',age(least(coalesce(date_fin,fin_mois),fin_mois),date_integration))*12
  + date_part('month',age(least(coalesce(date_fin,fin_mois),fin_mois),date_integration)))::int anciennete_mois,
 (least(coalesce(date_fin, fin_mois), fin_mois) - debut + 1)::int jours_fin,
 (least(coalesce(date_fin, fin_mois), fin_mois) - greatest(coalesce(date_integration, debut), debut) + 1)::int jours_deux,
 nb_jours::int nb_jours
FROM lignes WHERE eligible ORDER BY client, prenom" ) > "${TRAVAIL}/extraction.json"

python - "${TRAVAIL}/extraction.json" "${NB_JOURS}" <<'PY'
import io, json, sys
d = json.load(io.open(sys.argv[1], encoding='utf-8'))
n = int(sys.argv[2])
def t(cle):
    ca = sum(x['ca'] * min(max(x[cle], 0), n) / n for x in d)
    ac = sum(x['achat'] * min(max(x[cle], 0), n) / n for x in d)
    return ca, ac
print('  %d lignes, %d clients' % (len(d), len({x['client'] for x in d})))
print('  mois plein         CA %9.2f  marge %9.2f' % (
    sum(x['ca'] for x in d), sum(x['ca'] - x['achat'] for x in d)))
for lib, cle in (('prorata fin       ', 'jours_fin'), ('prorata debut+fin ', 'jours_deux')):
    ca, ac = t(cle)
    print('  %s CA %9.2f  marge %9.2f' % (lib, ca, ac and ca - ac))
sans = sum(1 for x in d if x['achat'] == 0 and x['ca'] > 0)
reels = sum(1 for x in d if x['montant_reel'])
print('  profils sans achat saisi : %d | avec un montant REEL dans Monday : %d' % (sans, reels))
PY

echo
echo "fichier de travail : ${TRAVAIL}/extraction.json"
echo "compta attendue    : ${COMPTA}"
echo
echo "Il reste a regenerer les classeurs (export et rapprochement) a partir de ce JSON."
