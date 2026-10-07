import { NextRequest } from 'next/server';
import { ContentItem } from '@/types/content';
import { getTranslator } from '@/lib/translation';
import { translateArticleWithEngine } from '@/lib/translation/multilingualEngine';
import { newsBroadcaster, NewsBroadcastEvent } from '@/lib/events/newsBroadcaster';
import { startRssIngestionScheduler } from '@/lib/rss/rssIngestionService';

export const dynamic = 'force-dynamic';

const DEMO_LIVE_TEMPLATES: Omit<ContentItem, 'id' | 'publishedAt'>[] = [
  {
    source: 'news',
    title: 'Quantum Advantage Validated in New Commercial Optimization Benchmark',
    description:
      'Independent audit firms verify quantum annealer achieves quadratic speedup for large supply chain routing.',
    content:
      'Independent audit firms and research organizations have officially validated that commercial quantum annealers can solve massive, complex logistics and routing optimizations with quadratic speedups over classical supercomputers.\n\nIn standardized industrial benchmarks, the quantum hardware evaluated millions of interdependent delivery variables, fleet schedules, and warehouse bottlenecks simultaneously in seconds—tasks that previously required days of heavy computing time on traditional server clusters.\n\nThis milestone represents one of the very first verified demonstrations of commercial quantum utility, confirming that quantum processors can provide tangible economic benefits for real-world enterprise operations.',
    category: 'technology',
    author: 'Tech Wire Daily',
    url: '#',
    imageUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    hashtags: ['quantum', 'computing', 'tech'],
    isDemo: true,
    isLive: true,
    isBreaking: true,
  },
  {
    source: 'news',
    title: 'Clean Energy Grid Reaches 85% Renewable Peak Across Central Europe',
    description:
      'Combined wind, solar, and alpine hydro generation set a historic grid decarbonization milestone during daylight hours.',
    content:
      'Transmission system operators confirmed that renewable energy generation peaked at 85.4% of total electrical load today across Central European interconnected grids.\n\nGrid stability was maintained through ultra-fast battery storage response facilities and pumped hydro storage basins, proving the viability of high-penetration clean energy systems.\n\nWholesale electricity prices dipped into negative territory for several hours, providing immediate cost relief to industrial manufacturers and municipal consumers.',
    category: 'environment',
    author: 'Renewable Power Monitor',
    url: '#',
    imageUrl:
      'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&auto=format&fit=crop&q=80',
    hashtags: ['cleanenergy', 'solar', 'grid'],
    isDemo: true,
    isLive: true,
    isBreaking: true,
  },
  {
    source: 'news',
    title: 'Global Semiconductor Consortium Unveils 1nm Test Platform',
    description:
      'Pilot production lines demonstrate operational gate-all-around architectures utilizing 2D transitional metal materials.',
    content:
      "A worldwide consortium of premier semiconductor manufacturers has unveiled the industry's first operational test platform for 1-nanometer transistor architectures.\n\nAs conventional silicon chips approach the physical limits of atomic scaling, this new architecture utilizes novel two-dimensional transition metal dichalcogenide materials and gate-all-around (GAA) designs to prevent electrical current leakage.\n\nThe breakthrough enables chipmakers to pack tens of billions of additional microscopic transistors onto single fingernail-sized chips, delivering up to 30% higher processing speeds while consuming 40% less electrical power.",
    category: 'technology',
    author: 'Semiconductor Digest',
    url: '#',
    imageUrl:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    hashtags: ['hardware', 'chips', 'tech'],
    isDemo: true,
    isLive: true,
    isBreaking: true,
  },
  {
    source: 'news',
    title: 'Precision Cardiology Trial Reports 50% Reduction in Arterial Plaque',
    description:
      'Targeted nanoparticle infusion selectively dissolves calcified lipid plaques in multi-center clinical study.',
    content:
      'Cardiology teams from twelve university hospitals presented Phase II clinical trial data showing dramatic regression of coronary atherosclerosis in patients receiving targeted lipid-clearing nanoparticles.\n\nThe therapy utilizes synthetic peptide amphiphiles that bind specifically to micro-calcifications inside blood vessels, breaking down stubborn arterial deposits without triggering systemic inflammation or embolisms.\n\nLead researchers stated that the therapy could represent the first non-surgical reversal of advanced coronary artery disease.',
    category: 'health',
    author: 'Medical Breakthroughs Journal',
    url: '#',
    imageUrl:
      'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80',
    hashtags: ['health', 'cardiology', 'medicine'],
    isDemo: true,
    isLive: true,
    isBreaking: true,
  },
];

