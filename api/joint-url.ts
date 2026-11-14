import { findJoint } from '../src/app/weld-record/joint-link-logic/joint-lookup';
import { jointUrl } from '../src/app/weld-record/joint-link-logic/joint-route';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};
const allow = 'GET, OPTIONS';

export default {
  fetch(request: Request): Response {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...headers, Allow: allow, 'Access-Control-Allow-Methods': allow },
      });
    }
    if (request.method !== 'GET') {
      return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...headers, Allow: allow } });
    }

    const { origin, searchParams } = new URL(request.url);
    const hull = searchParams.get('hull')?.trim();
    const drawing = searchParams.get('drawing')?.trim();
    const joint = searchParams.get('joint')?.trim();
    if (!hull || !drawing || !joint) {
      return Response.json({ error: 'Give hull, drawing and joint.' }, { status: 400, headers });
    }

    const found = findJoint({ hull, drawing, joint });
    if (!found.ok) {
      return Response.json({ error: 'No unique joint matches.' }, { status: 404, headers });
    }
    return Response.json({ url: jointUrl(found.data, origin) }, { headers });
  },
};
