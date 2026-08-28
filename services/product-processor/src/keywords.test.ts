import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchWebsiteCollection, type WebsiteCollection } from './keywords.js';

const collections: WebsiteCollection[] = [
  { id: '1', name: 'Anniversary Series', slug: 'anniversary-series' },
  { id: '2', name: 'Big Pilot', slug: 'big-pilot' },
  { id: '3', name: 'Mark Series', slug: 'mark-series' },
  { id: '4', name: 'Pilots', slug: 'pilots' },
  { id: '5', name: 'Portofino', slug: 'portofino' },
  { id: '6', name: 'Portuguese', slug: 'portuguese' },
];

describe('matchWebsiteCollection', () => {
  it('maps Replica Mark Watches and /mark to the existing Mark Series collection', () => {
    const matched = matchWebsiteCollection(
      collections,
      'Replica Mark Watches',
      'https://allreplicawatches.to/replica-iwc/mark',
    );
    assert.equal(matched?.slug, 'mark-series');
  });

  it('maps a short Mark source name to Mark Series without creating a new collection', () => {
    const matched = matchWebsiteCollection(collections, 'Mark', 'https://allreplicawatches.to/replica-iwc/mark');
    assert.equal(matched?.slug, 'mark-series');
    assert.equal(matched?.name, 'Mark Series');
  });

  it('still matches an exact Mark Series source name', () => {
    const matched = matchWebsiteCollection(collections, 'Mark Series', null);
    assert.equal(matched?.slug, 'mark-series');
  });

  it('matches Portofino from a replica source title', () => {
    const matched = matchWebsiteCollection(
      collections,
      'Replica Portofino Watches',
      'https://allreplicawatches.to/replica-iwc/portofino',
    );
    assert.equal(matched?.slug, 'portofino');
  });

  it('prefers Big Pilot over Pilots when the source is Big Pilot', () => {
    const matched = matchWebsiteCollection(
      collections,
      'Replica Big Pilot Watches',
      'https://allreplicawatches.to/replica-iwc/big-pilot',
    );
    assert.equal(matched?.slug, 'big-pilot');
  });

  it('maps Pilot to Pilots instead of Big Pilot', () => {
    const matched = matchWebsiteCollection(
      collections,
      'Replica Pilot Watches',
      'https://allreplicawatches.to/replica-iwc/pilots',
    );
    assert.equal(matched?.slug, 'pilots');
  });

  it('returns null when no website collection exists', () => {
    const matched = matchWebsiteCollection(
      collections,
      'Replica Unknown Family Watches',
      'https://allreplicawatches.to/replica-iwc/unknown-family',
    );
    assert.equal(matched, null);
  });
});
