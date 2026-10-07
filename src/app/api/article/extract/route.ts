import { NextRequest, NextResponse } from 'next/server';
import { extractArticleFromHtml } from '@/lib/articleExtractor';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing target url parameter' }, { status: 400 });
  }

  // Security: Guard against SSRF / non-http URLs
  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return NextResponse.json(
        { error: 'Access to internal network is prohibited' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json({ error: 'Malformed URL provided' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 FeedPulseReader/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        {
          title: 'Article Source',
          byline: 'FeedPulse Editorial',
          paragraphs: [
            'The publisher requires direct subscription or has restricted automated readability extraction. You can view the original article directly.',
          ],
          wordCount: 20,
          readingTimeMinutes: 1,
          url: targetUrl,
        },
        { status: 200 }
      );
    }

    const html = await response.text();
    const extracted = extractArticleFromHtml(html, targetUrl);

    return NextResponse.json(extracted, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    // Graceful offline / fallback handling
    return NextResponse.json(
      {
        title: 'Article Story',
        byline: 'FeedPulse Editorial',
        paragraphs: [
          'Full-text extraction is temporarily offline or connection was reset. Showing editorial brief and summary.',
        ],
        wordCount: 15,
        readingTimeMinutes: 1,
        url: targetUrl,
      },
      { status: 200 }
    );
  }
}
