import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic hook for a paginated, searchable list backed by an API endpoint.
 *
 * @param {Function} fetchFn  - async (params) => { count, results, next, previous }
 * @param {Object}   initial  - Extra query params to seed the initial state.
*/
function useList(fetchFn, initial = {}) {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ page: 1, page_size: 20, ...initial });
  const abortRef = useRef(null);

  const load = useCallback(async (p) => {
    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort(); // Note: fetch cancellation is best-effort; we still need to handle errors from aborted requests.

    abortRef.current = new AbortController();   // For fetch cancellation

    setLoading(true);
    setError(null);

    try {
      const data = await fetchFn(p);    // Expected: { count, results, next, previous }

      setItems(data.results ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError(err.message ?? 'Failed to load data.');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);    // Stable load function that only changes if fetchFn changes

  // Reload whenever params change
  useEffect(() => { load(params); }, [params, load]);   // eslint-disable-line react-hooks/exhaustive-deps

  const setSearch = useCallback((search) => setParams(p => ({ ...p, search,  page: 1 })), []);  // Reset to page 1 on new search
  const setPage = useCallback((page) => setParams(p => ({ ...p, page })), []); // Note: page is 1-based for the API, but UI components might be 0-based; handle conversion in the component if needed.
  const setFilters = useCallback((filters) => setParams(p => ({ ...p, ...filters, page: 1 })), []); // Merge new filters with existing params, and reset to page 1
  const reload = useCallback(() => load(params), [load, params]); // Reload with current params

  return { items, count, loading, error, params, setSearch, setPage, setFilters, reload };  // Expose current items, total count, loading/error states, current query params, and functions to update search/page/filters and reload the list.
}

export default useList;