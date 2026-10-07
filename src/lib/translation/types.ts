export interface TranslationResult {
  translatedText: string;
  sourceLanguage?: string;
  isTranslated: boolean;
}

export interface TranslatedArticlePayload {
  title: string;
  description: string;
  content?: string;
  isTranslated: boolean;
  language: string;
  originalTitle: string;
  originalDescription: string;
  originalContent?: string;
}

export interface Translator {
  name: string;
  translate(text: string, targetLang: string, sourceLang?: string): Promise<TranslationResult>;
  translateArticle(
    article: {
      id: string;
      title: string;
      description: string;
      content?: string;
    },
    targetLang: string
  ): Promise<TranslatedArticlePayload>;
  translateArticlesBatch?(
    articles: Array<{
      id: string;
      title: string;
      description: string;
      content?: string;
    }>,
    targetLang: string
  ): Promise<TranslatedArticlePayload[]>;
}
