import { useEffect, useRef, useState } from 'react';
import { useFetchClient } from '@strapi/helper-plugin';

/** Αναζήτηση σε όλο το CMS (όχι στον κομμένο κατάλογο της αναφοράς ταύτισης). */
export function useCmsRemoteSearch({ enabled, contentType, venueType = '', query = '' }) {
  const { get } = useFetchClient();
  const getRef = useRef(get);
  getRef.current = get;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;
    const q = String(query || '').trim();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        q,
        contentType: contentType || 'movie',
        limit: '36',
      });
      if (venueType) params.set('venueType', venueType);
      getRef
        .current(`/api/more-lookup/cms-search?${params.toString()}`)
        .then((res) => {
          if (cancelled) return;
          const body = res?.data ?? {};
          if (body.ok === false) {
            setItems([]);
            setError(body?.error?.message || 'Αποτυχία αναζήτησης CMS');
            return;
          }
          setItems(Array.isArray(body.items) ? body.items : []);
        })
        .catch((err) => {
          if (cancelled) return;
          setItems([]);
          const status = err?.response?.status;
          setError(
            err?.response?.data?.error?.message ||
              (status ? `Αποτυχία αναζήτησης CMS (${status})` : 'Αποτυχία αναζήτησης CMS'),
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, q ? 220 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, contentType, venueType, query]);

  return { items, loading, error };
}

export function stopLookupTableKeys(event) {
  event.stopPropagation();
}
