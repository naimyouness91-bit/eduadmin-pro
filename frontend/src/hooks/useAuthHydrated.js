import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { HYDRATION_TIMEOUT_MS } from '../utils/withTimeout';

/** Wait for zustand persist rehydration before auth route decisions. */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return undefined;
    }

    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));

    const poll = window.setInterval(() => {
      if (useAuthStore.persist.hasHydrated()) {
        setHydrated(true);
      }
    }, 50);

    const failSafe = window.setTimeout(() => {
      setHydrated(true);
    }, HYDRATION_TIMEOUT_MS);

    return () => {
      unsub?.();
      window.clearInterval(poll);
      window.clearTimeout(failSafe);
    };
  }, []);

  return hydrated;
}
