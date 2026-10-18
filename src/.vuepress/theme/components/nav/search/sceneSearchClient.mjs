// Keep the worker and its full index outside Vue's reactive state.
export function createSceneSearchClient({ createWorker, onResults, onState,
  setTimer = setTimeout, clearTimer = clearTimeout, delay = 150 }) {
  let worker = null;
  let timer = null;
  let requestId = 0;
  let disposed = false;

  function cancel() {
    requestId += 1;
    if (timer !== null) clearTimer(timer);
    timer = null;
    onState({ loading: false, error: false });
  }
  function stopWorker() {
    if (worker) {
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      worker.terminate();
      worker = null;
    }
  }
  function fail() {
    stopWorker();
    if (!disposed) onState({ loading: false, error: true });
  }
  return {
    search(query, manifestUrl) {
      if (disposed) return;
      cancel();
      if (!query.trim()) return;
      const id = requestId;
      onState({ loading: true, error: false });
      timer = setTimer(() => {
        timer = null;
        try {
          if (!worker) {
            worker = createWorker();
            worker.onmessage = ({ data }) => {
              if (disposed || data.id !== requestId) return;
              if (data.error) { fail(); return; }
              onResults(data.results, data.query);
              onState({ loading: false, error: false });
            };
            worker.onerror = worker.onmessageerror = fail;
          }
          worker.postMessage({ id, query, manifestUrl });
        } catch (error) {
          fail();
        }
      }, delay);
    },
    cancel,
    dispose() {
      cancel();
      disposed = true;
      stopWorker();
    },
  };
}
