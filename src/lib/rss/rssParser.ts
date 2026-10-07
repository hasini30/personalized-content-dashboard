/**
 * Lightweight, zero-dependency XML/RSS/Atom parser for Node.js and Next.js runtimes.
 * Extracts clean titles, descriptions, links, publication dates, authors, and thumbnails.
 */

export interface ParsedRssItem {
  title: string;
  link: string;
  description: string;
  content?: string;
  publishedAt: string;
  author?: string;
  imageUrl?: string;
  category?: string;
}

export interface ParsedRssFeed {
  title: string;
  description?: string;
  link?: string;
  items: ParsedRssItem[];
}

/**
 * Strips CDATA markers and decodes standard HTML/XML entities.
 */
export function decodeXmlEntities(text: string): string {
  if (!text) return '';

  let cleaned = text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    });

  // Strip excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Strips HTML tags to extract clean readable plain text for article cards and descriptions.
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  const unwrapped = decodeXmlEntities(html);
  const withoutTags = unwrapped
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/\]\]>/g, '');
  return decodeXmlEntities(withoutTags);
}

/**
 * Extracts thumbnail or header image URL from item XML block.
 */
export function extractImageUrl(itemXml: string): string | undefined {
  // 1. Check <enclosure url="..." /> or attributes in any order
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i);
  if (enclosureMatch && enclosureMatch[1]) {
    const url = decodeXmlEntities(enclosureMatch[1]).trim();
    if (url.match(/\.(jpe?g|png|webp|avif|gif)/i) || !url.match(/\.(mp3|mp4|wav|pdf)/i)) {
      return url;
    }
  }

  // 2. Check <media:content url="..." /> or <media:thumbnail url="..." />
  const mediaMatch = itemXml.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["'][^>]*>/i);
  if (mediaMatch && mediaMatch[1]) {
    return decodeXmlEntities(mediaMatch[1]).trim();
  }

  // 3. Check for <img> tag inside description or content:encoded
  const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch && imgMatch[1]) {
    const src = decodeXmlEntities(imgMatch[1]).trim();
    if (!src.includes('doubleclick') && !src.includes('pixel') && !src.includes('1x1')) {
      return src;
    }
  }

  return undefined;
}

/**
 * Normalizes raw XML category strings to standard category keys.
 */
