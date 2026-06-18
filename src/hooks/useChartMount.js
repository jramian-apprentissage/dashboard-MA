import { useState, useEffect } from 'react';

export function useChartMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // setTimeout(0) rather than requestAnimationFrame so it works even in
    // backgrounded/hidden tabs where rAF is throttled.
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);
  return mounted;
}
