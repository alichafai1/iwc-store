import { extractHtml } from './extract/html.js';
import { extractJsonLd } from './extract/jsonld.js';
import { extractMeta } from './extract/meta.js';
import { mergeDrafts, parsePrice, type AdapterDraft, type AdapterInput, type ProductAdapter } from './types.js';

export class GenericProductAdapter implements ProductAdapter {
  readonly id = 'generic';

  matches(): boolean {
    return true;
  }

  extract(input: AdapterInput): AdapterDraft {
    const draft = mergeDrafts(extractJsonLd(input.$), extractMeta(input.$), extractHtml(input.$));
    if (draft.price == null) {
      const fromSpec = parsePrice(
        draft.specifications.find((spec) => /^price\b/i.test(spec.label))?.value,
      );
      if (fromSpec) {
        draft.price = fromSpec.price;
        draft.currency = draft.currency ?? fromSpec.currency ?? null;
      }
    }

    if (draft.primarySpecs.length === 0) {
      draft.primarySpecs = draft.specifications;
    }

    return draft;
  }
}
