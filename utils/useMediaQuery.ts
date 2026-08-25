import { useState, useEffect } from 'react';

/**
 * Melacak media query CSS dari React.
 *
 * Dipakai untuk hal yang tidak bisa diselesaikan kelas responsif Tailwind:
 * mengganti struktur render (tabel jadi kartu), bukan sekadar mengganti gaya.
 * Untuk perubahan gaya murni, tetap pakai prefiks `lg:` supaya tidak ada
 * render ganda.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};

/** Ambang layout desktop: di bawah ini tabel scheduler tidak muat lagi. */
export const DESKTOP_QUERY = '(min-width: 1024px)';
