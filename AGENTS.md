## Development

Start the full local stack with one command from the repo root:

```
npm run dev
```

This starts:

- Astro on port 4330
- Product scraper on port 8787
- Product processor on port 8788

Stopping the command stops all three services.

Individual services for debugging:

```
npm run dev:astro
npm run dev:scraper
npm run dev:processor
```

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
