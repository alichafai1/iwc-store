/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly SITE?: string;
  readonly VERCEL_PROJECT_PRODUCTION_URL?: string;
  readonly VERCEL_DEPLOY_HOOK_URL?: string;
  readonly SCRAPER_SERVICE_URL?: string;
  readonly SCRAPER_API_KEY?: string;
  readonly PROCESSOR_SERVICE_URL?: string;
  readonly PROCESSOR_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    adminUser?: {
      id: string;
      email: string;
    };
  }
}
