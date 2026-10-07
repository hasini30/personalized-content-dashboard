import { NextRequest } from 'next/server';
import { GET } from '@/app/api/article/extract/route';
import { extractArticleFromHtml } from '@/lib/articleExtractor';

describe('Article Extractor Route & Parser', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Breakthrough in Fusion Energy Demonstrated</title>
        <meta name="author" content="Dr. Sarah Jenkins" />
        <meta property="og:image" content="https://example.com/fusion.jpg" />
      </head>
      <body>
        <nav><a href="/">Home</a><a href="/news">News</a></nav>
        <header><h1>Header Navigation Banner</h1></header>
        <script>console.log("tracking");</script>
        <style>.ad { display: block; }</style>
        
        <main>
          <p>Short</p>
          <p>Physicists and nuclear engineers at the national laboratory have officially recorded a net energy gain during magnetic confinement fusion experiments.</p>
          <p>The achievement marks a critical milestone toward clean, limitless baseload energy production without long-lived radioactive waste products.</p>
        </main>
        
        <footer><p>Copyright 2026</p></footer>
      </body>
    </html>
  `;

  it('extracts title, author, and paragraphs while stripping boilerplate', () => {
    const extracted = extractArticleFromHtml(sampleHtml, 'https://example.com/fusion-news');
    expect(extracted.title).toBe('Breakthrough in Fusion Energy Demonstrated');
    expect(extracted.byline).toBe('Dr. Sarah Jenkins');
    expect(extracted.leadImageUrl).toBe('https://example.com/fusion.jpg');
    expect(extracted.paragraphs.length).toBe(2);
    expect(extracted.paragraphs[0]).toContain('Physicists and nuclear engineers');
    expect(extracted.wordCount).toBeGreaterThan(30);
    expect(extracted.readingTimeMinutes).toBeGreaterThanOrEqual(1);
  });

  it('returns 400 when url parameter is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/article/extract');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing target url parameter');
  });

  it('blocks SSRF attacks to internal addresses', async () => {
    const internalUrls = [
      'http://localhost:8080/admin',
      'http://127.0.0.1:3000',
      'http://0.0.0.0',
      'http://service.internal/secret',
    ];

    for (const url of internalUrls) {
      const req = new NextRequest(
        `http://localhost:3000/api/article/extract?url=${encodeURIComponent(url)}`
      );
      const res = await GET(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('prohibited');
    }
  });

  it('blocks invalid protocol schemes', async () => {
    const req = new NextRequest('http://localhost:3000/api/article/extract?url=file:///etc/passwd');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('handles external URL extraction successfully with mock fetch', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(sampleHtml),
    } as unknown as Response);

    const req = new NextRequest(
      'http://localhost:3000/api/article/extract?url=https://reuters.com/tech-fusion'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe('Breakthrough in Fusion Energy Demonstrated');
    expect(json.paragraphs.length).toBe(2);

    global.fetch = originalFetch;
  });

  it('returns graceful fallback when external publisher fetch fails', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const req = new NextRequest(
      'http://localhost:3000/api/article/extract?url=https://failing-site.com/article'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.paragraphs.length).toBeGreaterThan(0);
    expect(json.paragraphs[0]).toContain('temporarily offline');

    global.fetch = originalFetch;
  });
});
