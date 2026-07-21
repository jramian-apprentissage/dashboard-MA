/* Remplace une donnée fabriquée par un état honnête : "pas encore de source
   réelle" est différent d'une erreur de chargement (qui a son propre
   affichage, voir Loader/messages d'erreur des hooks). À utiliser tant
   qu'aucune source de données n'existe pour la métrique concernée. */

// Props KPICard pour une métrique sans source de données.
export function notConnectedKPI(label, raison, color = 'default') {
  return {
    label,
    value: '—',
    unit: '',
    trend: { dir: 'neutral', text: `Non connecté — ${raison}` },
    color,
  };
}

// Bloc pour un corps de Card, une table ou une section entière.
export default function NotConnected({ children, compact = false }) {
  return (
    <div
      style={{
        color: 'var(--text3)',
        fontSize: 12,
        padding: compact ? '8px 0' : '20px 0',
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontWeight: 600, color: 'var(--warn)' }}>Non connecté</span>
      {children ? <> — {children}</> : null}
    </div>
  );
}
