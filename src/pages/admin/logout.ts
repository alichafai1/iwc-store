import type { APIRoute } from 'astro';
import { ADMIN_LOGIN_PATH, isSameOriginRequest } from '../../lib/admin-auth';
import { createSupabaseServerClient } from '../../lib/supabase.server';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  if (!isSameOriginRequest(context.request)) {
    return context.redirect(ADMIN_LOGIN_PATH);
  }

  const responseHeaders = new Headers();
  const supabase = createSupabaseServerClient(context, responseHeaders);
  await supabase.auth.signOut();

  const response = context.redirect(ADMIN_LOGIN_PATH);
  responseHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
  return response;
};

export const GET: APIRoute = async (context) => {
  return context.redirect(ADMIN_LOGIN_PATH);
};
