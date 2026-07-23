// Stale-while-revalidate cache helpers — session-scoped (per browser tab,
// cleared when the tab closes) and keyed by user id so cached data never
// leaks across accounts or outlives the tab.
//
// Used by page components whose mount-time fetch (useEffect(() => {
// api(...).then(setX) }, [])) would otherwise reset state to null/[] on
// every reload — that reset-to-nothing is what actually reads as "slow":
// the page blanks to zeros/skeletons for however long the network
// round-trip takes, on every single visit, independent of real backend
// speed. Hydrating synchronously from the last successful load shows real
// data immediately; the existing fetch effect still always runs and
// silently overwrites the cache with fresh data once it lands.
//
// Usage:
//   const [data, setData] = useState(() => readCache('overview', currentUser?.id));
//   ...
//   useEffect(() => {
//     api('/api/whatever').then((r) => {
//       setData(r);
//       writeCache('overview', currentUser?.id, r);
//     });
//   }, []);
export function readCache(key, userId) {
  if (!userId) return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(`kallus.swr.${key}`) || 'null');
    return parsed && parsed.userId === userId ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeCache(key, userId, data) {
  if (!userId) return;
  try {
    sessionStorage.setItem(`kallus.swr.${key}`, JSON.stringify({ userId, data }));
  } catch { /* storage full / private-mode — just skip caching */ }
}
