import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
