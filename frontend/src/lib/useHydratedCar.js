import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';

/** List rows are summaries. Opening a car loads the full record once and keeps it in the cache. */
export function useHydratedCar(cars, id) {
  const queryClient = useQueryClient();
  const car = cars?.find((item) => item.id === id) || null;
  useEffect(() => {
    if (!id || !car?.summary) return undefined;
    let cancel = false;
    api(`/cars/${encodeURIComponent(id)}`).then((full) => {
      if (cancel) return;
      queryClient.setQueryData(['garage', 'cars'], (old) => {
        if (!Array.isArray(old)) return old;
        const next = { ...full, hydrated: true };
        return old.some((item) => item.id === next.id)
          ? old.map((item) => (item.id === next.id ? next : item))
          : [next, ...old];
      });
    }).catch(() => {});
    return () => { cancel = true; };
  }, [id, car?.summary, queryClient]);
  return car;
}
