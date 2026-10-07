import { newsBroadcaster, NewsBroadcastEvent } from '@/lib/events/newsBroadcaster';
import { ContentItem } from '@/types/content';

describe('newsBroadcaster Real-Time Event Bus', () => {
  beforeEach(() => {
    newsBroadcaster.clearRecentEvents();
  });

  const sampleArticle: ContentItem = {
    id: 'test-news-1',
    source: 'news',
    title: 'Scientists Discover New Superconductor Material',
    description: 'Ambient pressure room-temperature superconductivity milestone.',
    category: 'science',
    publishedAt: '2026-10-06T10:00:00.000Z',
    url: 'https://news.local/superconductor',
    author: 'Science Daily',
  };

  it('broadcasts newly published articles and notifies subscribers', (done) => {
    const unsubscribe = newsBroadcaster.subscribeToNewsChanges((event: NewsBroadcastEvent) => {
      expect(event.type).toBe('new_article');
      expect(event.item.id).toBe(sampleArticle.id);
      expect(event.item.isLive).toBe(true);
      unsubscribe();
      done();
    });

    newsBroadcaster.broadcastNewArticle(sampleArticle);
  });

  it('broadcasts updated articles with isUpdated badge and timestamp', (done) => {
    const updatedArticle: ContentItem = {
      ...sampleArticle,
      title: 'UPDATE: Room-Temperature Superconductor Validated by National Lab',
    };

    const unsubscribe = newsBroadcaster.subscribeToNewsChanges((event: NewsBroadcastEvent) => {
      expect(event.type).toBe('updated_article');
      expect(event.item.title).toBe(
        'UPDATE: Room-Temperature Superconductor Validated by National Lab'
      );
      expect(event.item.isUpdated).toBe(true);
      expect(event.item.updatedAt).toBeDefined();
      unsubscribe();
      done();
    });

    newsBroadcaster.broadcastUpdatedArticle(updatedArticle);
  });

  it('notifies specific new_article and updated_article listeners', () => {
    const newListener = jest.fn();
    const updateListener = jest.fn();

    const unsubNew = newsBroadcaster.subscribeToNewArticles(newListener);
    const unsubUpdate = newsBroadcaster.subscribeToUpdatedArticles(updateListener);

    newsBroadcaster.broadcastNewArticle(sampleArticle);
    expect(newListener).toHaveBeenCalledTimes(1);
    expect(updateListener).not.toHaveBeenCalled();

    newsBroadcaster.broadcastUpdatedArticle(sampleArticle);
    expect(updateListener).toHaveBeenCalledTimes(1);

    unsubNew();
    unsubUpdate();
  });

  it('buffers and retrieves recent broadcast events', () => {
    newsBroadcaster.broadcastNewArticle(sampleArticle);
    newsBroadcaster.broadcastUpdatedArticle({
      ...sampleArticle,
      title: 'Headline Updated',
    });

    const recent = newsBroadcaster.getRecentEvents();
    expect(recent).toHaveLength(2);
    expect(recent[0].type).toBe('updated_article');
    expect(recent[1].type).toBe('new_article');
  });
});
