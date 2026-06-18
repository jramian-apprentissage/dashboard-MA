import { useState, useRef, useEffect } from 'react';
import styles from './AIChat.module.css';

const DEMO_MSG = 'Nous sommes en mode test, la conversation IA sera disponible pour la version à venir.';
const WELCOME  = 'Bonjour ! Posez-moi une question sur vos données ou vos tableaux de bord.';

export default function AIChat() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: WELCOME },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, open]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: DEMO_MSG }]);
      setTyping(false);
    }, 900);
  }

  function onKey(e) {
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
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
        )}
      </button>

      {/* ── Panel chat ── */}
      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`} role="dialog" aria-label="Chat IA">
        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
            Assistante IA
          </div>
          <span className={styles.demoBadge}>Mode démo</span>
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${styles[m.role]}`}>
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

        {/* Input */}
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Posez une question…"
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
