import { useState } from 'react';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import KPICard from '../../../components/ui/KPICard';
import Pill from '../../../components/ui/Pill';
import Loader from '../../../components/ui/Loader';
import { cloudtalk } from '../../../services/api';
import { parseCloudTalkPaste } from '../../../lib/cloudtalk/parseCloudTalk';
import { INDICATOR_ORDER, FORMULAIRE_ROWS, buildOrderedValues } from '../../../lib/cloudtalk/indicators';
import styles from './CloudTalkExtract.module.css';

function todayISO(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  return d.toISOString().slice(0, 10);
}

function fmtDateFR(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function clientLabel(prefix) {
  return prefix.replace(/-$/, '');
}

function sumIndicator(result, prefixes, key) {
  return prefixes.reduce((acc, p) => {
    const v = result.results[p] ? result.results[p][key] : 0;
    return acc + (Number(v) || 0);
  }, 0);
}

function ConsolidatedKPIs({ result }) {
  const prefixes = result.prefixes || [];
  const totalAppels = sumIndicator(result, prefixes, 'Appels émis');
  const totalDecroches = sumIndicator(result, prefixes, 'Leads décrochés');
  const totalRdv = sumIndicator(result, prefixes, 'RDVs Bookés TLM') + sumIndicator(result, prefixes, 'RDVs Bookés Telepro');
  const totalFiches = sumIndicator(result, prefixes, 'Fiches complétées');

  // Toutes les KPICard au même style par défaut — ne jamais combiner
  // color="accent" et variant="accent-soft" sur une même carte (bug déjà
  // rencontré : les deux classes CSS se superposent et le texte devient illisible).
  return (
    <div className={styles.kpiGrid}>
      <KPICard label="Appels émis" value={totalAppels} trend={{ dir: 'neutral', text: `${prefixes.length} client(s) calculé(s)` }} />
      <KPICard label="Leads décrochés" value={totalDecroches} />
      <KPICard label="RDVs bookés" value={totalRdv} trend={{ dir: totalRdv > 0 ? 'up' : 'neutral', text: 'TLM + Telepro' }} />
      <KPICard label="Fiches complétées" value={totalFiches} />
    </div>
  );
}

function DetailTable({ result }) {
  const prefixes = result.prefixes || [];
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thLabel}>Indicateur</th>
            {prefixes.map((p) => (
              <th key={p} className={styles.th}>{clientLabel(p)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INDICATOR_ORDER.map((ind) => {
            const isForm = FORMULAIRE_ROWS.includes(ind);
            return (
              <tr key={ind} className={isForm ? styles.rowFormulaire : ''}>
                <td className={styles.tdLabel}>{ind}</td>
                {prefixes.map((p) => (
                  <td key={p} className={styles.td}>{result.results[p] ? result.results[p][ind] : ''}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RdvTable({ rdvList }) {
  const [expanded, setExpanded] = useState(false);
  if (!rdvList || rdvList.length === 0) return null;
  return (
    <>
      <SectionLabel>RDV pris ({rdvList.length})</SectionLabel>
      <Card>
        <button onClick={() => setExpanded((e) => !e)} className={styles.toggleBtn} type="button">
          {expanded ? 'Masquer la liste' : `Afficher la liste complète (${rdvList.length})`}
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {expanded && (
          <div className={styles.tableWrap} style={{ marginTop: 14 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {['Contact', 'Client', 'Agent', 'Enregistrement'].map((h) => (
                    <th key={h} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rdvList.map((r, i) => (
                  <tr key={i}>
                    <td className={styles.td}>{r.contact}</td>
                    <td className={styles.td}>{clientLabel(r.client)}</td>
                    <td className={styles.td}>{r.agent}</td>
                    <td className={styles.td}>
                      {r.recording ? (
                        <a href={r.recording} target="_blank" rel="noreferrer" className={styles.recordingLink}>▶ Écouter</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function WriteSection({ result }) {
  const prefixes = result.prefixes || [];
  const [selected, setSelected] = useState({});
  const [columns, setColumns] = useState({});
  const [chosenColumn, setChosenColumn] = useState({});
  const [loadingColumns, setLoadingColumns] = useState({});
  const [writeStatus, setWriteStatus] = useState({});
  const [writing, setWriting] = useState(false);

  async function toggle(client) {
    const next = !selected[client];
    setSelected((s) => ({ ...s, [client]: next }));
    if (next && !columns[client]) {
      setLoadingColumns((s) => ({ ...s, [client]: true }));
      const { ok, data } = await cloudtalk.colonnes(client);
      const cols = ok ? data.columns || [] : [];
      setColumns((s) => ({ ...s, [client]: cols }));
      if (cols.length) setChosenColumn((s) => ({ ...s, [client]: cols[cols.length - 1].column }));
      setLoadingColumns((s) => ({ ...s, [client]: false }));
    }
  }

  async function onWrite() {
    setWriting(true);
    const targets = prefixes.filter((p) => selected[p]);
    const status = {};
    for (const client of targets) {
      const column = chosenColumn[client];
      if (!column) {
        status[client] = { ok: false, message: 'Aucune colonne choisie' };
        continue;
      }
      const { ok, data } = await cloudtalk.ecrire(client, column, buildOrderedValues(result.results[client]));
      status[client] = ok ? { ok: true, message: 'Écrit avec succès' } : { ok: false, message: data.error || 'Erreur' };
    }
    setWriteStatus(status);
    setWriting(false);
  }

  const anySelected = prefixes.some((p) => selected[p]);

  return (
    <>
      <SectionLabel>Écrire dans les Google Sheets clients</SectionLabel>
      <Card>
        <div className={styles.writeList}>
          {prefixes.map((client) => (
            <div key={client} className={styles.writeRow}>
              <input
                type="checkbox"
                checked={!!selected[client]}
                onChange={() => toggle(client)}
                className={styles.checkbox}
              />
              <span className={styles.writeClientName}>{clientLabel(client)}</span>

              {selected[client] ? (
                loadingColumns[client] ? (
                  <span className={styles.writeHint}>Chargement des colonnes…</span>
                ) : columns[client] && columns[client].length ? (
                  <select
                    value={chosenColumn[client] || ''}
                    onChange={(e) => setChosenColumn((s) => ({ ...s, [client]: e.target.value }))}
                    className={styles.select}
                  >
                    {columns[client].map((c) => (
                      <option key={c.column} value={c.column}>{c.label} ({c.column})</option>
                    ))}
                  </select>
                ) : (
                  <Pill variant="red">Aucune colonne trouvée</Pill>
                )
              ) : null}

              {writeStatus[client] && (
                <Pill variant={writeStatus[client].ok ? 'green' : 'red'}>
                  {writeStatus[client].ok ? '✓ ' : '✗ '}{writeStatus[client].message}
                </Pill>
              )}
            </div>
          ))}
        </div>
        <button onClick={onWrite} disabled={!anySelected || writing} className={styles.writeBtn}>
          {writing ? 'Écriture en cours…' : 'Écrire les clients sélectionnés'}
        </button>
      </Card>
    </>
  );
}

function FormCard({ dateFrom, setDateFrom, dateTo, setDateTo, pasteText, setPasteText, parsedEntries, error, onLancer }) {
  return (
    <Card>
      <div className={styles.dateRow}>
        <div className={styles.dateField}>
          <label className={styles.fieldLabel}>Du</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={styles.dateInput} />
        </div>
        <div className={styles.dateField}>
          <label className={styles.fieldLabel}>Au</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={styles.dateInput} />
        </div>
      </div>

      <label className={styles.fieldLabel}>
        Coller ici le tableau « Campaigns » de CloudTalk (Name, Contacts remaining…) — colle chaque page à la suite
      </label>
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        rows={10}
        placeholder="Colle ici directement depuis la page Dialer > Campaigns de CloudTalk (Ctrl+A puis Ctrl+C sur le tableau, pour chaque page)"
        className={styles.textarea}
      />
      <div className={styles.parseCount}>
        {parsedEntries.length} campagne(s) détectée(s)
        {parsedEntries.length > 0 ? ' — ' + parsedEntries.slice(0, 3).map((e) => e.name).join(', ') + (parsedEntries.length > 3 ? '…' : '') : ''}
      </div>

      {error && <div className={styles.formError}>{error}</div>}

      <button onClick={onLancer} className={styles.launchBtn}>Lancer le calcul</button>
    </Card>
  );
}

export default function CloudTalkExtract({ onClose }) {
  const [step, setStep] = useState('form');
  const [dateFrom, setDateFrom] = useState(todayISO(-6));
  const [dateTo, setDateTo] = useState(todayISO(0));
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const parsedEntries = parseCloudTalkPaste(pasteText);

  async function onLancer() {
    setError('');
    setStep('loading');
    const { ok, data } = await cloudtalk.calculer({
      date_from: dateFrom,
      date_to: dateTo,
      leadsRestantsParCampagne: parsedEntries.map((e) => ({ name: e.name, remaining: e.remaining })),
    });
    if (!ok) {
      setError(data.error || 'Erreur lors du calcul');
      setStep('form');
      return;
    }
    setResult(data);
    setStep('results');
  }

  function onQuitter() {
    setResult(null);
    setStep('form');
  }

  const subtitle = step === 'results'
    ? `Période du ${fmtDateFR(dateFrom)} au ${fmtDateFR(dateTo)}`
    : 'Sélectionnez une période, injectez les leads restants CloudTalk, puis lancez le calcul des indicateurs.';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Reporting CloudTalk">
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerTitleBlock}>
            <h2 className={styles.headerTitle}>Reporting <em className={styles.headerTitleEm}>CloudTalk</em>.</h2>
            <p className={styles.headerSubtitle}>{subtitle}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Fermer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {step === 'form' && (
            <FormCard
              dateFrom={dateFrom} setDateFrom={setDateFrom}
              dateTo={dateTo} setDateTo={setDateTo}
              pasteText={pasteText} setPasteText={setPasteText}
              parsedEntries={parsedEntries}
              error={error}
              onLancer={onLancer}
            />
          )}

          {step === 'loading' && (
            <Loader loading label="Récupération des appels CloudTalk, des campagnes et des formulaires clients — ça peut prendre une minute." minHeight={220} />
          )}

          {step === 'results' && result && (
            <div className={styles.page}>
              <SectionLabel badge="Toutes campagnes">Vue consolidée</SectionLabel>
              <ConsolidatedKPIs result={result} />

              <SectionLabel>Détail par client</SectionLabel>
              <Card>
                <DetailTable result={result} />
              </Card>

              <RdvTable rdvList={result.rdvList} />

              <WriteSection result={result} />

              <div className={styles.backRow}>
                <button onClick={onQuitter} className={styles.backBtn}>← Nouveau calcul</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
