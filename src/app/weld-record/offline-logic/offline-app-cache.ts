function waitForController(signal: AbortSignal): Promise<void> {
  if (navigator.serviceWorker.controller) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const onChange = () => {
      if (!navigator.serviceWorker.controller) return;
      signal.removeEventListener('abort', onAbort);
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve();
    };
    const onAbort = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
  });
}

export async function verifyOfflineAppCache(): Promise<void> {
  const signal = AbortSignal.timeout(45_000);
  await waitForController(signal);
  const index = new URL('index.html', document.baseURI);
  // A controlled request initializes Angular's prefetch group on a fresh installation.
  const indexResponse = await fetch(index, { signal });
  const state = await fetch(new URL('ngsw/state', document.baseURI), { signal });
  if (!indexResponse.ok || !state.ok || !/^Driver state: NORMAL\b/m.test(await state.text()) || !(await caches.match(index.href))) {
    throw new Error('Weld Record’s offline app cache is unavailable. Reconnect and retry.');
  }
}
