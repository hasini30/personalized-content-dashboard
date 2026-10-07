import { EventEmitter } from 'events';
import { ContentItem } from '@/types/content';

export type NewsBroadcastEventType = 'new_article' | 'updated_article';

export interface NewsBroadcastEvent {
  type: NewsBroadcastEventType;
  item: ContentItem;
  timestamp: string;
}

class NewsBroadcaster {
  private emitter: EventEmitter;
  private recentEvents: NewsBroadcastEvent[] = [];
  private maxRecent = 20;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  /**
   * Broadcasts a newly published article to all active subscribers.
   */
  broadcastNewArticle(article: ContentItem): void {
    const event: NewsBroadcastEvent = {
      type: 'new_article',
      item: {
        ...article,
        isLive: true,
      },
      timestamp: new Date().toISOString(),
    };
    this.recordRecentEvent(event);
    this.emitter.emit('change', event);
    this.emitter.emit('new_article', event.item);
  }

  /**
   * Broadcasts an updated existing article to all active subscribers.
   */
  broadcastUpdatedArticle(article: ContentItem): void {
    const event: NewsBroadcastEvent = {
      type: 'updated_article',
      item: {
        ...article,
        isUpdated: true,
        updatedAt: article.updatedAt || new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    this.recordRecentEvent(event);
    this.emitter.emit('change', event);
    this.emitter.emit('updated_article', event.item);
  }

  /**
   * Broadcasts a batch of detected additions and updates.
   */
  broadcastBatchChanges(newArticles: ContentItem[], updatedArticles: ContentItem[]): void {
    for (const article of newArticles) {
      this.broadcastNewArticle(article);
    }
    for (const article of updatedArticles) {
      this.broadcastUpdatedArticle(article);
    }
  }

  /**
   * Subscribes to all real-time article change events (both new and updated).
   * Returns an unsubscribe function.
   */
  subscribeToNewsChanges(listener: (event: NewsBroadcastEvent) => void): () => void {
    this.emitter.on('change', listener);
    return () => {
      this.emitter.off('change', listener);
    };
  }

  /**
   * Subscribes specifically to new article publications.
   */
  subscribeToNewArticles(listener: (article: ContentItem) => void): () => void {
    this.emitter.on('new_article', listener);
    return () => {
      this.emitter.off('new_article', listener);
    };
  }

  /**
   * Subscribes specifically to existing article updates.
   */
  subscribeToUpdatedArticles(listener: (article: ContentItem) => void): () => void {
    this.emitter.on('updated_article', listener);
    return () => {
      this.emitter.off('updated_article', listener);
    };
  }

  /**
   * Returns recent events retained in memory buffer.
   */
  getRecentEvents(limit = 10): NewsBroadcastEvent[] {
    return this.recentEvents.slice(0, limit);
  }

  /**
   * Resets recent events (used in tests).
   */
  clearRecentEvents(): void {
    this.recentEvents = [];
  }

  private recordRecentEvent(event: NewsBroadcastEvent): void {
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxRecent) {
      this.recentEvents.pop();
    }
  }
}

// Global singleton instance across Next.js module reloads
const globalForBroadcaster = globalThis as unknown as { newsBroadcasterInstance?: NewsBroadcaster };

export const newsBroadcaster =
  globalForBroadcaster.newsBroadcasterInstance || new NewsBroadcaster();

if (process.env.NODE_ENV !== 'production') {
  globalForBroadcaster.newsBroadcasterInstance = newsBroadcaster;
}
