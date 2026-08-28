const REBUILD_TIMEOUT_MS = 8000;

function getDeployHookUrl(): string | undefined {
  const fromImport = import.meta.env.VERCEL_DEPLOY_HOOK_URL;
  const fromProcess = typeof process !== 'undefined' ? process.env.VERCEL_DEPLOY_HOOK_URL : undefined;
  const value = (fromImport || fromProcess || '').trim();
  return value.length > 0 ? value : undefined;
}

export function isStorefrontRebuildConfigured(): boolean {
  return Boolean(getDeployHookUrl());
}

export async function requestStorefrontRebuild(): Promise<{ triggered: boolean; reason?: string }> {
  const url = getDeployHookUrl();
  if (!url) {
    console.info(
      'Storefront rebuild skipped: VERCEL_DEPLOY_HOOK_URL is not set. Publish is saved in Supabase; the static catalog updates on the next production build.',
    );
    return { triggered: false, reason: 'not_configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REBUILD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Storefront rebuild hook failed: ${response.status}`);
      return { triggered: false, reason: 'hook_failed' };
    }

    return { triggered: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`Storefront rebuild hook error: ${message}`);
    return { triggered: false, reason: 'hook_failed' };
  } finally {
    clearTimeout(timer);
  }
}