export function normalizeParsedCategory(raw?: string, title?: string): string | null {
  if (!raw && !title) return null;
  const s = (raw || '').toLowerCase().trim();

  // If already a canonical specific category, preserve it directly
  const specificCanonical = [
    'sports',
    'technology',
    'environment',
    'education',
    'health',
    'science',
    'entertainment',
    'business',
    'politics',
    'world',
  ];
  if (specificCanonical.includes(s)) return s;

  const t = (title || '').toLowerCase();

  // 1. Sports
  if (['sport', 'sports', 'cricket', 'football', 'tennis', 'nfl', 'soccer', 'athletics', 'racing', 'cycling', 'basketball', 'golf', 'rugby', 'boxing', 'baseball', 'swimming', 'badminton', 'hockey', 'motorsport', 'formula one', 'f1', 'lionel messi', 'cristiano ronaldo', 'harry kane', 'coco gauff', 'chicago white sox', 'philadelphia eagles', 'connecticut sun', 'ipswich town', 'manchester city', 'nations league', "women's super league", "prix de l'arc de triomphe", 'world cup'].some((k) => s.includes(k) || t.includes(k))) return 'sports';

  // 2. Technology
  if (['tech', 'technology', 'gadget', 'gadgets', 'ai', 'artificial intelligence', 'software', 'hardware', 'smartphone', 'smartphones', 'apple', 'google', 'microsoft', 'semiconductor', 'cyber', 'computer', 'internet', 'app', 'apps', 'openai', 'meta', 'palantir', 'spacex', 'saturn', 'iphone', 'datacentre', 'datacentres', 'wearable'].some((k) => s.includes(k) || (t.includes(k) && !s.includes('crime')))) return 'technology';

  // 3. Environment
  if (['environment', 'climate', 'wildlife', 'ecology', 'nature', 'conservation', 'climate crisis', 'climate change', 'emissions', 'pollution', 'extreme weather', 'deforestation', 'cop31', 'el niño', 'hurricanes', 'flooding', 'water', 'insects', 'whales', 'shellfish', 'food waste', 'farming'].some((k) => s.includes(k) || t.includes(k))) return 'environment';

  // 4. Education
  if (['education', 'school', 'schools', 'university', 'universities', 'college', 'students', 'learning', 'academics', 'exam', 'cbse', 'upsc', 'graduation', 'campus', 'teacher', 'curriculum', 'early years education', 'special educational needs', 'student housing', 'libraries'].some((k) => s.includes(k) || t.includes(k))) return 'education';

  // 5. Health
  if (['health', 'medical', 'medicine', 'wellness', 'hospital', 'disease', 'cancer', 'mental health', 'vaccine', 'doctor', 'healthcare', 'fitness', 'virus', 'surgery', 'ebola', 'bubonic plague', 'fertility', 'sexual health', "women's health", 'social care', 'carers', 'diet', 'nutrition', 'yoga'].some((k) => s.includes(k) || t.includes(k))) return 'health';

  // 6. Science
  if (['science', 'sci-tech', 'space', 'physics', 'biology', 'astronomy', 'research', 'glacier', 'telescope', 'nasa', 'isro', 'quantum', 'lab', 'scientist', 'archaeology', 'fossils', 'neuroscience', 'nobel', 'nobel prizes', 'animal behaviour', 'fungi', 'sharks'].some((k) => s.includes(k) || t.includes(k))) return 'science';

  // 7. Entertainment
  if (['entertainment', 'culture', 'movie', 'movies', 'film', 'cinema', 'music', 'tv', 'television', 'arts', 'art', 'games', 'celebrity', 'theatre', 'bollywood', 'hollywood', 'series', 'tom cruise', 'whitney houston', 'kim kardashian', 'dolly parton', 'david byrne', 'barbara kingsolver', 'stephen king', 'stanley kubrick', 'warner bros', 'harry potter', 'classical music', 'dance', 'pop and rock', 'photography', 'fashion', 'paris fashion week', 'london film festival', 'new york film festival', 'reality tv', 'the traitors', 'shows', 'books', 'authors', 'fiction', 'architecture', 'posters', 'miu miu', 'louis vuitton'].some((k) => s.includes(k) || t.includes(k))) return 'entertainment';

  // 8. Business
  if (['business', 'market', 'markets', 'economy', 'finance', 'banking', 'stocks', 'industry', 'commerce', 'trade', 'startup', 'startups', 'investment', 'inflation', 'gdp', 'money', 'mortgage', 'housing market', 'property', 'retail', 'insurance', 'automotive industry', 'steel industry', 'oil', 'petrol', 'tariffs', 'imf', 'reserve bank', 'enterprise', 'commercial', 'super-rich', 'financial', 'leasehold', 'rupee', 'sensex', 'nifty', 'sitharaman'].some((k) => s.includes(k) || t.includes(k))) return 'business';

  // 9. Politics
  if (['politics', 'national', 'government', 'election', 'elections', 'policy', 'parliament', 'senate', 'congress', 'court', 'supreme court', 'high court', 'law', 'bill', 'minister', 'prime minister', 'president', 'trump', 'donald trump', 'trump administration', 'biden', 'modi', 'governance', 'assembly', 'bjp', 'labour', 'conservative', 'conservatives', 'reform uk', 'kemi badenoch', 'nigel farage', 'flávio bolsonaro', 'carles puigdemont', 'angus taylor', 'zack polanski', 'pete hegseth', 'us midterm', 'defence policy', 'foreign policy', 'democratic socialism', 'far right', 'green party', 'human rights', 'immigration', 'one nation', 'brexit', 'dgp', 'collector', 'naidu', 'shinde', 'protest'].some((k) => s.includes(k) || t.includes(k))) return 'politics';

  // 10. World
  if (['world', 'international', 'global', 'foreign', 'diplomacy', 'un', 'united nations', 'g20', 'europe', 'european union', 'asia', 'middle east', 'israel', 'gaza', 'palestine', 'west bank', 'russia', 'ukraine', 'china', 'japan', 'south korea', 'north korea', 'taiwan', 'iran', 'iraq', 'syria', 'lebanon', 'yemen', 'egypt', 'libya', 'brazil', 'chile', 'canada', 'france', 'germany', 'italy', 'spain', 'poland', 'netherlands', 'norway', 'turkey', 'australia news', 'uk news', 'us news', 'world news'].some((k) => s.includes(k) || t.includes(k))) return 'world';

  const canonical = ['sports', 'technology', 'environment', 'education', 'health', 'science', 'entertainment', 'business', 'politics', 'world', 'general'];
  if (canonical.includes(s)) return s;

  return null;
}

