import { defineMiddleware } from 'astro:middleware';
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
  if (!isAdminPath(context.url.pathname)) {
    return next();
  }

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
});

function withAdminHeaders(response: Response, extraHeaders: Headers): Response {
  extraHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}
