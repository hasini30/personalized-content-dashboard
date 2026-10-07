import {
  generateUnderstandableSummary,
  getUnderstandableSummary,
  getComprehensiveStory,
} from '@/lib/newsSummaryUtils';
import { ContentItem } from '@/types/content';

describe('newsSummaryUtils', () => {
  it('returns curated summary when title matches a known curated article', () => {
    const summary = generateUnderstandableSummary(
      'Next-Gen AI Hardware Accelerators Show 10x Efficiency Gains'
    );

    expect(summary.simpleOverview).toContain('beams of light');
    expect(summary.simpleOverview.length).toBeGreaterThan(150);
    expect(summary.bulletPoints).toHaveLength(3);
    expect(summary.whyItMatters).toContain('faster');
  });

  it('dynamically generates comprehensive understandable summary for unknown article', () => {
    const title = 'Breakthrough Solar Cell Smashes Efficiency Record';
    const description =
      'Engineers have developed tandem perovskite cells achieving 38% power conversion efficiency.';
    const summary = generateUnderstandableSummary(
      title,
      description,
      'Laboratory tests verified stable performance over 1,000 continuous hours.',
      'energy'
    );

    expect(summary.simpleOverview).toContain('Engineers have developed tandem perovskite cells');
    expect(summary.simpleOverview.length).toBeGreaterThan(100);
    expect(summary.bulletPoints).toHaveLength(3);
    expect(summary.bulletPoints[0]).toContain('What happened:');
    expect(summary.bulletPoints[1]).toContain('Why it matters:');
    expect(summary.bulletPoints[2]).toContain('What to expect next:');
    expect(summary.whyItMatters).toContain('energy');
  });

  it('uses item.simplifiedSummary when present in getUnderstandableSummary', () => {
    const item: Partial<ContentItem> = {
      title: 'Custom Title',
      simplifiedSummary: {
        simpleOverview: 'Custom simple overview',
        bulletPoints: ['Point A', 'Point B'],
        whyItMatters: 'Custom why it matters',
      },
    };

    const res = getUnderstandableSummary(item);
    expect(res.simpleOverview).toBe('Custom simple overview');
    expect(res.bulletPoints).toEqual(['Point A', 'Point B']);
  });

  it('handles null or empty item gracefully in getUnderstandableSummary', () => {
    const res = getUnderstandableSummary(null);
    expect(res.simpleOverview).toBe('No summary available for this item.');
    expect(res.bulletPoints).toHaveLength(1);
  });

  describe('getComprehensiveStory', () => {
    it('creates structured sections for multi-paragraph articles', () => {
      const item: Partial<ContentItem> = {
        title: 'Deep Exploration of Mars Surface',
        description: 'New rover findings reveal subterranean aquifers.',
        content:
          'First paragraph with verified findings from planetary probes.\n\nSecond paragraph detailing spectroscopy analysis and mineral composition.\n\nThird paragraph outlining future sample return missions and international collaboration.',
        category: 'science',
      };

      const story = getComprehensiveStory(item);
      expect(story.sections).toHaveLength(3);
      expect(story.sections[0].title).toBe('Core Developments & Verified Facts');
      expect(story.sections[0].body).toContain('First paragraph with verified findings');
      expect(story.sections[1].title).toBe('Technical Context & Analysis');
      expect(story.sections[2].title).toBe('Industry Implications & Future Outlook');
      expect(story.paragraphs).toHaveLength(3);
    });

    it('synthesizes a 4-section comprehensive journalistic story when content is short or identical to description', () => {
      const shortItem: Partial<ContentItem> = {
        title: 'Quantum Advantage Validated in New Commercial Optimization Benchmark',
        description:
          'Independent audit firms verify quantum annealer achieves quadratic speedup for large supply chain routing.',
        category: 'technology',
        author: 'Tech Wire Daily',
      };

      const story = getComprehensiveStory(shortItem);
      // Ensures user does not get a 2-line snippet duplicated as the body
      expect(story.sections).toHaveLength(4);
      expect(story.sections[0].title).toBe('Core Developments & Verified Facts');
      expect(story.sections[1].title).toBe('Technical Context & Background');
      expect(story.sections[2].title).toBe('Industry Reactions & Real-World Impact');
      expect(story.sections[3].title).toBe('Next Milestones & Future Outlook');
      expect(story.paragraphs.join(' ').length).toBeGreaterThan(500);
    });

    it('handles null item gracefully in getComprehensiveStory', () => {
      const story = getComprehensiveStory(null);
      expect(story.sections).toHaveLength(1);
      expect(story.paragraphs).toHaveLength(1);
    });

    it('generates rich Punjabi sections and takeaways when lang is pa', () => {
      const story = getComprehensiveStory(
        {
          title: 'ਨਵੀਂ ਏਆਈ ਤਕਨਾਲੋਜੀ',
          description: 'ਏਆਈ ਮਾਡਲਾਂ ਦੀ ਕਾਰਗੁਜ਼ਾਰੀ ਵਿੱਚ ਵੱਡਾ ਵਾਧਾ।',
        },
        'pa'
      );

      expect(story.sections).toHaveLength(4);
      expect(story.sections[0].title).toBe('ਮੁੱਖ ਵਿਕਾਸ ਅਤੇ ਤਸਦੀਕਸ਼ੁਦਾ ਤੱਥ');
      expect(story.sections[1].title).toBe('ਤਕਨੀਕੀ ਸੰਦਰਭ ਅਤੇ ਵਿਸ਼ਲੇਸ਼ਣ');
      expect(story.sections[2].title).toBe('ਉਦਯੋਗ ਪ੍ਰਭਾਵ ਅਤੇ ਅਸਲ-ਸੰਸਾਰ ਨਤੀਜੇ');
      expect(story.sections[3].title).toBe('ਅਗਲੇ ਮੀਲਪੱਥਰ ਅਤੇ ਭਵਿੱਖ ਦਾ ਦ੍ਰਿਸ਼ਟੀਕੋਣ');

      const summary = getUnderstandableSummary(
        {
          title: 'ਨਵੀਂ ਏਆਈ ਤਕਨਾਲੋਜੀ',
          description: 'ਏਆਈ ਮਾਡਲਾਂ ਦੀ ਕਾਰਗੁਜ਼ਾਰੀ ਵਿੱਚ ਵੱਡਾ ਵਾਧਾ।',
        },
        'pa'
      );

      expect(summary.bulletPoints[0]).toContain('ਕੀ ਹੋਇਆ:');
      expect(summary.bulletPoints[1]).toContain('ਇਹ ਕਿਉਂ ਮਹੱਤਵਪੂਰਨ ਹੈ:');
      expect(summary.bulletPoints[2]).toContain('ਅੱਗੇ ਕੀ ਉਮੀਦ ਕਰਨੀ ਹੈ:');
      expect(summary.whyItMatters).toContain('ਸਹੂਲਤ');
    });

    it('generates localized takeaways for Telugu, Tamil, and Bengali', () => {
      const teluguSummary = getUnderstandableSummary(
        { title: 'టెస్లా రోబోటాక్సీ', description: 'టెస్లా షేర్లు భారీగా పెరిగాయి.' },
        'te'
      );
      expect(teluguSummary.bulletPoints[0]).toContain('ఏం జరిగింది:');
      expect(teluguSummary.bulletPoints[1]).toContain('ఇది ఎందుకు ముఖ్యం:');
      expect(teluguSummary.whyItMatters).toContain('విశ్వసనీయత');

      const tamilSummary = getUnderstandableSummary(
        { title: 'டெஸ்லா பங்குகள்', description: 'பங்குச் சந்தையில் பெரும் ஏற்றம்.' },
        'ta'
      );
      expect(tamilSummary.bulletPoints[0]).toContain('என்ன நடந்தது:');
      expect(tamilSummary.bulletPoints[1]).toContain('இது ஏன் முக்கியம்:');

      const bengaliSummary = getUnderstandableSummary(
        { title: 'টেসলা শেয়ার বৃদ্ধি', description: 'বিশ্ববাজারে তীব্র বৃদ্ধি রেকর্ড।' },
        'bn'
      );
      expect(bengaliSummary.bulletPoints[0]).toContain('কী ঘটেছে:');
      expect(bengaliSummary.bulletPoints[1]).toContain('এটি কেন গুরুত্বপূর্ণ:');
    });
  });
});
