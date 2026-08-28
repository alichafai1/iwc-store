export function getSupabasePublicEnv(): { url: string; publishableKey: string } {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and add your project values.',
    );
  }

  return { url, publishableKey };
}
