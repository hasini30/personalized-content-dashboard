/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/article/[id]/route';
import { setSummarizer } from '@/lib/summarizer';
import { Summarizer, SummarizerResult } from '@/lib/summarizer/types';

describe('/api/article/[id] Route Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    setSummarizer(null);
  });

  afterEach(() => {
    process.env = originalEnv;
    setSummarizer(null);
  });

  it('GET /api/article/[id] returns 200 with summary for English by default', async () => {
    const req = new NextRequest('http://localhost:3000/api/article/news-quantum-deep');
    const res = await GET(req, { params: { id: 'news-quantum-deep' } });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('news-quantum-deep');
    expect(data.lang).toBe('en');
    expect(data.summary).toBeDefined();
    expect(data.summary.simpleOverview).toBeDefined();
    expect(Array.isArray(data.summary.bulletPoints)).toBe(true);
    expect(res.headers.get('cache-control')).toContain('public');
    expect(res.headers.get('x-ratelimit-limit')).toBeDefined();
  });

  it('GET /api/article/[id]?lang=te returns translated summary with requested language code', async () => {
    const mockTeluguResult: SummarizerResult = {
      summary: {
        simpleOverview: 'శాస్త్రవేత్తలు క్వాంటమ్ కంప్యూటింగ్‌లో గణనీయమైన పురోగతిని సాధించారు.',
        bulletPoints: [
          'ఏమి జరిగింది: సాధారణ ఉష్ణోగ్రత వద్ద పనిచేసే సూపర్ కండక్టర్లను రూపొందించారు.',
          'ఎందుకు ముఖ్యం: సాంకేతిక రంగంలో విప్లవాత్మక మార్పులు వస్తాయి.',
        ],
      },
      modelUsed: 'mock-telugu-model',
      isFallback: false,
      isGrounded: true,
      groundingScore: 0.9,
    };

    const mockSummarizer: Summarizer = {
      name: 'CustomTestSummarizer',
      summarize: jest.fn().mockResolvedValue(mockTeluguResult),
    };
    setSummarizer(mockSummarizer);

    const req = new NextRequest('http://localhost:3000/api/article/news-quantum-deep?lang=te');
    const res = await GET(req, { params: { id: 'news-quantum-deep' } });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lang).toBe('te');
    expect(data.summary.simpleOverview).toContain('శాస్త్రవేత్తలు');
    expect(data.modelUsed).toBe('mock-telugu-model');
  });

  it('POST /api/article/[id] accepts custom article body data for ad-hoc summarization', async () => {
    const customArticle = {
      title: 'Revolutionary Solid-State Battery Commercialized',
      description: 'Automaker begins volume manufacturing of 1000km range cells.',
      content:
        'The solid electrolyte enables rapid 10-minute charging cycles with zero thermal runaway risks.',
      category: 'technology',
    };

    const req = new NextRequest('http://localhost:3000/api/article/art-battery-1', {
      method: 'POST',
      body: JSON.stringify(customArticle),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req, { params: { id: 'art-battery-1' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('art-battery-1');
    expect(data.summary.simpleOverview).toBeDefined();
  });

  it('enforces rate limiting and returns 429 when IP exceeds quota', async () => {
    const spamIp = '203.0.113.88';

    // Exhaust quota (60 requests)
    for (let i = 0; i < 60; i++) {
      const req = new NextRequest('http://localhost:3000/api/article/test-rate-limit', {
        headers: { 'x-forwarded-for': spamIp },
      });
      await GET(req, { params: { id: 'test-rate-limit' } });
    }

    // 61st request triggers rate limiter
    const blockedReq = new NextRequest('http://localhost:3000/api/article/test-rate-limit', {
      headers: { 'x-forwarded-for': spamIp },
    });
    const blockedRes = await GET(blockedReq, { params: { id: 'test-rate-limit' } });

    expect(blockedRes.status).toBe(429);
    const blockedData = await blockedRes.json();
    expect(blockedData.error).toBe('Too Many Requests');
    expect(blockedRes.headers.get('retry-after')).toBeDefined();
  });

  it('handles summarizer exceptions gracefully with 500 status', async () => {
    const failingSummarizer: Summarizer = {
      name: 'FailingSummarizer',
      summarize: jest.fn().mockRejectedValue(new Error('Fatal upstream failure')),
    };
    setSummarizer(failingSummarizer);

    const req = new NextRequest('http://localhost:3000/api/article/fail-id');
    const res = await GET(req, { params: { id: 'fail-id' } });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal Server Error');
    expect(data.message).toBe('Fatal upstream failure');
    expect(data.isFallback).toBe(true);
  });
});
