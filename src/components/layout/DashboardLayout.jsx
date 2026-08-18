import { useEffect, useRef, useState } from 'react';
import PeriodPicker from '../ui/PeriodPicker';
import { usePeriod } from '../../contexts/PeriodContext';
import { useExtraFilters } from '../../contexts/ExtraFiltersContext';
import { DASHBOARD_EXCLUDED_PERIODS } from '../../data/dashboardTabs';
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
  dashboardId,
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
  extraireLoading = false,
  contentRef,
  // Dashboards clients (ex. ASUS) : phrase d'intro plus explicative que le
  // "Vous analysez les KPIs" interne, à destination d'un lecteur externe qui
  // découvre l'outil. Le reste de la phrase (période + comparaison) reste
  // dynamique, seule l'intro change.
  clientFacingSubtitle = false,
}) {
  const tabLabel = subTabs.find(t => t.id === activeSubTab)?.label;
  const excludePeriods = DASHBOARD_EXCLUDED_PERIODS[dashboardId] || [];

  // Bandeau contextuel compact (mobile) : reste visible au scroll une fois le
  // hero passé, pour qu'on sache toujours dans quel dashboard/onglet/période
  // on se trouve sans avoir à remonter — retour direct : la période de
  // référence "part" quand on scrolle, ce n'est pas pratique si quelqu'un
  // d'autre reçoit le dashboard et doit comprendre le contexte d'un coup d'œil.
  const [compactVisible, setCompactVisible] = useState(false);
  useEffect(() => {
    function onScroll() { setCompactVisible(window.scrollY > 90); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sur mobile, extraFilters (ex. le sélecteur collaborateur) migre vers la
  // feuille "Filtre" de BottomNav plutôt que d'encombrer le hero — on
  // l'enregistre ici pour que BottomNav (rendu hors de cet arbre) puisse le
  // restituer.
  const { setNode: setExtraFiltersNode } = useExtraFilters();
  useEffect(() => {
    setExtraFiltersNode(extraFilters ?? null);
    return () => setExtraFiltersNode(null);
  }, [extraFilters, setExtraFiltersNode]);

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

  // Swipe horizontal sur le corps de la page pour changer d'onglet, sur
  // mobile — même logique que la strip du haut. Purement passif : on ne fait
  // que lire les positions de début/fin du toucher, sans jamais appeler
  // preventDefault, donc le scroll vertical normal n'est pas affecté. On
  // ignore le geste s'il démarre sur un élément qui a lui-même du scroll
  // horizontal (tableaux avec overflow-x, etc.) pour ne pas leur voler le
  // toucher.
  const mainRef = useRef(null);
  const touchStartRef = useRef(null);
  const SWIPE_THRESHOLD = 60;

  function startsInsideHorizontalScroller(target) {
    let node = target;
    while (node && node !== mainRef.current) {
      if (node.scrollWidth > node.clientWidth + 1) {
        const overflowX = window.getComputedStyle(node).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  function handleTouchStart(e) {
    if (subTabs.length < 2 || window.innerWidth > 640) return;
    if (startsInsideHorizontalScroller(e.target)) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }

  function handleTouchEnd(e) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.time;
    const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
    if (!isHorizontal || Math.abs(dx) < SWIPE_THRESHOLD || dt > 600) return;

    const curIdx = subTabs.findIndex(t => t.id === activeSubTab);
    if (curIdx === -1) return;
    if (dx < 0 && curIdx < subTabs.length - 1) onSubTabChange?.(subTabs[curIdx + 1].id); // swipe vers la gauche → onglet suivant
    else if (dx > 0 && curIdx > 0) onSubTabChange?.(subTabs[curIdx - 1].id); // swipe vers la droite → onglet précédent
  }

  const {
    periodKey, customFrom, customTo, onChange,
    compareActive, comparePeriodKey,
    toggleCompare, setCompareMode,
  } = usePeriod();

  const periodLabel = buildPeriodLabel(periodKey, customFrom, customTo);
  const filterParts = activeFilters.filter(Boolean);
  const subtitle = filterParts.length > 0
    ? `${periodLabel} · ${filterParts.join(' · ')}`
    : periodLabel;

  // Couleur par dashboard — sert de repère visuel pour se rappeler où l'on
  // se trouve, sur le hero desktop comme sur le bandeau compact mobile
  // (voir compactHeader plus bas, qui n'est pas un descendant du hero donc
  // ne peut pas hériter de .heroAsus/.heroCiment/.heroCommercialRC via CSS).
  const periodPickerTheme = dashboardId === 'asus' ? 'asus' : dashboardId === 'commercial-rc' ? 'argent' : dashboardId === 'commercial-activite' ? 'myrtille' : 'default';
  const heroThemeCls = dashboardId === 'asus' ? styles.heroAsus : dashboardId === 'commercial-activite' ? styles.heroCiment : dashboardId === 'commercial-rc' ? styles.heroCommercialRC : '';
  const compactThemeCls = dashboardId === 'asus' ? styles.compactHeaderAsus : dashboardId === 'commercial-activite' ? styles.compactHeaderCiment : dashboardId === 'commercial-rc' ? styles.compactHeaderCommercialRC : '';

  return (
    <div className={styles.shell}>

      {/* ── Hero header ── */}
      {/* Teinte par dashboard (charte ASUS, ou simple repère de couleur pour
          les autres) au lieu du myrtille uni par défaut. */}
      {/* Le cadrage par défaut est posé sur le CONTENEUR, pas sur .heroBg qui
          l'utilise. Un style inline l'emporte sur toute feuille : porté par
          .heroBg lui-même, il aurait de nouveau bloqué toute media query — on
          n'aurait fait que déplacer le problème de `background-position` vers
          la variable. Posé ici, il se transmet par héritage, et une règle
          visant .heroBg reprend la main en petite largeur. */}
      <div
        className={`${styles.hero} ${heroThemeCls}`}
        style={{ '--hero-bg-pos': heroBgPosition }}
      >
        <div
          className={styles.heroBg}
          style={{ backgroundImage: `url(${heroBgSrc || defaultHeroBg})` }}
        />
        <div className={styles.heroOverlay} />

        <div className={styles.heroInner}>

          {/* Titre seul à gauche */}
          <div className={styles.heroTitleBlock}>
            <h1 className={styles.title}>
              {dashboardName}
              {dashboardNameEmphasis && <em className={styles.titleEm}> {dashboardNameEmphasis}.</em>}
            </h1>
            <p className={styles.subtitle}>
              {clientFacingSubtitle ? (
                <>
                  {/* « Collaborateurs » et non « agents » : c'est le terme
                      employé partout ailleurs — sélecteur de filtre, tableau
                      « Statistiques par collaborateur ». Deux mots pour la
                      même personne sur un seul écran (retour de Clémence,
                      14/08). */}
                  Vous analysez la performance des collaborateurs de Mon
                  Ambassadeur travaillant pour le compte de votre entreprise
                  en mesurant les indicateurs&nbsp;
                  <span className={styles.subtitlePeriod}>{subtitle}</span>
                  {compareActive && (
                    <> versus <span className={styles.subtitlePeriod}>{comparePeriodKey === 'previous-year' ? "l'année précédente" : 'la période précédente'}</span></>
                  )}.
                </>
              ) : (
                <>
                  Vous analysez les KPIs&nbsp;
                  <span className={styles.subtitlePeriod}>{subtitle}</span>
                </>
              )}
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
                  excludeKeys={excludePeriods}
                  theme={periodPickerTheme}
                />
              </div>

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
                  <div className={styles.compareModeGroup}>
                    <button
                      type="button"
                      className={`${styles.compareModeBtn} ${comparePeriodKey === 'previous-period' ? styles.compareModeBtnActive : ''}`}
                      onClick={() => setCompareMode('previous-period')}
                    >
                      Période précédente
                    </button>
                    <button
                      type="button"
                      className={`${styles.compareModeBtn} ${comparePeriodKey === 'previous-year' ? styles.compareModeBtnActive : ''}`}
                      onClick={() => setCompareMode('previous-year')}
                    >
                      Année précédente
                    </button>
                  </div>
                )}
              </div>

              {onExtraire && (
                <button
                  className={styles.heroBtn}
                  onClick={onExtraire}
                  type="button"
                  disabled={extraireLoading}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {extraireLoading ? 'Génération…' : 'Extraire'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Bandeau contextuel compact (mobile, apparaît au scroll) ── */}
      <div className={`${styles.compactHeader} ${compactThemeCls} ${compactVisible ? styles.compactHeaderVisible : ''}`}>
        <div className={styles.compactHeaderTitle}>
          {dashboardName}{dashboardNameEmphasis ? ` ${dashboardNameEmphasis}` : ''}
          {tabLabel && <span className={styles.compactHeaderTab}> · {tabLabel}</span>}
        </div>
        <div className={styles.compactHeaderPeriod}>
          {periodLabel}
          {compareActive && (
            <span className={styles.compactHeaderCompare}>
              {' '}vs {comparePeriodKey === 'previous-year' ? 'année précédente' : 'période précédente'}
            </span>
          )}
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <main
        className={styles.content}
        ref={mainRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div key={activeSubTab} ref={contentRef} className={styles.contentSlide} style={{ '--slide-dir': slideDir }}>
          {children}
        </div>
      </main>
    </div>
  );
}
