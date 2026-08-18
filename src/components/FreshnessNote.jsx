/* Mention de fraîcheur des données, discrète, en bas de page.
 *
 * Remplace l'ancienne bannière verte affichée en HAUT de chaque dashboard
 * (demande de Jimmy) : la fraîcheur est une méta-information, pas un titre —
 * elle se lit en fin de page, en petit et estompée, sans capter le regard
 * avant les chiffres.
 *
 * `source` : libellé de la source (« Données Monday CRM », « Données Ringover »…).
 * `date`   : dernière mise à jour, déjà formatée par l'appelant (chaque page a
 *            sa propre fonction de date). `loading` : rafraîchissement en cours. */
export default function FreshnessNote({ source, date, loading }) {
  return (
    <div
      style={{
        marginTop: 24,
        paddingTop: 12,
        borderTop: '1px solid rgba(127,127,127,0.12)',
        fontSize: 11,
        opacity: 0.5,
        textAlign: 'center',
      }}
    >
      <span style={{ color: 'var(--pos)' }}>●</span> {source} — mise à jour arrêtée au {date || '—'}
      {loading ? ' · rafraîchissement…' : ''}
    </div>
  );
}
