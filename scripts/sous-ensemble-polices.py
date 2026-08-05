"""Réduit les polices aux caractères dont l'interface a réellement besoin.

Les fichiers livrés par la fonderie couvrent 1010 glyphes (cyrillique, grec,
latin étendu complet) pour une interface entièrement en français. Chaque
graisse pesait ~61 Ko, et une page en charge trois ou quatre : les polices
étaient devenues le premier poste de transfert, devant le JavaScript.

Les plages retenues ci-dessous couvrent le français, les noms de clients
européens (latin étendu A), la ponctuation typographique et les quelques
symboles que l'interface affiche en dur. Un caractère hors plage n'est pas
perdu : le navigateur le rend avec la police système, en dégradé propre.

Convertit aussi InstrumentSerif de TTF en WOFF2 — un TTF n'est pas compressé,
c'est un format de bureau qui n'a rien à faire sur le web.

Idempotent : réappliqué sur des fichiers déjà réduits, il produit le même
résultat. Usage : pip install fonttools brotli && python scripts/sous-ensemble-polices.py
"""
from fontTools import subset
from pathlib import Path

# U+2265 (≥) sert dans « BONS APPELS (≥ 5 MIN) », U+2715 (✕) ferme le
# calendrier, U+20AC (€) est partout : ces symboles isolés doivent être
# listés explicitement, ils ne sont dans aucune plage latine.
PLAGES = ','.join([
    'U+0020-007E',   # latin de base
    'U+00A0-00FF',   # accents français, °, «»
    'U+0100-017F',   # latin étendu A (noms européens)
    'U+2000-206F',   # ponctuation typographique : ’ — … ‹ › •
    'U+20A0-20BF',   # devises, dont €
    'U+2190-21FF',   # flèches
    'U+2212,U+2248,U+2260,U+2264,U+2265',  # − ≈ ≠ ≤ ≥
    'U+2713,U+2715,U+2717',                # ✓ ✕ ✗
    'U+25AA,U+25CF',                       # puces pleines
])

DOSSIER = Path(__file__).resolve().parent.parent / 'src' / 'assets' / 'fonts'


def reduire(chemin: Path) -> None:
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = '*'   # conserve kerning et ligatures
    options.notdef_outline = True

    police = subset.load_font(str(chemin), options)
    decoupeur = subset.Subsetter(options)
    decoupeur.populate(unicodes=subset.parse_unicodes(PLAGES))
    decoupeur.subset(police)

    sortie = chemin.with_suffix('.woff2')
    avant = chemin.stat().st_size
    police.save(str(sortie))
    apres = sortie.stat().st_size
    # Sous Windows, le fichier source reste verrouillé tant que l'objet police
    # le tient ouvert : sans ce close(), la suppression du TTF échoue.
    police.close()

    # Le TTF d'origine n'a plus de raison d'être une fois le WOFF2 écrit.
    if chemin.suffix == '.ttf':
        chemin.unlink()

    print(f'{chemin.name:38} {avant / 1024:6.1f} -> {apres / 1024:5.1f} Ko'
          f'  (-{100 * (1 - apres / avant):.0f} %)')


if __name__ == '__main__':
    fichiers = sorted(f for f in DOSSIER.iterdir() if f.suffix in ('.ttf', '.woff2'))
    if not fichiers:
        raise SystemExit(f'Aucune police trouvée dans {DOSSIER}')
    for f in fichiers:
        reduire(f)
