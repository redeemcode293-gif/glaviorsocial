import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: system-ui, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      text-align: center;
      padding: 2rem;
    ">
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #f87171;">
        Configuration Required
      </h1>
      <p style="color: #94a3b8; max-width: 480px; line-height: 1.6;">
        This app requires Supabase credentials to run. Please set the following
        environment variables and restart the app:
      </p>
      <ul style="text-align: left; margin-top: 1rem; color: #cbd5e1; line-height: 2;">
        <li><code style="background:#1e293b; padding: 2px 6px; border-radius: 4px;">VITE_SUPABASE_URL</code> — Your Supabase project URL</li>
        <li><code style="background:#1e293b; padding: 2px 6px; border-radius: 4px;">VITE_SUPABASE_PUBLISHABLE_KEY</code> — Your Supabase anon/public key</li>
      </ul>
      <p style="margin-top: 1.5rem; color: #64748b; font-size: 0.875rem;">
        Find these in your Supabase dashboard under Project Settings → API
      </p>
    </div>
  `;
  throw new Error('Supabase environment variables are not configured.');
}

// In development, proxy Edge Function calls through Vite to avoid CORS issues
// when the browser's origin is localhost. The Vite dev server proxies
// /supabase-functions/* → SUPABASE_URL/functions/v1/*
const devFetch: typeof fetch = (input, init) => {
  if (typeof input === 'string' && input.includes('/functions/v1/')) {
    const proxied = input.replace(
      /^https?:\/\/[^/]+\/functions\/v1\//,
      '/supabase-functions/'
    );
    return fetch(proxied, init);
  }
  return fetch(input, init);
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: import.meta.env.DEV ? devFetch : undefined,
  },
});
