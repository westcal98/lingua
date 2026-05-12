import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import ASSET_MANIFEST from '__STATIC_CONTENT_MANIFEST';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: API proxy
    if (request.method === 'POST' && url.pathname === '/api/chat') {
      const CORS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
      try {
        const body = await request.json();
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
    }

    // Route: OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Route: Static files
    try {
      return await getAssetFromKV({ request, waitUntil: ctx.waitUntil.bind(ctx) }, {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST,
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  },
};
