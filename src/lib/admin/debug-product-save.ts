export function logProductSaveDebug(form: FormData, extra: Record<string, unknown> = {}): void {
  const keys = [...new Set(form.keys())];
  const interesting = keys.filter(
    (key) =>
      key === 'intent' ||
      key === 'status' ||
      key === 'title' ||
      key === 'slug' ||
      key.startsWith('quality_') ||
      key.includes('price'),
  );

  console.info(
    '[iwc-product-save]',
    JSON.stringify({
      at: new Date().toISOString(),
      intentAll: form.getAll('intent').map(String),
      fields: Object.fromEntries(interesting.map((key) => [key, form.getAll(key).map(String)])),
      ...extra,
    }),
  );
}
