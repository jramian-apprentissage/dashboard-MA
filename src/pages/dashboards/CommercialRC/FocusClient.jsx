import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import NotConnected, { notConnectedKPI } from '../../../components/ui/NotConnected';
import styles from './FocusClient.module.css';

const fmtEuros = v => {
  if (!v) return '0 €';
  if (v >= 1000) return `${(v / 1000).toFixed(0)} K€`;
  return `${v} €`;
};

export default function FocusClient() {
  const mounted = useChartMount();
  const { result, loading, error } = useSnapshotData();

  return (
    <div className={styles.page}>

      {/* ══ Ligne 1 — Le solde net du portefeuille : entrées vs sorties ══ */}
      <SectionLabel badge="Monday CRM — données réelles">Le solde net — entrées & sorties du portefeuille</SectionLabel>
      <Loader loading={loading} label="Chargement des données CRM…" size={44} minHeight={110} />
      {error && (
        <div style={{ padding: '20px 0', color: 'var(--neg)', fontSize: 13 }}>Erreur de chargement : {error}</div>
      )}
      {result && (
        <div className={styles.newClientsGrid}>
          <KPICard
            label="Nouveaux clients (période)"
            value={result.nbDealsGagnes}
            unit=" clients"
            trend={{ dir: result.nbDealsGagnes > 0 ? 'up' : 'neutral', text: `CA : ${fmtEuros(result.sommeVentesGagnes)}` }}
            color="green"
          />
          <KPICard {...notConnectedKPI('Clients perdus (période)', 'aucun suivi des départs de clients côté Monday', 'red')} />
          <KPICard
            label="Portefeuille actif"
            value={result.nbClientsActifs}
            unit=" actifs"
            trend={{ dir: 'neutral', text: `sur ${result.nbClientsTotal} comptes au total` }}
            color="blue"
          />
          <KPICard
            label="Marge brute nouveaux"
            value={fmtEuros(result.margeBruteNouveaux)}
            trend={{
              dir: result.margeBruteNouveaux >= 0 ? 'up' : 'down',
              text: result.sommeVentesGagnes > 0
                ? `Taux : ${Math.round(result.margeBruteNouveaux / result.sommeVentesGagnes * 100)}%`
                : '—',
            }}
            color={result.margeBruteNouveaux >= 0 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* ══ Ligne 2 — La valeur : qui rapporte quoi ══ */}
      <SectionLabel>La valeur — classement clients</SectionLabel>
      <div className={styles.col6040}>
        <Card title="CA par client">
          {result?.topClients?.length > 0 ? (
            <table className={styles.tbl}>
              <thead><tr><th>#</th><th>Client</th><th>CA</th><th>Part</th></tr></thead>
              <tbody>
                {result.topClients.map((c, i) => (
                  <tr key={c.name}>
                    <td className={styles.rank} style={{ color: i === 0 ? 'var(--myrtille)' : 'var(--text2)' }}>{i + 1}</td>
                    <td className={styles.tdName}>{c.name}</td>
                    <td className={styles.tdRight} style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtEuros(c.ca)}</td>
                    <td>
                      <div className={styles.miniBarWrap}>
                        <div className={styles.miniBar}>
                          <div
                            className={styles.miniFill}
                            style={{
                              width: mounted ? `${c.pct}%` : '0%',
                              transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
                            }}
                          />
                        </div>
                        <span>{c.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <NotConnected>aucun client actif sur la période</NotConnected>
          )}
          <div className={styles.subnote}>Top 5 clients par CA — secteur et évolution non disponibles (à connecter)</div>
        </Card>

        <Card title="Marge brute par client">
          <NotConnected>l'API ne renvoie pas encore la marge par client (seulement le CA global et par top client)</NotConnected>
        </Card>
      </div>

      {/* ══ Ligne 3 — La santé : où on va, ce que ça a déjà coûté ══ */}
      <SectionLabel badge="IA — colonne Monday à créer">La santé — risque actuel & pertes constatées</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="Nb de Clients par Niveau de Santé">
          <NotConnected>colonne « Score satisfaction » à créer sur le board Comptes Monday (voir prompt de scoring déjà préparé)</NotConnected>
        </Card>

        <Card title="Clients perdus — détail">
          <NotConnected>aucun suivi des départs de clients côté Monday — nécessite un statut/date de fin de contrat compte</NotConnected>
        </Card>
      </div>

      <Card title="Revenue perdu — évolution mensuelle">
        <NotConnected>dépend du suivi des départs de clients ci-dessus</NotConnected>
      </Card>

      {/* ══ Ligne 4 — Le détail santé client par client ══ */}
      <Card title="Détails du niveau de Santé par Client">
        <NotConnected>dépend de la colonne « Score satisfaction » Monday (justificatif généré à partir des échanges et e-mails historisés)</NotConnected>
      </Card>

      {/* ══ Ligne 5 — Pilotage interne : qui génère la marge, indépendant du churn ══ */}
      <SectionLabel>Pilotage interne — marge par collaborateur</SectionLabel>
      <Card title="Classement collaborateurs — marge générée">
        <NotConnected>aucune répartition de la marge par collaborateur commercial n'est encore calculée côté API</NotConnected>
      </Card>

    </div>
  );
}
