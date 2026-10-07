import {
  socialAdapter,
  mapSocialPosts,
  RawSocialPost,
  mastodonAdapter,
  fetchLiveMastodonFeed,
} from '@/lib/adapters/socialAdapter';

describe('socialAdapter', () => {
  const samplePost: RawSocialPost = {
    id: 'post-101',
    author: {
      name: 'Elena Rostova',
      handle: '@elena_ai',
      avatar: 'https://example.com/avatar.jpg',
    },
    content: 'Autonomous multi-agent systems are scaling rapidly! 🚀',
    category: 'technology',
    hashtags: ['#ai', '#tech', '#agents'],
    publishedAt: '2026-03-03T11:20:00Z',
    mediaUrl: 'https://example.com/media.jpg',
  };

  it('maps RawSocialPost to normalized ContentItem with hashtags stripped of #', () => {
    const item = socialAdapter(samplePost, false);

    expect(item.source).toBe('social');
    expect(item.id).toBe('social-post-101');
    expect(item.title).toBe('Elena Rostova (@elena_ai)');
    expect(item.description).toBe('Autonomous multi-agent systems are scaling rapidly! 🚀');
    expect(item.author).toBe('Elena Rostova @elena_ai');
    expect(item.imageUrl).toBe('https://example.com/media.jpg');
    expect(item.category).toBe('technology');
    expect(item.publishedAt).toBe('2026-03-03T11:20:00Z');
    expect(item.hashtags).toEqual(['ai', 'tech', 'agents']);
    expect(item.isDemo).toBe(false);
  });

  it('uses avatar as image if mediaUrl is missing', () => {
    const textPost: RawSocialPost = {
      id: 'social-text-200',
      author: {
        name: 'John Doe',
        handle: '@johndoe',
        avatar: 'https://example.com/avatar2.jpg',
      },
      content: 'Just thinking about distributed systems today.',
      publishedAt: '2026-03-03T13:00:00Z',
    };

    const item = socialAdapter(textPost, true);
    expect(item.id).toBe('social-text-200');
    expect(item.imageUrl).toBe('https://example.com/avatar2.jpg');
    expect(item.isDemo).toBe(true);
    expect(item.category).toBe('social');
  });

  it('safely maps an array of social posts', () => {
    const posts = [
      samplePost,
      null,
      { id: 'p2', author: { name: 'A', handle: '@a' }, content: 'Hi' },
    ];
    // @ts-expect-error test invalid array element
    const items = mapSocialPosts(posts);
    expect(items).toHaveLength(2);
  });

  it('normalizes Mastodon status into RawSocialPost', () => {
    const mastoStatus = {
      id: '1122334455',
      created_at: '2026-03-03T12:00:00Z',
      content: '<p>Exploring open decentralized feeds! <br />#opensource</p>',
      account: {
        display_name: 'OpenDev',
        acct: 'opendev@mastodon.social',
        avatar: 'https://example.com/masto.png',
      },
      tags: [{ name: 'opensource' }],
      favourites_count: 42,
      reblogs_count: 10,
    };

    const post = mastodonAdapter(mastoStatus);
    expect(post.id).toBe('masto-1122334455');
    expect(post.author.name).toBe('OpenDev');
    expect(post.author.handle).toBe('@opendev@mastodon.social');
    expect(post.content).toContain('Exploring open decentralized feeds!');
    expect(post.metrics?.likes).toBe(42);
  });

  it('fetches live Mastodon feed with graceful fallback on network failure', async () => {
    const originalFetch = global.fetch;

    global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));
    const results = await fetchLiveMastodonFeed(5);
    expect(results).toEqual([]);

    global.fetch = originalFetch;
  });
});
