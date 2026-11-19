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

  // 2. Handle preformatted code blocks (<pre><code>...</code></pre> or <pre>...</pre>)
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, codeInside) => {
    // Strip inner <code> tags if present
    let raw = codeInside.replace(/<\/?code[^>]*>/gi, '');
    raw = decodeHtmlEntities(raw).trim();
    return `\n\n\`\`\`\n${raw}\n\`\`\`\n\n`;
  });

  // 3. Handle inline code (<code>...</code>)
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => {
    const cleaned = decodeHtmlEntities(code).trim();
    return `\`${cleaned}\``;
  });

  // 4. Strong and Bold
  text = text.replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');

  // 5. Emphasis and Italic
  text = text.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // 6. Superscript and Subscript
  text = text.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, '^$1');
  text = text.replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, '_$1');

  // 7. Headings
  text = text.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  text = text.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  text = text.replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');

  // 8. List items
  text = text.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  text = text.replace(/<\/?(?:ul|ol)\b[^>]*>/gi, '\n');

  // 9. Paragraphs and breaks
  text = text.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // 10. Strip any remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 11. Decode remaining HTML entities
  text = decodeHtmlEntities(text);

  // 12. Normalize consecutive newlines and extra spaces
  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}
