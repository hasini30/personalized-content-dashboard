'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  X,
  Heart,
  Share2,
  Clock,
  Calendar,
  User,
  Check,
  Sparkles,
  Newspaper,
  Film,
  MessageSquare,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  Languages,
  Bot,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ContentItem } from '@/types/content';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleFavorite } from '@/features/favorites/favoritesSlice';
import { getUnderstandableSummary, getComprehensiveStory } from '@/lib/newsSummaryUtils';
import { useTranslation } from 'react-i18next';
import { useGetArticleSummaryQuery } from '@/services/api';
import { isValidExternalUrl } from '@/lib/feedUtils';

export interface ArticleReaderModalProps {
  item: ContentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArticleReaderModal({ item, isOpen, onClose }: ArticleReaderModalProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [copied, setCopied] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'summary' | 'detailed'>('summary');
  const [fontSize, setFontSize] = React.useState<'base' | 'lg'>('base');
  const [fontFamily, setFontFamily] = React.useState<'sans' | 'serif'>('sans');
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [extractedArticle, setExtractedArticle] = React.useState<{
    paragraphs: string[];
    wordCount: number;
    readingTimeMinutes: number;
  } | null>(null);

  const isFavorite = useAppSelector((state) =>
    item ? state.favorites.items.some((f) => f.id === item.id) : false
  );

  // Fetch full article text from extractor if it is an external news story
  React.useEffect(() => {
    if (isOpen && item && item.source === 'news' && isValidExternalUrl(item.url, item.isDemo)) {
      fetch(`/api/article/extract?url=${encodeURIComponent(item.url)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.paragraphs && data.paragraphs.length > 0) {
            setExtractedArticle(data);
          }
        })
        .catch(() => {});
    } else {
      setExtractedArticle(null);
    }
  }, [isOpen, item]);

  // Reset state when opening a new item
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('summary');
      setImageError(false);
      setShowOriginal(false);
    }
  }, [isOpen, item?.id]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const displayItem = React.useMemo(() => {
    if (!item) return null;
    if (showOriginal && item.isTranslated) {
      return {
        ...item,
        title: item.originalTitle || item.title,
        description: item.originalDescription || item.description,
        content: item.originalContent || item.content,
      };
    }
    return item;
  }, [item, showOriginal]);

  const targetLang = showOriginal ? 'en' : displayItem?.language || 'en';

  // Summarize on first article open, never for the whole feed
  const {
    data: summaryData,
    isLoading: isAiSummarizing,
    isError: isAiSummaryError,
  } = useGetArticleSummaryQuery(
    {
      id: item?.id || '',
      lang: targetLang,
      title: displayItem?.title,
      description: displayItem?.description,
      content: displayItem?.content,
      category: displayItem?.category,
    },
    {
      skip: !isOpen || !item || item.source !== 'news',
    }
  );

  const comprehensiveStory = React.useMemo(
    () => (displayItem ? getComprehensiveStory(displayItem, targetLang) : null),
    [displayItem, targetLang]
  );

  const fallbackSummary = React.useMemo(
    () => (displayItem ? getUnderstandableSummary(displayItem, targetLang) : null),
    [displayItem, targetLang]
  );

  if (!isOpen || !item || !displayItem || !comprehensiveStory || !fallbackSummary) return null;

  // Use AI summary if successfully generated, else fallback to standard brief
  const understandableSummary =
    summaryData?.summary && !summaryData.isFallback ? summaryData.summary : fallbackSummary;

  const isRtl = !showOriginal && item.language === 'ur';

  const handleFavorite = () => {
    dispatch(toggleFavorite(item));
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        const shareText = `${displayItem.title}\n\nSummary: ${understandableSummary.simpleOverview}`;
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const readTimeEstimate = () => {
    if (activeTab === 'summary') {
      return t('reader.easyReadEstimate') || '1 min easy summary';
    }
    const text = comprehensiveStory.paragraphs.join(' ');
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 180));
    return `${minutes} min read`;
  };

  const formattedDate = () => {
    try {
      return new Date(item.publishedAt).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return item.publishedAt;
    }
  };

  const getSourceIcon = () => {
    switch (item.source) {
      case 'news':
        return <Newspaper className="h-4 w-4" />;
      case 'movie':
        return <Film className="h-4 w-4" />;
      case 'social':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Newspaper className="h-4 w-4" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Backdrop click dismiss */}
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl transition-all my-auto max-h-[90vh] flex flex-col"
      >
        {/* Top Header Navigation Bar */}
        <div className="flex items-center justify-between border-b border-border px-5 sm:px-6 py-3.5 bg-muted/30 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                item.source === 'news'
                  ? 'news'
                  : item.source === 'movie'
                    ? 'movie'
                    : 'social'
              }
              className="gap-1.5 capitalize"
            >
              {getSourceIcon()}
              <span>{item.source}</span>
            </Badge>
            <span className="text-xs text-muted-foreground capitalize font-medium">
              • {item.category}
            </span>

            {item.isPreferred && (
              <Badge
                variant="secondary"
                className="gap-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold"
              >
                <span>★ Preferred</span>
              </Badge>
            )}

            {summaryData?.modelUsed && !summaryData?.isFallback && (
              <Badge
                variant="secondary"
                className="gap-1 bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-medium"
              >
                <Bot className="h-3 w-3" />
                <span>AI Summary</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Font family toggle */}
            <button
              type="button"
              onClick={() => setFontFamily((prev) => (prev === 'sans' ? 'serif' : 'sans'))}
              title={`Switch to ${fontFamily === 'sans' ? 'Serif' : 'Sans-Serif'} typography`}
              className="hidden sm:flex h-8 px-2.5 items-center justify-center rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {fontFamily === 'sans' ? 'Serif' : 'Sans'}
            </button>

            {/* Font size toggle */}
            <button
              type="button"
              onClick={() => setFontSize((prev) => (prev === 'base' ? 'lg' : 'base'))}
              title={`Switch to ${fontSize === 'base' ? 'larger' : 'standard'} text size`}
              className="hidden sm:flex h-8 px-2.5 items-center justify-center rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {fontSize === 'base' ? 'A+' : 'A-'}
            </button>

            <button
              type="button"
              onClick={handleFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  isFavorite
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-muted-foreground hover:text-rose-500'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Share article summary"
              title="Copy summary to clipboard"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Share2 className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close reader"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Translation Status Bar (if translated) */}
        {item.isTranslated && (
          <div className="flex items-center justify-between px-5 sm:px-6 py-2 bg-blue-500/10 border-b border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
            <div className="flex items-center gap-1.5 font-medium">
              <Languages className="h-3.5 w-3.5" />
              <span>
                {showOriginal
                  ? 'Showing original English text'
                  : `Translated to your selected language (${item.language?.toUpperCase()})`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowOriginal((prev) => !prev)}
              className="font-semibold underline hover:text-blue-800 dark:hover:text-blue-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {showOriginal ? 'Switch to Translated' : 'View Original English'}
            </button>
          </div>
        )}

        {/* AI Summarizer Notice / Status Banner */}
        {item.source === 'news' && (
          <>
            {isAiSummarizing && (
              <div className="flex items-center gap-2 px-5 sm:px-6 py-2 bg-purple-500/10 border-b border-purple-500/20 text-xs text-purple-700 dark:text-purple-300">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                <span className="font-medium">
                  Generating verified AI executive summary with OpenRouter...
                </span>
              </div>
            )}

            {(isAiSummaryError || (summaryData?.error && summaryData?.isFallback)) && (
              <div className="flex items-center gap-2 px-5 sm:px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Summary unavailable right now. Showing standard editorial brief.</span>
              </div>
            )}
          </>
        )}

        {/* Scrollable Article Body */}
        <div className="overflow-y-auto px-5 sm:px-8 py-5 sm:py-6 space-y-5 flex-1">
          {/* Headline */}
          <div>
            <h1
              id="reader-title"
              className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug"
            >
              {displayItem.title}
            </h1>

            {/* Author Byline & Metadata */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground mt-2.5 pb-3 border-b border-border/60">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>{item.author || 'FeedPulse Editorial'}</span>
              </span>

              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate()}</span>
              </span>

              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{readTimeEstimate()}</span>
              </span>

              {item.isDemo && (
                <span className="flex items-center gap-1 text-primary">
                  <Sparkles className="h-3 w-3" />
                  <span>{t('reader.verified') || 'In-App Verified'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Reading Mode Switcher Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/60 text-xs font-medium">
            <button
              type="button"
              aria-label="Understandable Summary Tab"
              onClick={() => setActiveTab('summary')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
                activeTab === 'summary'
                  ? 'bg-card text-foreground font-semibold shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>
                {t('reader.understandableSummary') || 'Understandable Summary (Plain English)'}
              </span>
            </button>

            <button
              type="button"
              aria-label="Detailed Story Tab"
              onClick={() => setActiveTab('detailed')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
                activeTab === 'detailed'
                  ? 'bg-card text-foreground font-semibold shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>{t('reader.detailedStory') || 'Detailed Story'}</span>
            </button>
          </div>

          {/* Compact Photo Banner */}
          {item.imageUrl && !imageError && (
            <div className="relative h-40 sm:h-48 w-full overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
              <Image
                src={item.imageUrl}
                alt={displayItem.title}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover"
                unoptimized
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* TAB 1: UNDERSTANDABLE SUMMARY (DEFAULT) */}
          {activeTab === 'summary' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Plain English Explanation Card */}
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                  <Lightbulb className="h-4 w-4" />
                  <span>{t('reader.inPlainEnglish') || 'In Plain English'}</span>
                </div>
                <p
                  className={`${
                    fontSize === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                  } text-foreground leading-relaxed font-medium`}
                >
                  {understandableSummary.simpleOverview}
                </p>
              </div>

              {/* Key Takeaways: What happened, Why it matters, What to expect */}
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>{t('reader.keyTakeaways') || 'Key Takeaways (In 3 Bullets)'}</span>
                </div>
                <ul className="space-y-2.5">
                  {understandableSummary.bulletPoints.map((point, index) => (
                    <li
                      key={index}
                      className={`flex items-start gap-2.5 ${
                        fontSize === 'lg' ? 'text-base' : 'text-sm'
                      } text-foreground/90 leading-relaxed`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px] mt-0.5">
                        {index + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Real World Impact Callout */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-foreground">
                    {t('reader.whyItMattersToYou') || 'Why this matters to you:'}{' '}
                  </span>
                  <span className="text-muted-foreground">
                    {understandableSummary.whyItMatters}
                  </span>
                </div>
              </div>

              {/* Editorial Transparency & Attribution Disclaimer */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span>
                  <strong className="text-foreground font-semibold">Editorial Transparency:</strong>{' '}
                  This briefing is an AI-assisted plain English summary for rapid comprehension.
                  Original investigative journalism and reporting are{' '}
                  <strong className="text-foreground font-semibold">
                    attributed to {item.author || 'the original publisher'}
                  </strong>
                  .
                </span>
                {isValidExternalUrl(item.url, item.isDemo) && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
                  >
                    <span>Read Original</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Seamless switch to detailed text */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('detailed')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
                >
                  <span>
                    {t('reader.switchDetailed') ||
                      'Want to read the full journalistic report? Switch to Detailed View'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED STORY */}
          {activeTab === 'detailed' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <BookOpen className="h-4 w-4" />
                  <span>{t('reader.fullArticle') || 'Full Journalistic Report'}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  In-depth reporting, verified background context, and forward-looking analysis.
                </p>
              </div>

              {/* Extracted Full Article (if in English/original mode) or Comprehensive Localized Report */}
              {!showOriginal && targetLang !== 'en' ? (
                /* Comprehensive Localized Journalistic Report */
                <div className={`space-y-4 ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {targetLang === 'pa'
                        ? 'ਪੰਜਾਬੀ ਵਿੱਚ ਪੂਰਾ ਪੱਤਰਕਾਰੀ ਵਿਸ਼ਲੇਸ਼ਣ ਅਤੇ ਰਿਪੋਰਟ'
                        : `Full journalistic report in ${targetLang.toUpperCase()}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowOriginal(true)}
                      className="text-primary hover:underline font-semibold"
                    >
                      {t('card.viewOriginal') || 'View original English'}
                    </button>
                  </div>
                  {comprehensiveStory.sections.map((section, idx) => (
                    <section
                      key={idx}
                      className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5 shadow-sm"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span>{section.title}</span>
                      </h3>
                      {section.body.split('\n\n').map((para, pIdx) => (
                        <p
                          key={pIdx}
                          className={`${
                            fontSize === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                          } text-foreground/90 leading-relaxed`}
                        >
                          {para}
                        </p>
                      ))}
                    </section>
                  ))}
                </div>
              ) : extractedArticle && extractedArticle.paragraphs.length > 0 ? (
                <div
                  className={`space-y-4 rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm ${
                    fontFamily === 'serif' ? 'font-serif' : 'font-sans'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                    <span className="font-semibold text-primary">Distraction-Free Full Text</span>
                    <span>
                      {extractedArticle.wordCount} words • {extractedArticle.readingTimeMinutes} min
                      read
                    </span>
                  </div>
                  {extractedArticle.paragraphs.map((para, pIdx) => (
                    <p
                      key={pIdx}
                      className={`${
                        fontSize === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                      } text-foreground/90 leading-relaxed`}
                    >
                      {para}
                    </p>
                  ))}
                </div>
              ) : (
                /* Comprehensive Journalistic Sections */
                <div className={`space-y-4 ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}>
                  {comprehensiveStory.sections.map((section, idx) => (
                    <section
                      key={idx}
                      className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5 shadow-sm"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span>{section.title}</span>
                      </h3>
                      {section.body.split('\n\n').map((para, pIdx) => (
                        <p
                          key={pIdx}
                          className={`${
                            fontSize === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                          } text-foreground/90 leading-relaxed font-normal`}
                        >
                          {para}
                        </p>
                      ))}
                    </section>
                  ))}
                </div>
              )}

              {/* Quick switch back to summary */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t('reader.switchSummary') || 'Switch back to Plain English Summary'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tags */}
          {item.hashtags && item.hashtags.length > 0 && (
            <div className="pt-4 border-t border-border flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Topics:</span>
              {item.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Alternative Multi-Source Coverage */}
          {item.relatedSources &&
            item.relatedSources.filter((rs) => isValidExternalUrl(rs.url)).length > 0 && (
              <div className="pt-3 border-t border-border/60">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  Also covered by trusted news outlets:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.relatedSources
                    .filter((rs) => isValidExternalUrl(rs.url))
                    .map((rs, idx) => (
                      <a
                        key={idx}
                        href={rs.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted hover:text-primary transition-colors"
                      >
                        <span>{rs.name}</span>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    ))}
                </div>
              </div>
            )}
        </div>

        {/* Footer Actions — In-App Reader */}
        <div className="border-t border-border px-5 sm:px-6 py-3.5 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground truncate">
            {item.author ? `${item.author} • ` : ''}FeedPulse In-App Reader •{' '}
            {item.category.toUpperCase()}
          </div>

          <div className="flex items-center gap-2">
            {isValidExternalUrl(item.url, item.isDemo) && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{item.author ? `Open on ${item.author}` : 'Open Original Article'}</span>
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
              </a>
            )}
            <Button variant="default" size="sm" onClick={onClose}>
              {t('reader.backToFeed') || 'Back to Feed'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
