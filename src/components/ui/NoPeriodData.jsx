/* État "connecté mais rien à afficher sur cette période" — distinct de
   NotConnected (qui signale l'ABSENCE structurelle de source de données
   pour une métrique donnée, ex. "Clients perdus — aucun suivi côté
   Monday"). Ici la source existe et fonctionne, la période choisie n'a
   simplement aucune ligne (ex. mois en cours tout juste commencé) — le
   dire clairement évite de laisser croire à une panne. */
export default function NoPeriodData({ suggestion = 'Essayez une autre période — le mois précédent, par exemple.' }) {
  return (
    <div style={{ textAlign: 'center', padding: '44px 20px' }}>
      <div style={{ fontWeight: 700, color: 'var(--myrtille)', fontSize: 14, marginBottom: 6 }}>
        Aucune donnée sur cette période
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text3)', maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
        {suggestion}
      </div>
    </div>
  );
}
