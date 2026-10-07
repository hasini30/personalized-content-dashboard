export interface LanguageNewsSource {
  id: string;
  name: string;
  language: string;
  type: 'rss' | 'api';
  url: string;
  category?: string;
}

export const LANGUAGE_NEWS_SOURCES: Record<string, LanguageNewsSource[]> = {
  hi: [
    {
      id: 'bbc-hindi',
      name: 'BBC News हिंदी',
      language: 'hi',
      type: 'rss',
      url: 'https://feeds.bbci.co.uk/hindi/rss.xml',
    },
    {
      id: 'dainik-bhaskar',
      name: 'दैनिक भास्कर',
      language: 'hi',
      type: 'rss',
      url: 'https://www.bhaskar.com/rss-v1--all.xml',
    },
  ],
  te: [
    {
      id: 'bbc-telugu',
      name: 'BBC News తెలుగు',
      language: 'te',
      type: 'rss',
      url: 'https://feeds.bbci.co.uk/telugu/rss.xml',
    },
    {
      id: 'eenadu',
      name: 'ఈనాడు',
      language: 'te',
      type: 'rss',
      url: 'https://www.eenadu.net/rss/latest-news.xml',
    },
  ],
  ta: [
    {
      id: 'bbc-tamil',
      name: 'BBC News தமிழ்',
      language: 'ta',
      type: 'rss',
      url: 'https://feeds.bbci.co.uk/tamil/rss.xml',
    },
    {
      id: 'dinamalar',
      name: 'தினமலர்',
      language: 'ta',
      type: 'rss',
      url: 'https://www.dinamalar.com/rss/news.xml',
    },
  ],
  bn: [
    {
      id: 'bbc-bengali',
      name: 'BBC News বাংলা',
      language: 'bn',
      type: 'rss',
      url: 'https://feeds.bbci.co.uk/bengali/rss.xml',
    },
    {
      id: 'anandabazar',
      name: 'আনন্দবাজার পত্রিকা',
      language: 'bn',
      type: 'rss',
      url: 'https://www.anandabazar.com/rss/latest-news.xml',
    },
  ],
  mr: [
    {
      id: 'bbc-marathi',
      name: 'BBC News मराठी',
      language: 'mr',
      type: 'rss',
      url: 'https://feeds.bbci.co.uk/marathi/rss.xml',
    },
    {
      id: 'loksatta',
      name: 'लोकसत्ता',
      language: 'mr',
      type: 'rss',
      url: 'https://www.loksatta.com/feed/',
    },
  ],
  gu: [
    {
      id: 'bbc-gujarati',
      name: 'BBC News ગુજરાતી',
      language: 'gu',
      type: 'rss',
      url: 'https://feeds.bbci.co.uk/gujarati/rss.xml',
    },
    {
      id: 'divya-bhaskar',
      name: 'દિવ્ય ભાસ્કર',
      language: 'gu',
      type: 'rss',
      url: 'https://www.divyabhaskar.co.in/rss.xml',
    },
  ],
  kn: [
    {
      id: 'prajavani',
      name: 'ಪ್ರಜಾವಾಣಿ',
      language: 'kn',
      type: 'rss',
      url: 'https://www.prajavani.net/rss.xml',
    },
  ],
  ml: [
    {
      id: 'mathrubhumi',
      name: 'മാതൃഭൂമി',
      language: 'ml',
      type: 'rss',
      url: 'https://www.mathrubhumi.com/rss/news.xml',
    },
  ],
  pa: [
    {
      id: 'bbc-punjabi',
      name: 'BBC News ਪੰਜਾਬੀ',
      language: 'pa',
      type: 'rss',
      url: 'https://feeds.bbci.co.uk/punjabi/rss.xml',
    },
  ],
  ur: [
    {
      id: 'bbc-urdu',
      name: 'BBC News اردو',
      language: 'ur',
      type: 'rss',
      url: 'https://feeds.bbci.co.uk/urdu/rss.xml',
    },
    {
      id: 'daily-jang',
      name: 'روزنامہ جنگ',
      language: 'ur',
      type: 'rss',
      url: 'https://jang.com.pk/rss',
    },
  ],
  en: [
    {
      id: 'newsapi',
      name: 'NewsAPI Top Headlines',
      language: 'en',
      type: 'api',
      url: 'https://newsapi.org/v2/top-headlines',
    },
  ],
};

export function getSourcesForLanguage(lang: string): LanguageNewsSource[] {
  return LANGUAGE_NEWS_SOURCES[lang.toLowerCase()] || LANGUAGE_NEWS_SOURCES['en'];
}
