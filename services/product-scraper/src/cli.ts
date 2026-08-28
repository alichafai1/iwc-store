import { loadEnv } from './env.js';
import { startCollectionScrape } from './collection.js';
import { scrapeProduct } from './scrape.js';
import { createScraperSupabase } from './supabase.js';

const args = process.argv.slice(2);
const collection = args.includes('--collection');
const url = args.find((value) => !value.startsWith('-'));

if (!url) {
  console.error('Usage: npm run scrape -- "https://example.com/product"');
  console.error('       npm run scrape -- --collection "https://example.com/collection"');
  process.exit(1);
}

const env = loadEnv();
const supabase = createScraperSupabase(env);
const result = collection
  ? await startCollectionScrape({ url, env, supabase, wait: true })
  : await scrapeProduct({ url, env, supabase });

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
