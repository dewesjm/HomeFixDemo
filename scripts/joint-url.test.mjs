import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { chromium } from '@playwright/test';
import compiled from '../dist/joint-url-test/api/joint-url.js';

const handler = compiled.default;
const path = '/api/joint-url';
const key = 'hull=D1034&drawing=S731-5003&joint=FO-10939';
const jointPage = '/jobs/D1034/S731-5003/FO-10939';

function request(query, method = 'GET') {
  return handler.fetch(new Request(`https://ewr.example${path}?${query}`, { method }));
}

test('returns the canonical eWR link and an empty string for a joint without an XREFID', async () => {
  const response = request('hull=%20d1034%20&drawing=s731-5003&joint=fo-10939');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { url: `https://ewr.example${jointPage}`, xrefid: '' });
});

test('returns the matched joint XREFID as a string', async () => {
  const response = request('hull=S3969&drawing=H731-5002&joint=ST-11541');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    url: 'https://ewr.example/jobs/S3969/H731-5002/ST-11541',
    xrefid: 'HFTEU',
  });
});

test('requires each identity field and returns 404 for an unknown joint', () => {
  for (const name of ['hull', 'drawing', 'joint']) {
    const params = new URLSearchParams(key);
    params.delete(name);
    assert.equal(request(params).status, 400, name);
    params.set(name, ' ');
    assert.equal(request(params).status, 400, name);
  }
  assert.equal(request('hull=D1034&drawing=S731-5003&joint=FO-00000').status, 404);
});

test('rejects writes and responds to preflight for GET', () => {
  assert.equal(request(key, 'POST').status, 405);
  const response = request(key, 'OPTIONS');
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');
});

async function serve(t, listener) {
  const server = createServer(listener).listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

test('a browser on a separate origin can read the link and error statuses', async t => {
  const caller = await serve(t, (_req, res) => res.end('MWQ origin'));
  const ewr = await serve(t, async (req, res) => {
    const requestUrl = new URL(req.url, ewr);
    if (requestUrl.pathname !== path) {
      res.writeHead(404).end();
      return;
    }
    const response = handler.fetch(new Request(requestUrl, { method: req.method, headers: req.headers }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  });

  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(caller);
  const responses = await page.evaluate(async ({ endpoint, key }) => {
    const get = query => fetch(`${endpoint}?${query}`, { credentials: 'omit' });
    const success = await get(key);
    const missing = await get('');
    const unknown = await get(key.replace('FO-10939', 'FO-00000'));
    return { status: success.status, body: await success.json(), missing: missing.status, unknown: unknown.status };
  }, { endpoint: ewr + path, key });
  assert.deepEqual(responses, {
    status: 200, body: { url: ewr + jointPage, xrefid: '' }, missing: 400, unknown: 404,
  });
});
