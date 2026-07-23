import { useEffect, useRef, useState } from 'react';
import PeriodPicker from '../ui/PeriodPicker';
import { usePeriod } from '../../contexts/PeriodContext';
import { useExtraFilters } from '../../contexts/ExtraFiltersContext';
import defaultHeroBg from '../../assets/bg.svg';
import styles from './DashboardLayout.module.css';

const PERIOD_LABELS = {
  today:          "d'aujourd'hui",
  yesterday:      "d'hier",
  month:          "du mois en cours",
  'last-month':   "du mois précédent",
  week:           "de la semaine en cours",
  'last-week':    "de la semaine précédente",
  quarter:        "du trimestre en cours",
  'last-quarter': "du trimestre précédent",
};

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function buildPeriodLabel(key, customFrom, customTo) {
  if (key === 'custom' && customFrom && customTo)
    return `du ${fmtDate(customFrom)} au ${fmtDate(customTo)}`;
  return PERIOD_LABELS[key] || 'de la période sélectionnée';
}

export default function DashboardLayout({
  dashboardName,
  dashboardNameEmphasis,
  subTabs = [],
  activeSubTab,
  onSubTabChange,
  children,
  extraFilters,
  activeFilters = [],
  heroBgSrc,
  heroBgPosition = 'center 55%',
  onExtraire,
}) {
  const tabLabel = subTabs.find(t => t.id === activeSubTab)?.label;

  // Sur mobile, extraFilters (ex. le sélecteur collaborateur) migre vers la
  // feuille "Filtre" de BottomNav plutôt que d'encombrer le hero — on
  // l'enregistre ici pour que BottomNav (rendu hors de cet arbre) puisse le
  // restituer.
  const { setNode: setExtraFiltersNode } = useExtraFilters();
  useEffect(() => {
    setExtraFiltersNode(extraFilters ?? null);
    return () => setExtraFiltersNode(null);
  }, [extraFilters, setExtraFiltersNode]);

  // Centre l'onglet actif dans la strip scrollable — renforce "on peut
  // scroller" en laissant apparaître un bout des onglets voisins des deux
  // côtés, plutôt que de coller l'onglet actif contre un bord.
  const activePillRef = useRef(null);
  useEffect(() => {
    activePillRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeSubTab]);

  // Direction du glissement de contenu (droite→gauche si on avance dans la
  // liste d'onglets, inverse si on recule) — reprend la métaphore "swipe"
  // déjà posée par la strip scrollable, pour le corps de la page aussi.
  const prevSubTabRef = useRef(activeSubTab);
  const [slideDir, setSlideDir] = useState(1);
  useEffect(() => {
    if (prevSubTabRef.current !== activeSubTab) {
      const prevIdx = subTabs.findIndex(t => t.id === prevSubTabRef.current);
      const nextIdx = subTabs.findIndex(t => t.id === activeSubTab);
      if (prevIdx !== -1 && nextIdx !== -1) setSlideDir(nextIdx > prevIdx ? 1 : -1);
      prevSubTabRef.current = activeSubTab;
    }
  }, [activeSubTab, subTabs]);

  const {
    periodKey, customFrom, customTo, onChange,
    compareActive, comparePeriodKey, compareFrom, compareTo,
    toggleCompare, onCompareChange,
  } = usePeriod();

  const periodLabel = buildPeriodLabel(periodKey, customFrom, customTo);
  const filterParts = activeFilters.filter(Boolean);
  const subtitle = filterParts.length > 0
    ? `${periodLabel} · ${filterParts.join(' · ')}`
    : periodLabel;

  return (
    <div className={styles.shell}>

      {/* ── Hero header ── */}
      <div className={styles.hero}>
        <div className={styles.heroBg} style={{ backgroundImage: `url(${heroBgSrc || defaultHeroBg})`, backgroundPosition: heroBgPosition }} />
        <div className={styles.heroOverlay} />

        <div className={styles.heroInner}>

          {/* Titre seul à gauche */}
          <div className={styles.heroTitleBlock}>
            <h1 className={styles.title}>
              {dashboardName}
              {dashboardNameEmphasis && <em className={styles.titleEm}> {dashboardNameEmphasis}.</em>}
            </h1>
            <p className={styles.subtitle}>
              Vous analysez les KPIs&nbsp;
              <span className={styles.subtitlePeriod}>{subtitle}</span>
            </p>
            {tabLabel && <p className={styles.tabBadge}>{tabLabel}</p>}

            {/* Onglets scrollables horizontalement — mobile uniquement, sur
                desktop c'est le popup "Choisir une vue" du Topbar qui gère
                la bascule entre onglets. Remplace le dropdown de page qui,
                lui, ne descendait jamais jusqu'au choix du sous-onglet. */}
            {subTabs.length > 1 && (
              <div className={styles.subTabStrip}>
                {subTabs.map(t => (
                  <button
                    key={t.id}
                    ref={t.id === activeSubTab ? activePillRef : null}
                    type="button"
                    className={`${styles.subTabPill} ${t.id === activeSubTab ? styles.subTabPillActive : ''}`}
                    onClick={() => onSubTabChange?.(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tous les contrôles regroupés à droite en bas — période et
              comparaison masquées sur mobile, reprises par BottomNav
              (boutons Filtre/Comparer) où elles ont plus de place. */}
          <div className={styles.heroBottom}>
            <div className={styles.heroActions}>
              <div className={styles.mobileHidden}>
                {extraFilters}
              </div>

              <div className={styles.mobileHidden}>
                <PeriodPicker
                  value={periodKey}
                  customFrom={customFrom}
                  customTo={customTo}
                  onChange={onChange}
                />
              </div>

              {onExtraire && (
                <button
                  className={styles.heroBtn}
                  onClick={onExtraire}
                  type="button"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Extraire
                </button>
              )}

              <div className={`${styles.compareWrap} ${styles.mobileHidden}`}>
                <button
                  className={`${styles.heroBtn} ${compareActive ? styles.heroBtnActive : ''}`}
                  onClick={toggleCompare}
                  type="button"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
                    <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
                    <line x1="12" y1="3" x2="12" y2="21"/>
                  </svg>
                  Comparer
                  {compareActive && (
                    <span className={styles.heroBtnX} onClick={e => { e.stopPropagation(); toggleCompare(); }}>✕</span>
                  )}
                </button>
                {compareActive && (
                  <PeriodPicker
                    value={comparePeriodKey}
                    customFrom={compareFrom}
                    customTo={compareTo}
                    onChange={onCompareChange}
                  />
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Contenu principal ── */}
      <main className={styles.content}>
        <div key={activeSubTab} className={styles.contentSlide} style={{ '--slide-dir': slideDir }}>
          {children}
        </div>
      </main>
    </div>
  );
}
