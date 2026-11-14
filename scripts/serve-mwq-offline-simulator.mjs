import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const page = await readFile(new URL('../public/mwq-offline-simulator.html', import.meta.url));
createServer((request, response) => {
  if (request.url !== '/') {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(page);
}).listen(4322, 'localhost', () => {
  console.log('MWQ simulator running at http://localhost:4322');
});
