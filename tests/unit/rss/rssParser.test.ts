import {
  parseRssXml,
  decodeXmlEntities,
  stripHtmlTags,
  extractImageUrl,
} from '@/lib/rss/rssParser';

describe('RSS XML Parser', () => {
  it('decodes XML and HTML entities cleanly', () => {
    const raw = '&lt;b&gt;Tech &amp; AI Breakthroughs&lt;/b&gt; &quot;2026&quot; &#39;Special&#39;';
    const decoded = decodeXmlEntities(raw);
    expect(decoded).toBe('<b>Tech & AI Breakthroughs</b> "2026" \'Special\'');
  });

  it('strips HTML tags and styles', () => {
    const html =
      '<p>The global <strong>clean energy</strong> grid is expanding.<style>.x{color:red}</style></p>';
    const text = stripHtmlTags(html);
    expect(text).toBe('The global clean energy grid is expanding.');
  });

  it('extracts image URLs from enclosure, media:content, and img tags', () => {
    const enclosureXml = '<enclosure url="https://example.com/photo.jpg" type="image/jpeg" />';
    expect(extractImageUrl(enclosureXml)).toBe('https://example.com/photo.jpg');

    const mediaXml = '<media:content url="https://example.com/media.webp" medium="image" />';
    expect(extractImageUrl(mediaXml)).toBe('https://example.com/media.webp');

    const imgXml =
      '<description><![CDATA[<img src="https://example.com/inline.png" /> Story summary.]]></description>';
    expect(extractImageUrl(imgXml)).toBe('https://example.com/inline.png');
  });

  it('parses standard RSS 2.0 XML with items', () => {
    const sampleXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
        <channel>
          <title>The Verge - Tech News</title>
          <item>
            <title><![CDATA[Quantum Processors Reach Commercial Scale]]></title>
            <link>https://theverge.com/quantum-scale-2026</link>
            <description><![CDATA[<p>Researchers have proven quantum annealers achieve quadratic speedup.</p>]]></description>
            <pubDate>Sun, 04 Oct 2026 12:00:00 GMT</pubDate>
            <author>alex.reporter@theverge.com (Alex Reporter)</author>
            <media:content url="https://theverge.com/images/quantum.jpg" />
            <category>Technology</category>
          </item>
        </channel>
      </rss>
    `;

    const feed = parseRssXml(sampleXml, 'technology');
    expect(feed.title).toBe('The Verge - Tech News');
    expect(feed.items).toHaveLength(1);

    const item = feed.items[0];
    expect(item.title).toBe('Quantum Processors Reach Commercial Scale');
    expect(item.link).toBe('https://theverge.com/quantum-scale-2026');
    expect(item.description).toBe(
      'Researchers have proven quantum annealers achieve quadratic speedup.'
    );
    expect(item.author).toBe('Alex Reporter');
    expect(item.imageUrl).toBe('https://theverge.com/images/quantum.jpg');
    expect(item.category).toBe('technology');
  });

  it('parses Atom XML feeds with entries and link hrefs', () => {
    const atomXml = `
      <?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Ars Technica</title>
        <entry>
          <title>Next-Gen Silicon Photonics</title>
          <link href="https://arstechnica.com/photonics-2026" />
          <summary>Optical interconnects slash latency.</summary>
          <updated>2026-10-04T10:00:00Z</updated>
          <author><name>Will Knight</name></author>
          <category term="Hardware" />
        </entry>
      </feed>
    `;

    const feed = parseRssXml(atomXml, 'technology');
    expect(feed.title).toBe('Ars Technica');
    expect(feed.items).toHaveLength(1);

    const item = feed.items[0];
    expect(item.title).toBe('Next-Gen Silicon Photonics');
    expect(item.link).toBe('https://arstechnica.com/photonics-2026');
    expect(item.description).toBe('Optical interconnects slash latency.');
    expect(item.author).toBe('Will Knight');
  });
});
