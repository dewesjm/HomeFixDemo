import { writeFile } from 'node:fs/promises';

const configuredOrigin = process.env.MWQ_OFFLINE_TEST_ORIGIN?.trim();
let origin = null;
if (configuredOrigin) {
  const url = new URL(configuredOrigin);
  if (url.protocol !== 'https:' || url.origin !== configuredOrigin) {
    throw new Error('MWQ_OFFLINE_TEST_ORIGIN must be an HTTPS origin without a path or trailing slash.');
  }
  origin = url.origin;
}

await writeFile(new URL('../dist/welding/browser/mwq-offline-config.json', import.meta.url), JSON.stringify({ origin }));
