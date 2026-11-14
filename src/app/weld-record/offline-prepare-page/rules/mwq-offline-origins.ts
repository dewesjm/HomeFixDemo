export async function getMwqOfflineOrigins(signal: AbortSignal): Promise<string[]> {
  const origins = [window.location.origin];
  if (window.location.hostname === 'localhost') {
    origins.push('http://localhost:4322');
    return origins;
  }

  try {
    const response = await fetch('/mwq-offline-config.json', { cache: 'no-store', signal });
    if (response.ok) {
      const config = await response.json() as { origin?: unknown };
      if (typeof config.origin === 'string') {
        const url = new URL(config.origin);
        if (url.protocol === 'https:' && url.origin === config.origin && !origins.includes(url.origin)) {
          origins.push(url.origin);
        }
      }
    }
  } catch {
    // With no deployment config, the bundled simulator can still run on this origin.
  }
  return origins;
}
