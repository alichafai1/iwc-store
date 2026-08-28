import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export const ADMIN_HOME_PATH = '/admin/';
export const ADMIN_LOGIN_PATH = '/admin/login/';
export const ADMIN_LOGOUT_PATH = '/admin/logout/';

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isAdminLoginPath(pathname: string): boolean {
  return pathname === '/admin/login' || pathname === '/admin/login/';
}

export function isAdminLogoutPath(pathname: string): boolean {
  return pathname === '/admin/logout' || pathname === '/admin/logout/';
}

export async function getVerifiedUserId(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  return typeof data.claims.sub === 'string' ? data.claims.sub : null;
}

export async function isCurrentUserAdmin(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

export function isSameOriginRequest(request: Request): boolean {
  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set<string>(originAliases(requestUrl.origin));
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();

  if (forwardedHost) {
    const protocol = forwardedProto || requestUrl.protocol.replace(':', '');
    for (const origin of originAliases(`${protocol}://${forwardedHost}`)) {
      allowedOrigins.add(origin);
    }
  }

  const origin = request.headers.get('origin');
  if (origin) {
    return allowedOrigins.has(origin);
  }

  const referer = request.headers.get('referer');
  if (!referer) {
    return false;
  }

  try {
    return allowedOrigins.has(new URL(referer).origin);
  } catch {
    return false;
  }
}

function originAliases(origin: string): string[] {
  try {
    const url = new URL(origin);
    const hosts = new Set([url.host]);
    const port = url.port ? `:${url.port}` : '';

    if (url.hostname === 'localhost') {
      hosts.add(`127.0.0.1${port}`);
      hosts.add(`[::1]${port}`);
    }

    if (url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname === '::1') {
      hosts.add(`localhost${port}`);
      hosts.add(`127.0.0.1${port}`);
    }

    return [...hosts].map((host) => `${url.protocol}//${host}`);
  } catch {
    return [origin];
  }
}
