import styles from './Card.module.css';

/* `action` : un contrôle à droite de l'en-tête, ajouté le 16/10 pour la bascule
   « internes » du Suivi des effectifs.
   On aurait pu passer le bouton dans `icon`, qui vit déjà au même endroit, mais
   `icon` est enveloppé dans un span à 12 px et couleur text2 : il habille une
   décoration, pas un élément cliquable. Une entrée distincte dit ce qu'elle est
   et laisse l'appelant maître de son style. L'en-tête n'apparaît toujours que
   s'il y a un titre ou un badge, donc rien ne change pour les cartes qui n'en
   passent pas. */
export default function Card({ title, icon, badge, action, children, className = '' }) {
  return (
    <div className={`${styles.card} ${className}`}>
      {(title || badge || action) && (
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <div className={styles.headerRight}>
            {badge && <span className={styles.badge}>{badge}</span>}
            {icon && <span className={styles.icon}>{icon}</span>}
            {action}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
