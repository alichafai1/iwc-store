const LINK_PATTERN = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderRichText(value: string): string {
  const escaped = escapeHtml(value);
  return escaped.replace(LINK_PATTERN, '<a href="$2">$1</a>');
}

export function getArticleToc(blocks: { type: string; id?: string; text?: string; level?: 2 | 3 }[]) {
  return blocks
    .filter((block): block is { type: 'heading'; id: string; text: string; level: 2 | 3 } => {
      return block.type === 'heading' && Boolean(block.id) && Boolean(block.text) && Boolean(block.level);
    })
    .map((block) => ({
      id: block.id,
      text: block.text,
      level: block.level,
    }));
}