async function prepareItemForLanguage(item: ContentItem, lang: string): Promise<ContentItem> {
  if (!lang || lang === 'en') return item;

  try {
    const translator = getTranslator();
    const trans = await translator.translateArticle(item, lang);
    return {
      ...item,
      title: trans.title,
      description: trans.description,
      content: trans.content || item.content,
      simplifiedOverview: trans.description,
      language: trans.language,
      isTranslated: true,
      originalTitle: trans.originalTitle || item.title,
      originalDescription: trans.originalDescription || item.description,
      originalContent: trans.originalContent || item.content,
    };
  } catch {
    const fallbackTrans = translateArticleWithEngine(item, lang);
    return {
      ...item,
      title: fallbackTrans.title,
      description: fallbackTrans.description,
      content: fallbackTrans.content || item.content,
      simplifiedOverview: fallbackTrans.description,
      language: fallbackTrans.language,
      isTranslated: true,
      originalTitle: item.title,
      originalDescription: item.description,
      originalContent: item.content,
    };
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const searchParams = request.nextUrl.searchParams;
  const lang = (searchParams.get('lang') || 'en').toLowerCase().trim();
  const allowDemoCadence = searchParams.get('demo') === 'true';
  const rawInterval = searchParams.get('interval');
  const intervalMs = rawInterval ? Math.max(5000, parseInt(rawInterval, 10)) : 35000;

  // Ensure periodic backend ingestion scheduler is running
  if (process.env.NODE_ENV !== 'test') {
    startRssIngestionScheduler();
  }

  let demoIndex = Math.floor(Math.random() * DEMO_LIVE_TEMPLATES.length);

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      // Send initial connected acknowledgement
      try {
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({
              status: 'connected',
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        );
      } catch {
        // Closed before connect
        return;
      }

      // Safe enqueue helper
      const safeEnqueue = (payload: string) => {
        if (isClosed || controller.desiredSize === null || controller.desiredSize <= 0) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          isClosed = true;
        }
      };

      // Subscribe to real-time article changes from configured news sources
      const unsubscribe = newsBroadcaster.subscribeToNewsChanges(
        async (event: NewsBroadcastEvent) => {
          if (isClosed) return;
          try {
            const localizedItem = await prepareItemForLanguage(event.item, lang);
            if (event.type === 'new_article') {
              safeEnqueue(`event: new_item\ndata: ${JSON.stringify(localizedItem)}\n\n`);
            } else if (event.type === 'updated_article') {
              safeEnqueue(`event: article_updated\ndata: ${JSON.stringify(localizedItem)}\n\n`);
            }
          } catch {
            // Ignore error if stream disconnected
          }
        }
      );

      // Periodic heartbeat to prevent proxy timeouts
      const heartbeatTimer = setInterval(() => {
        safeEnqueue(': heartbeat\n\n');
      }, 15000);
      if (typeof heartbeatTimer.unref === 'function') {
        heartbeatTimer.unref();
      }

      // Optional demo pulse when requested or for simulated testing
      let demoTimer: NodeJS.Timeout | null = null;
      if (allowDemoCadence) {
        demoTimer = setInterval(async () => {
          if (isClosed) return;
          const template = DEMO_LIVE_TEMPLATES[demoIndex % DEMO_LIVE_TEMPLATES.length];
          demoIndex++;

          let demoItem: ContentItem = {
            ...template,
            id: `live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            publishedAt: new Date().toISOString(),
            isLive: true,
            isBreaking: template.isBreaking ?? true,
          };

          demoItem = await prepareItemForLanguage(demoItem, lang);
          safeEnqueue(`event: new_item\ndata: ${JSON.stringify(demoItem)}\n\n`);
        }, intervalMs);

        if (typeof demoTimer.unref === 'function') {
          demoTimer.unref();
        }
      }

      // Cleanup on client abort / disconnect
      request.signal.addEventListener('abort', () => {
        isClosed = true;
        unsubscribe();
        clearInterval(heartbeatTimer);
        if (demoTimer) clearInterval(demoTimer);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
