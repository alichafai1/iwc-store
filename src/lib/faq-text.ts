export type FaqAnswerPart =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; label: string };

const FAQ_LINK = /\[([^\]]+)\]\((\/[a-z0-9\-_/]+)\)/gi;

export function plainFaqAnswer(answer: string): string {
  return answer.replace(FAQ_LINK, '$1');
}

export function faqAnswerParts(answer: string): FaqAnswerPart[] {
  const parts: FaqAnswerPart[] = [];
  const pattern = new RegExp(FAQ_LINK.source, 'gi');
  let cursor = 0;
  let match = pattern.exec(answer);

  while (match) {
    if (match.index > cursor) {
      parts.push({ type: 'text', value: answer.slice(cursor, match.index) });
    }

    parts.push({ type: 'link', href: match[2], label: match[1] });
    cursor = match.index + match[0].length;
    match = pattern.exec(answer);
  }

  if (cursor < answer.length) {
    parts.push({ type: 'text', value: answer.slice(cursor) });
  }

  return parts;
}
