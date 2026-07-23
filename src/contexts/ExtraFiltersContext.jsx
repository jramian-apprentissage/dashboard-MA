import { createContext, useContext, useState } from 'react';

/* Pont entre DashboardLayout (qui reçoit extraFilters — ex. le sélecteur
   collaborateur — comme prop, propre à chaque page) et BottomNav (rendu une
   fois globalement dans AppShell, hors de l'arbre des pages). Sur mobile,
   tous les filtres doivent vivre dans la feuille "Filtre" du bas plutôt que
   dans le hero : DashboardLayout enregistre son contenu ici, BottomNav le
   restitue. Le même élément React est rendu deux fois (hero desktop masqué
   sur mobile, feuille Filtre) — sans état interne propre au select, les deux
   copies restent synchronisées via le même state/handler porté par la page. */
const ExtraFiltersContext = createContext(null);

export function ExtraFiltersProvider({ children }) {
  const [node, setNode] = useState(null);
  return (
    <ExtraFiltersContext.Provider value={{ node, setNode }}>
      {children}
    </ExtraFiltersContext.Provider>
  );
}

export function useExtraFilters() {
  const ctx = useContext(ExtraFiltersContext);
  if (!ctx) throw new Error('useExtraFilters must be used within ExtraFiltersProvider');
  return ctx;
}
