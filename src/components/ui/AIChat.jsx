import { useState, useRef, useEffect } from 'react';
import { usePeriod } from '../../contexts/PeriodContext';
import { getPeriodRange } from './PeriodPicker';
import { filtrerMentions } from '../../data/kpiRegistry';
import { ai } from '../../services/api';
import styles from './AIChat.module.css';

const WELCOME = 'Bonjour ! Posez-moi une question sur vos données. Tapez « / » pour cibler un indicateur précis.';

// Nombre d'entrées affichées dans le menu "/" — au-delà la liste devient
// illisible et le filtre au clavier est de toute façon plus rapide.
const MENU_MAX = 8;

export default function AIChat() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: WELCOME }]);
  // Cartes explicitement ciblées par l'utilisateur via "/" — transmises au
  // backend pour qu'il charge le détail correspondant.
  const [mentions, setMentions] = useState([]);

  // ── Menu "/" ──────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen]   = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
  const [menuIndex, setMenuIndex] = useState(0);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const { periodKey, customFrom, customTo } = usePeriod();
  const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

  const resultats = menuOpen ? filtrerMentions(menuQuery).slice(0, MENU_MAX) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, open]);

  // Le filtre change → on revient en tête de liste, sinon l'index pointe sur
  // une entrée qui n'existe plus après avoir tapé une lettre de plus.
  useEffect(() => { setMenuIndex(0); }, [menuQuery]);

  function onChange(e) {
    const val = e.target.value;
    setInput(val);

    // "/" ouvre le menu s'il démarre un mot (début de ligne ou après un
    // espace) — un "/" au milieu d'un mot (une URL, une date) ne doit rien
    // déclencher. On lit le fragment courant jusqu'au curseur.
    const pos = e.target.selectionStart ?? val.length;
    const avant = val.slice(0, pos);
    const m = avant.match(/(?:^|\s)\/([^/\s][^/]*)?$/);
    if (m) {
      setMenuOpen(true);
      setMenuQuery(m[1] || '');
    } else {
      setMenuOpen(false);
    }
  }

  // Remplace le "/xxx" en cours de frappe par le nom de la carte et mémorise
  // la mention (le backend reçoit le chemin complet, l'utilisateur ne voit
  // que le nom de la carte dans son message).
  function choisir(mention) {
    const el = inputRef.current;
    const pos = el?.selectionStart ?? input.length;
    const avant = input.slice(0, pos);
    const apres = input.slice(pos);
    const remplace = avant.replace(/(?:^|\s)\/([^/\s][^/]*)?$/, m0 =>
      (m0.startsWith(' ') ? ' ' : '') + mention.card + ' ');

    setInput(remplace + apres);
    setMentions(prev => prev.some(x => x.id === mention.id) ? prev : [...prev, mention]);
    setMenuOpen(false);
    // Le focus est perdu par le clic sur l'entrée du menu ; on le rend et on
    // replace le curseur juste après le texte inséré.
    requestAnimationFrame(() => {
      el?.focus();
      const p = remplace.length;
      el?.setSelectionRange(p, p);
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || typing) return;

    const historique = [...messages.filter(m => m.text !== WELCOME), { role: 'user', text }];
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setMenuOpen(false);
    setTyping(true);

    const { ok, data } = await ai.chat({
      messages: historique.map(m => ({ role: m.role, content: m.text })),
      from, to,
      mentions: mentions.map(m => m.chemin),
    });

    setTyping(false);
    setMessages(prev => [...prev, {
      role: 'assistant',
      text: ok ? data.reply : (data.error || "L'assistante est indisponible."),
      erreur: !ok,
    }]);
    // Les mentions valent pour la question posée, pas pour toute la session.
    setMentions([]);
  }

  function onKey(e) {
    if (menuOpen && resultats.length > 0) {
      // Tant que le menu est ouvert il capte les flèches et Entrée — sinon on
      // enverrait le message alors que l'utilisateur voulait choisir une carte.
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIndex(i => (i + 1) % resultats.length); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMenuIndex(i => (i - 1 + resultats.length) % resultats.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choisir(resultats[menuIndex]); return; }
      if (e.key === 'Escape')    { e.preventDefault(); setMenuOpen(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* ── Bouton flottant ── */}
      <button
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        title={open ? 'Fermer' : 'Assistante IA'}
        aria-label={open ? 'Fermer le chat IA' : 'Ouvrir le chat IA'}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* ── Panel chat ── */}
      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`} role="dialog" aria-label="Chat IA">
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
            Assistante IA
          </div>
          <span className={styles.periodBadge}>{from} → {to}</span>
        </div>

        <div className={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${styles[m.role]} ${m.erreur ? styles.msgErreur : ''}`}>
              {m.text}
            </div>
          ))}
          {typing && (
            <div className={`${styles.msg} ${styles.assistant} ${styles.typing}`}>
              <span /><span /><span />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Cartes ciblées pour la prochaine question */}
        {mentions.length > 0 && (
          <div className={styles.mentions}>
            {mentions.map(m => (
              <span key={m.id} className={styles.mentionChip} title={m.chemin}>
                {m.card}
                <button
                  type="button"
                  onClick={() => setMentions(prev => prev.filter(x => x.id !== m.id))}
                  aria-label={`Retirer ${m.card}`}
                >×</button>
              </span>
            ))}
          </div>
        )}

        <div className={styles.inputRow}>
          {/* ── Menu "/" — même ergonomie que les commandes slash de Claude
                 Code : filtre à la frappe, flèches, Entrée/Tab pour valider ── */}
          {menuOpen && (
            <div className={styles.slashMenu} role="listbox">
              <div className={styles.slashHint}>Indicateur à cibler — dashboard · page · carte</div>
              {resultats.length === 0 ? (
                <div className={styles.slashEmpty}>Aucun indicateur ne correspond</div>
              ) : resultats.map((m, i) => (
                <button
                  type="button"
                  key={m.id}
                  role="option"
                  aria-selected={i === menuIndex}
                  className={`${styles.slashItem} ${i === menuIndex ? styles.slashItemActive : ''}`}
                  // onMouseDown plutôt que onClick : onClick arrive après le
                  // blur de l'input, qui a déjà refermé le menu.
                  onMouseDown={e => { e.preventDefault(); choisir(m); }}
                  onMouseEnter={() => setMenuIndex(i)}
                >
                  <span className={styles.slashCard}>{m.card}</span>
                  <span className={styles.slashPath}>{m.dash} · {m.page}</span>
                </button>
              ))}
            </div>
          )}
          <input
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={onChange}
            onKeyDown={onKey}
            placeholder="Posez une question…  ( / pour cibler un indicateur )"
            disabled={typing}
            autoComplete="off"
          />
          <button
            className={styles.sendBtn}
            onClick={send}
            disabled={!input.trim() || typing}
            aria-label="Envoyer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
