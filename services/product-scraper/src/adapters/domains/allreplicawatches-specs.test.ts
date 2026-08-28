import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { describe, it } from 'node:test';
import {
  isSpecificationHeading,
  parseProductSpecifications,
} from './allreplicawatches-specs.js';

function parse(html: string) {
  const $ = load(html);
  return parseProductSpecifications({
    url: new URL('https://allreplicawatches.to/product'),
    html,
    $,
  });
}

describe('allreplicawatches specification headings', () => {
  it('matches the supported specification headings', () => {
    const accepted = [
      'Build Details',
      'Technical Overview',
      'Specifications',
      'Product Details',
      'Watch Details',
      'Key Specifications',
      'Case & Movement Specs',
    ];
    for (const heading of accepted) {
      assert.equal(isSpecificationHeading(heading), true, heading);
    }
  });

  it('rejects marketing and comparison headings', () => {
    for (const heading of ['How It Compares', 'What Sets It Apart', 'Worldwide Shipping 9-15 days']) {
      assert.equal(isSpecificationHeading(heading), false, heading);
    }
  });
});

describe('allreplicawatches specification extraction', () => {
  it('reads Build Details lists', () => {
    const specs = parse(`
      <h2>Build Details</h2>
      <ul>
        <li>Case diameter: 41mm</li>
        <li>Case material: stainless steel</li>
      </ul>
    `);
    assert.deepEqual(specs, [
      { label: 'Case diameter', value: '41mm' },
      { label: 'Case material', value: 'stainless steel' },
    ]);
  });

  it('reads Technical Overview lists', () => {
    const specs = parse(`
      <h2>Technical Overview</h2>
      <ul>
        <li>Dial: blue sunburst with applied indices</li>
        <li>Strap: blue alligator leather, pin buckle</li>
      </ul>
    `);
    assert.equal(specs.length, 2);
    assert.equal(specs[0]?.label, 'Dial');
  });

  it('reads Key Specifications and Case & Movement Specs', () => {
    const specs = parse(`
      <h2>Key Specifications</h2>
      <ul><li>Case: 42mm stainless steel</li></ul>
      <h2>Case &amp; Movement Specs</h2>
      <ul><li>Movement: automatic</li></ul>
    `);
    assert.equal(specs.some((spec) => spec.label === 'Case'), true);
    assert.equal(specs.some((spec) => spec.label === 'Movement'), true);
  });

  it('reads h3 Product Details, tables, and definition lists', () => {
    const specs = parse(`
      <h3>Product Details</h3>
      <table>
        <tr><th>Crystal</th><td>sapphire</td></tr>
        <tr><th>Water resistance</th><td>30m</td></tr>
      </table>
      <h3>Watch Details</h3>
      <dl>
        <dt>Hands</dt>
        <dd>blued steel</dd>
      </dl>
    `);
    assert.deepEqual(
      specs.map((spec) => spec.label),
      ['Crystal', 'Water resistance', 'Hands'],
    );
  });

  it('skips Superclone vs AAA comparison tables', () => {
    const specs = parse(`
      <h2>Technical Overview</h2>
      <ul><li>Case diameter: 41mm</li></ul>
      <table>
        <tr><th>Feature</th><th>Superclone</th><th>AAA grade</th><th>A grade</th></tr>
        <tr><td>Accuracy</td><td>±5–8 s/day</td><td>±10–15 s/day</td><td>±20–35 s/day</td></tr>
      </table>
    `);
    assert.deepEqual(specs, [{ label: 'Case diameter', value: '41mm' }]);
  });

  it('reads specs when Elementor wraps the heading and list in sibling widgets', () => {
    const specs = parse(`
      <div class="elementor-element">
        <div class="elementor-widget-container">
          <h2>Technical Overview</h2>
        </div>
      </div>
      <div class="elementor-element">
        <div class="elementor-widget-container">
          <ul>
            <li><strong>Case diameter:</strong> 41mm</li>
            <li>Crystal: sapphire</li>
          </ul>
        </div>
      </div>
      <div class="elementor-element">
        <div class="elementor-widget-container">
          <h2>Inside the Movement</h2>
        </div>
      </div>
    `);
    assert.deepEqual(specs, [
      { label: 'Case diameter', value: '41mm' },
      { label: 'Crystal', value: 'sapphire' },
    ]);
  });
});
