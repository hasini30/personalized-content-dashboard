import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { globalApiRateLimiter } from '@/lib/rateLimit';
import { languageCodeSchema } from '@/lib/languages';
import { getSummarizer } from '@/lib/summarizer';
import { findNewsArticleById } from '@/lib/newsEngine';

const querySchema = z.object({
  lang: languageCodeSchema.default('en'),
});

const bodySchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
    category: z.string().optional(),
  })
  .optional();

async function handleSummarization(
  id: string,
  lang: string,
  providedData?: { title?: string; description?: string; content?: string; category?: string }
) {
  // Find article in engine / fixtures or use provided data
  const found = findNewsArticleById(id);

  const title = providedData?.title || found?.title || 'Breaking News Story';
  const description = providedData?.description || found?.description || '';
  const content = providedData?.content || found?.content || description;
  const category = providedData?.category || found?.category || 'general';

  const summarizer = getSummarizer();
  const result = await summarizer.summarize(
    {
      id,
      title,
      description,
      content,
      category,
    },
    lang
  );

  return result;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = globalApiRateLimiter.check(`article:${ip}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again shortly.',
          isFallback: true,
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

    const lang = parsed.success ? parsed.data.lang : 'en';
    const id = params.id;

    const result = await handleSummarization(id, lang);

    return NextResponse.json(
      {
        id,
        lang,
        summary: result.summary,
        modelUsed: result.modelUsed,
        isFallback: result.isFallback,
        isGrounded: result.isGrounded,
        groundingScore: result.groundingScore,
        error: result.error,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: (error as Error).message,
        isFallback: true,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = globalApiRateLimiter.check(`article:${ip}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again shortly.',
          isFallback: true,
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
    const lang = parsedQuery.success ? parsedQuery.data.lang : 'en';

    let bodyData;
    try {
      const json = await request.json();
      const parsedBody = bodySchema.safeParse(json);
      if (parsedBody.success) {
        bodyData = parsedBody.data;
      }
    } catch {
      // Body is optional
    }

    const id = params.id;
    const result = await handleSummarization(id, lang, bodyData);

    return NextResponse.json(
      {
        id,
        lang,
        summary: result.summary,
        modelUsed: result.modelUsed,
        isFallback: result.isFallback,
        isGrounded: result.isGrounded,
        groundingScore: result.groundingScore,
        error: result.error,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: (error as Error).message,
        isFallback: true,
      },
      { status: 500 }
    );
  }
}