/**
 * Parses an RSS 2.0 or Atom XML string into structured objects.
 */
export function parseRssXml(xmlString: string, defaultCategory = 'general'): ParsedRssFeed {
  if (!xmlString || typeof xmlString !== 'string') {
    return { title: 'RSS Feed', items: [] };
  }

  const feedTitleMatch =
    xmlString.match(/<channel[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i) ||
    xmlString.match(/<feed[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
  const feedTitle = feedTitleMatch ? decodeXmlEntities(feedTitleMatch[1]) : 'Live News Feed';

  // Support both RSS <item>...</item> and Atom <entry>...</entry>
  const itemMatches = Array.from(
    xmlString.matchAll(/<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)
  );

  const items: ParsedRssItem[] = [];

  for (const match of itemMatches) {
    const itemXml = match[1];

    // Title
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const title = decodeXmlEntities(rawTitle);

    if (!title || title.length < 4) continue;

    // Link: either <link>url</link> (supporting CDATA), Atom <link href="url" />, or fallback to <guid>
    let link = '';
    const linkTagMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    if (linkTagMatch && linkTagMatch[1]) {
      link = decodeXmlEntities(linkTagMatch[1]).trim();
    }

    if (!link) {
      const atomLinkMatch = itemXml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
      if (atomLinkMatch && atomLinkMatch[1]) {
        link = decodeXmlEntities(atomLinkMatch[1]).trim();
      }
    }

    if (!link) {
      const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
      if (guidMatch && guidMatch[1]) {
        const candidate = decodeXmlEntities(guidMatch[1]).trim();
        if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
          link = candidate;
        }
      }
    }

    // Description / Summary
    const descMatch = itemXml.match(
      /<(?:description|summary)[^>]*>([\s\S]*?)<\/(?:description|summary)>/i
    );
    const rawDesc = descMatch ? descMatch[1] : '';
    const description = stripHtmlTags(rawDesc) || title;

    // Content:encoded (full body if present)
    const contentMatch = itemXml.match(
      /<content(?::encoded)?[^>]*>([\s\S]*?)<\/content(?::encoded)?>/i
    );
    const rawContent = contentMatch ? contentMatch[1] : rawDesc;
    const content = stripHtmlTags(rawContent);

    // Publication Date
    const dateMatch = itemXml.match(
      /<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i
    );
    let publishedAt = new Date().toISOString();
    if (dateMatch && dateMatch[1]) {
      const rawDateStr = decodeXmlEntities(dateMatch[1]).trim();
      const parsedDate = new Date(rawDateStr);
      if (!isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate.toISOString();
      }
    }

    // Author / Creator
    const authorMatch = itemXml.match(
      /<(?:author|dc:creator|name)[^>]*>([\s\S]*?)<\/(?:author|dc:creator|name)>/i
    );
    let author: string | undefined;
    if (authorMatch && authorMatch[1]) {
      const rawAuthor = stripHtmlTags(authorMatch[1]);
      const nameInParen = rawAuthor.match(/\(([^)]+)\)/);
      if (nameInParen && nameInParen[1]) {
        author = nameInParen[1].trim();
      } else {
        author = rawAuthor.replace(/<[^>]*>/g, '').trim();
      }
    }

    // Image URL
    const imageUrl = extractImageUrl(itemXml);

    // Category
    const categoryMatch = itemXml.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
    let category = defaultCategory;
    if (categoryMatch && categoryMatch[1]) {
      const rawCat = stripHtmlTags(categoryMatch[1]).toLowerCase().trim();
      const mapped = normalizeParsedCategory(rawCat, title);
      category = mapped || defaultCategory;
    } else {
      const titleMapped = normalizeParsedCategory(undefined, title);
      if (titleMapped) category = titleMapped;
    }

    items.push({
      title,
      link,
      description,
      content: content || description,
      publishedAt,
      author: author || undefined,
      imageUrl,
      category,
    });
  }

  return {
    title: feedTitle,
    items,
  };
}
