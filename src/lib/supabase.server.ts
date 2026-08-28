import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { Database } from '../types/database';
import { getSupabasePublicEnv } from './supabase-env';

interface CookieContext {
  request: Request;
  cookies: AstroCookies;
}

export function createSupabaseServerClient(
  context: CookieContext,
  responseHeaders?: Headers,
) {
  const { url, publishableKey } = getSupabasePublicEnv();
  const secure = new URL(context.request.url).protocol === 'https:';

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, {
            ...options,
            path: options?.path ?? '/',
            sameSite: options?.sameSite ?? 'lax',
            // HTTP local admin must be able to store the session cookie.
            secure,
          });
        });

        if (!responseHeaders) {
          return;
        }

        Object.entries(headers).forEach(([key, value]) => {
          responseHeaders.set(key, value);
        });
      },
    },
  });
}
