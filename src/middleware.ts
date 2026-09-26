import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import {
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
  getVerifiedUserId,
  isAdminLoginPath,
  isAdminLogoutPath,
  isAdminPath,
  isCurrentUserAdmin,
} from './lib/admin-auth';
import { createSupabaseServerClient } from './lib/supabase.server';

export const onRequest = defineMiddleware(async (context, next) => {
  if (isAdminPath(context.url.pathname)) {
    return handleAdminRequest(context, next);
  }

  const response = await next();
  return withPublicCacheHeaders(context.url.pathname, response);
});

async function handleAdminRequest(context: APIContext, next: MiddlewareNext) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseServerClient(context, responseHeaders);
  const userId = await getVerifiedUserId(supabase);

  if (isAdminLogoutPath(context.url.pathname)) {
    return withAdminHeaders(await next(), responseHeaders);
  }

  if (isAdminLoginPath(context.url.pathname)) {
    if (userId && (await isCurrentUserAdmin(supabase))) {
      return withAdminHeaders(context.redirect(ADMIN_HOME_PATH), responseHeaders);
    }

    if (userId) {
      await supabase.auth.signOut();
      return withAdminHeaders(
        context.redirect(`${ADMIN_LOGIN_PATH}?error=unauthorized`),
        responseHeaders,
      );
    }

    return withAdminHeaders(await next(), responseHeaders);
  }

  if (!userId) {
    return withAdminHeaders(context.redirect(ADMIN_LOGIN_PATH), responseHeaders);
  }

  if (!(await isCurrentUserAdmin(supabase))) {
    await supabase.auth.signOut();
    return withAdminHeaders(
      context.redirect(`${ADMIN_LOGIN_PATH}?error=unauthorized`),
      responseHeaders,
    );
  }

  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === 'string' ? data.claims.email : '';

  context.locals.adminUser = {
    id: userId,
    email,
  };

  return withAdminHeaders(await next(), responseHeaders);
}

function withAdminHeaders(response: Response, extraHeaders: Headers): Response {
  extraHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

const IMMUTABLE_ASSET = /^\/(?:_astro|_image)\//i;
const IMMUTABLE_EXT =
  /\.(?:js|mjs|css|map|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif|ico)$/i;

function withPublicCacheHeaders(pathname: string, response: Response): Response {
  if (response.headers.has('Cache-Control')) {
    return response;
  }

  if (pathname.startsWith('/api/')) {
    return response;
  }

  if (IMMUTABLE_ASSET.test(pathname) || IMMUTABLE_EXT.test(pathname)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return response;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }

  return response;
}
