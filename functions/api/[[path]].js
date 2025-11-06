// Cloudflare Pages Function to handle all API routes
// This file handles /api/* routes

import { handleAPI } from '../../src/api-handler.js';

// Note: For Cloudflare Pages, make sure D1 binding is configured in Pages settings
// Settings → Functions → D1 database bindings → Add: DB → voting-db

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    return await handleAPI(request, env, path, method, corsHeaders);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

