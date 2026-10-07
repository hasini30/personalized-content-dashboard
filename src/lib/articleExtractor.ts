export interface ExtractedArticle {
  title: string;
  byline: string;
  paragraphs: string[];
  wordCount: number;
  readingTimeMinutes: number;
  leadImageUrl?: string;
  url: string;
}

/**
 * Pure zero-dependency server-side article extractor.
 * Strips script tags, navigation, ads, sidebars, and extracts clean article body paragraphs.
 */
export function extractArticleFromHtml(html: string, sourceUrl: string): ExtractedArticle {
  // Extract og:title or <title>
  const ogTitleMatch = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  );
  const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = (
    ogTitleMatch ? ogTitleMatch[1] : titleTagMatch ? titleTagMatch[1] : 'Article Story'
  )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .trim();

  // Extract author
  const authorMatch =
    html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i);
  const byline = authorMatch ? authorMatch[1].trim() : 'Editorial Staff';

  // Extract og:image
  const ogImageMatch = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
  );
  const leadImageUrl = ogImageMatch ? ogImageMatch[1].trim() : undefined;

  // Clean HTML: Remove scripts, styles, iframes, nav, footer, header, aside, form
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Extract paragraphs
  const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let match;

  while ((match = pRegex.exec(cleanHtml)) !== null) {
    const rawP = match[1];
    // Strip tags within paragraph
    const text = rawP
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
      .trim();

    // Filter out short boilerplates, cookie notices, share prompts
    if (
      text.length > 35 &&
      !text.toLowerCase().includes('cookie') &&
      !text.toLowerCase().includes('subscribe')
    ) {
      paragraphs.push(text);
    }
  }

  // Fallback if no clean paragraphs found
  if (paragraphs.length === 0) {
    const bodyMatch = cleanHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : cleanHtml;
    const fallbackText = bodyContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (fallbackText.length > 50) {
      paragraphs.push(fallbackText.slice(0, 800) + '...');
    } else {
      paragraphs.push(
        'Full article contents could not be extracted directly from this web page. Please view original link.'
      );
    }
  }

  const wordCount = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).filter(Boolean).length, 0);
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  return {
    title,
    byline,
    paragraphs,
    wordCount,
    readingTimeMinutes,
    leadImageUrl,
    url: sourceUrl,
  };
}
