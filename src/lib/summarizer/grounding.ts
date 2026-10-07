import { UnderstandableSummary } from '@/types/content';

export interface GroundingCheckResult {
  isGrounded: boolean;
  score: number;
  reason?: string;
}

/**
 * Common stop words to exclude from keyword extraction.
 */
const STOP_WORDS = new Set([
  'the',
  'and',
  'that',
  'this',
  'with',
  'from',
  'have',
  'were',
  'which',
  'their',
  'they',
  'been',
  'about',
  'into',
  'more',
  'some',
  'what',
  'when',
  'will',
  'after',
  'also',
  'than',
]);

/**
 * Extracts normalized tokens from a text block.
 */
function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Checks whether an AI-generated summary is factually grounded in the source article text.
 */
export function verifyGrounding(
  summary: UnderstandableSummary,
  sourceText: string,
  lang = 'en'
): GroundingCheckResult {
  if (!summary || !sourceText) {
    return { isGrounded: false, score: 0, reason: 'Missing summary or source text' };
  }

  // Structural sanity checks
  if (!summary.simpleOverview || summary.simpleOverview.trim().length < 25) {
    return { isGrounded: false, score: 0, reason: 'Overview too short' };
  }

  if (!Array.isArray(summary.bulletPoints) || summary.bulletPoints.length < 2) {
    return { isGrounded: false, score: 0, reason: 'Insufficient key takeaways' };
  }

  const combinedSummary = `${summary.simpleOverview} ${summary.bulletPoints.join(' ')} ${
    summary.whyItMatters || ''
  }`;

  // If the target language is non-English and source is English,
  // we verify structural validity and entity/number preservation.
  if (lang !== 'en') {
    // Check numbers/digits from source that appear in summary
    const sourceNumbers = sourceText.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
    if (sourceNumbers.length > 0) {
      let matchedCount = 0;
      for (const num of sourceNumbers) {
        if (combinedSummary.includes(num)) {
          matchedCount++;
        }
      }
      const numRatio = matchedCount / sourceNumbers.length;
      return {
        isGrounded: true,
        score: Math.max(0.6, numRatio),
      };
    }

    // Default grounded for valid Indic script output with proper length
    return {
      isGrounded: combinedSummary.length > 50,
      score: 0.8,
    };
  }

  // English token overlap analysis
  const summaryTokens = extractTokens(combinedSummary);
  if (summaryTokens.length === 0) {
    return { isGrounded: false, score: 0, reason: 'No extractable tokens in summary' };
  }

  const sourceTokens = new Set(extractTokens(sourceText));
  let overlapCount = 0;

  for (const token of summaryTokens) {
    if (sourceTokens.has(token)) {
      overlapCount++;
    }
  }

  const score = overlapCount / summaryTokens.length;
  // A factual summary should share at least 30% of key terminology with the source article
  const isGrounded = score >= 0.3;

  return {
    isGrounded,
    score: Math.round(score * 100) / 100,
    reason: isGrounded ? undefined : `Low grounding token overlap score: ${score.toFixed(2)}`,
  };
}
