/**
 * Decodes standard HTML entities commonly found in LeetCode descriptions.
 */
export function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&le;/g, '<=')
    .replace(/&ge;/g, '>=')
    .replace(/&ne;/g, '!=')
    .replace(/&plusmn;/g, '+/-')
    .replace(/&times;/g, 'x')
    .replace(/&divide;/g, '/')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * Converts LeetCode GraphQL HTML problem description into clean GitHub Markdown.
 * Operates purely with regex patterns so it runs identically in Node.js,
 * Web Workers, and Browser environments without DOM or jsdom overhead.
 */
export function convertHtmlToMarkdown(htmlContent: string): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '';
  }

  let text = htmlContent;

  // 1. Remove dangerous or non-content tags
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 2. Preserve images as Markdown image syntax before stripping remaining tags
  text = text.replace(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi, (fullTag, src) => {
    const altMatch = fullTag.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : 'Example';
    return `\n\n![${alt}](${src})\n\n`;
  });

  // 3. Handle preformatted code blocks (<pre>...</pre>) and strip inner HTML tags
  // so markdown asterisks like **Input:** do not appear literally inside code blocks.
  const preBlocks: string[] = [];
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, codeInside) => {
    const stripped = codeInside.replace(/<[^>]+>/g, '');
    const decoded = decodeHtmlEntities(stripped).trim();
    const token = `__CODESYNC_PRE_${preBlocks.length}__`;
    preBlocks.push(`\n\n\`\`\`text\n${decoded}\n\`\`\`\n\n`);
    return token;
  });

  // 4. Superscript and Subscript (before inline code so 10<sup>4</sup> inside <code> becomes 10^4)
  text = text.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, '^$1');
  text = text.replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, '_$1');

  // 5. Handle inline code (<code>...</code>)
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => {
    const cleaned = decodeHtmlEntities(code.replace(/<[^>]+>/g, '')).trim();
    return cleaned ? `\`${cleaned}\`` : '';
  });

  // 6. Strong and Bold
  text = text.replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');

  // 7. Emphasis and Italic
  text = text.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // 8. Headings
  text = text.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  text = text.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  text = text.replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');

  // 9. List items
  text = text.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  text = text.replace(/<\/?(?:ul|ol)\b[^>]*>/gi, '\n');

  // 10. Paragraphs and breaks
  text = text.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // 11. Strip any remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 12. Decode remaining HTML entities
  text = decodeHtmlEntities(text);

  // 13. Restore <pre> code blocks cleanly
  preBlocks.forEach((block, idx) => {
    text = text.replace(`__CODESYNC_PRE_${idx}__`, block);
  });

  // 14. Format Example / Constraints headers cleanly
  text = text
    .replace(/\*\*(Example \d+:)\*\*/g, '\n### $1')
    .replace(/\*\*(Constraints:)\*\*/g, '\n### $1');

  // 15. Normalize consecutive newlines and trailing whitespace
  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}
