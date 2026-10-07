/**
 * Advanced Semantic Search Engine
 *
 * Implements conceptual and semantic information retrieval beyond literal keyword matches.
 * Connects query terms to conceptual clusters, synonyms, entity domains, and multilingual concepts,
 * scoring and ranking candidate items based on semantic relevance, domain alignment, and phrase proximity.
 */

export interface SemanticSearchableItem {
  id?: string | number;
  title?: string;
  description?: string | null;
  content?: string | null;
  overview?: string | null; // for movie items
  category?: string;
  hashtags?: string[];
  genres?: (string | { name: string })[]; // for movie items
  author?: string | { name: string; handle?: string } | null;
  simplifiedOverview?: string;
  url?: string;
  publishedAt?: string;
}

export interface SemanticConceptCluster {
  id: string;
  label: string;
  terms: string[];
  categoryAssociations: string[];
}

export interface SemanticSearchResult<T> {
  item: T;
  score: number;
  matchedConcepts: string[];
}

/**
 * Knowledge Base of Semantic Concept Clusters.
 * Maps terminology, related topics, and multilingual equivalents across major content domains.
 */
export const SEMANTIC_CLUSTERS: SemanticConceptCluster[] = [
  {
    id: 'semiconductors',
    label: 'Semiconductors & Chip Hardware',
    terms: [
      'chip',
      'chips',
      'microchip',
      'microchips',
      'processor',
      'processors',
      'cpu',
      'gpu',
      'gpus',
      'semiconductor',
      'semiconductors',
      'silicon',
      'hardware',
      'accelerator',
      'accelerators',
      'photonic',
      'photonics',
      'neuromorphic',
      'optics',
      'transistor',
      'transistors',
      'nanometer',
      '1nm',
      '2nm',
      '3nm',
      'fab',
      'foundry',
      'wafer',
      'gaa',
      'gate all around',
      'integrated circuit',
      'microelectronics',
      'hardware accelerator',
      // Multilingual
      'चिप',
      'प्रोसेसर',
      'చిప్స్',
      'ప్రాసెసర్',
      'virutas',
      'procesador',
      'semiconducteur',
      'halbleiter',
    ],
    categoryAssociations: ['technology', 'hardware'],
  },
  {
    id: 'artificial-intelligence',
    label: 'Artificial Intelligence & Machine Learning',
    terms: [
      'ai',
      'artificial intelligence',
      'machine learning',
      'ml',
      'deep learning',
      'neural network',
      'neural networks',
      'llm',
      'language model',
      'chatgpt',
      'gemini',
      'copilot',
      'autonomous',
      'automation',
      'agent',
      'agents',
      'agentic',
      'inference',
      'training',
      'transformer',
      'transformers',
      'algorithm',
      'algorithms',
      'robotics',
      'coding agents',
      // Multilingual
      'एआई',
      'कृत्रिम बुद्धिमत्ता',
      'ఆర్టిఫిషియల్ ఇంటెలిజెన్స్',
      'inteligencia artificial',
      'intelligence artificielle',
      'künstliche intelligenz',
    ],
    categoryAssociations: ['technology'],
  },
  {
    id: 'clean-energy',
    label: 'Clean Energy & Climate',
    terms: [
      'green energy',
      'clean energy',
      'renewable',
      'renewables',
      'solar',
      'solar panel',
      'solar panels',
      'solar power',
      'wind',
      'wind turbine',
      'wind turbines',
      'wind energy',
      'battery',
      'batteries',
      'battery storage',
      'grid scale',
      'power grid',
      'lcoe',
      'decarbonization',
      'climate',
      'climate change',
      'emissions',
      'eco',
      'sustainable',
      'sustainability',
      'perovskite',
      'cleantech',
      // Multilingual
      'ऊर्जा',
      'सौर',
      'శక్తి',
      'సౌర శక్తి',
      'energía',
      'renovable',
      'énergie',
      'erneuerbare energie',
    ],
    categoryAssociations: ['environment', 'energy', 'finance'],
  },
  {
    id: 'quantum-tech',
    label: 'Quantum Computing & Cryptography',
    terms: [
      'quantum',
      'quantum computing',
      'qubit',
      'qubits',
      'entanglement',
      'quantum advantage',
      'quantum annealer',
      'superposition',
      'cryptography',
      'encryption',
      'unhackable',
      'qkd',
      'quantum key',
      'cyber',
      'cybersecurity',
      'security',
      'hack',
      'hacker',
      'hacking',
      'secret code',
      'decryption',
      'tamper proof',
      'intercept',
      'eavesdropping',
      'quantum processors',
      // Multilingual
      'क्वांटम',
      'క్వాంటం',
      'cuántica',
      'ciberseguridad',
      'quantique',
      'cybersécurité',
      'quanten',
    ],
    categoryAssociations: ['security', 'science'],
  },
  {
    id: 'programming-software',
    label: 'Software Engineering & Development',
    terms: [
      'coding',
      'programming',
      'developer',
      'developers',
      'software engineer',
      'software engineering',
      'programming language',
      'refactoring',
      'boilerplate',
      'boilerplate code',
      'bugs',
      'debugging',
      'pull request',
      'pull requests',
      'repository',
      'ci cd',
      'continuous integration',
      'devops',
      // Multilingual
      'कोडिंग',
      'प्रोग्रामिंग',
      'సాఫ్ట్‌వేర్',
      'programación',
      'développement',
      'programmierung',
    ],
    categoryAssociations: ['technology'],
  },
  {
    id: 'fintech-finance',
    label: 'Fintech, Banking & Money',
    terms: [
      'fintech',
      'bank',
      'banks',
      'banking',
      'money',
      'cash',
      'currency',
      'currencies',
      'cross border',
      'wire transfer',
      'settlement',
      'clearing',
      'trade finance',
      'distributed ledger',
      'blockchain',
      'escrow',
      'wall street',
      'pension',
      // Multilingual
      'वित्त',
      'पैसा',
      'बैंक',
      'డబ్బు',
      'బ్యాంకు',
      'ఫైనాన్స్',
      'finanzas',
      'dinero',
      'banco',
      'argent',
      'banque',
      'finanzen',
      'geld',
    ],
    categoryAssociations: ['finance', 'business', 'economics'],
  },
  {
    id: 'healthcare-medicine',
    label: 'Healthcare, Medicine & Biotech',
    terms: [
      'medicine',
      'medical',
      'cure',
      'treatment',
      'treatments',
      'disease',
      'diseases',
      'autoimmune',
      'pharma',
      'pharmaceutical',
      'doctor',
      'physician',
      'hospital',
      'therapy',
      'therapies',
      'mrna',
      'dna',
      'gene',
      'genetic',
      'biotech',
      'biotechnology',
      'pathogenic',
      't cells',
      'immune',
      'immunity',
      'clinical trial',
      'clinical trials',
      'phase 3',
      'phase iii',
      'remission',
      'vaccine',
      'nanomedicine',
      'nanomedicines',
      // Multilingual
      'दवा',
      'स्वास्थ्य',
      'चिकित्सा',
      'వైద్యం',
      'ఆరోగ్యం',
      'మందులు',
      'medicina',
      'salud',
      'santé',
      'médicament',
      'gesundheit',
      'medizin',
    ],
    categoryAssociations: ['health', 'science', 'biology'],
  },
  {
    id: 'cinema-entertainment',
    label: 'Cinema, Movies & Filmmaking',
    terms: [
      'movie',
      'movies',
      'film',
      'films',
      'cinema',
      'theatrical',
      'blockbuster',
      'imax',
      'box office',
      'actor',
      'actors',
      'actress',
      'director',
      'directors',
      'hollywood',
      'soundstage',
      'led volume',
      'rendering',
      'vfx',
      'visual effects',
      'cgi',
      'virtual production',
      'screening',
      'trailer',
      'premiere',
      'nolan',
      'dune',
      'interstellar',
      // Multilingual
      'फिल्म',
      'सिनेमा',
      'సినిమా',
      'చిత్రం',
      'película',
      'cine',
      'tournage',
      'kino',
    ],
    categoryAssociations: ['entertainment', 'movies', 'media'],
  },
  {
    id: 'sports-athletics',
    label: 'Sports & Athletics',
    terms: [
      'sports',
      'sport',
      'basketball',
      'nba',
      'football',
      'soccer',
      'baseball',
      'tennis',
      'cricket',
      'tournament',
      'championship',
      'overtime',
      'double overtime',
      'buzzer beater',
      'athletes',
      'athletic',
      'playoff',
      'playoffs',
      // Multilingual
      'खेल',
      'मैच',
      'క్రీడలు',
      'మ్యాచ్',
      'deporte',
      'partido',
      'match sport',
    ],
    categoryAssociations: ['sports', 'athletics'],
  },
  {
    id: 'space-astronomy',
    label: 'Space, Astronomy & Astrophysics',
    terms: [
      'satellite',
      'satellites',
      'orbit',
      'low earth orbit',
      'astronomy',
      'astrophysics',
      'observatory',
      'telescope',
      'interstellar',
      'galaxy',
      'cosmos',
      'cosmic',
      'nasa',
      'spacex',
      'planet',
      'mars',
      'astronaut',
      'orbital',
      // Multilingual
      'अंतरिक्ष',
      'उपग्रह',
      'అంతరిక్షం',
      'espacio',
      'espace',
      'weltraum',
    ],
    categoryAssociations: ['space', 'science'],
  },
];

const STOPWORDS = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'could',
  'did',
  'do',
  'does',
  'doing',
  'down',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  'has',
  'have',
  'having',
  'he',
  'her',
  'here',
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'itself',
  'just',
  'me',
  'more',
  'most',
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'now',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  'same',
  'she',
  'should',
  'so',
  'some',
  'such',
  'than',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'with',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
]);

/**
 * Normalizes text: lowercases, removes diacritics/accents, strips punctuation,
 * and splits into distinct meaningful tokens.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return normalized
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Lightweight linguistic stemmer that handles common English suffixes with single-rule precedence.
 */
export function stemToken(token: string): string {
  if (token.length <= 3) return token;

  const patterns: [RegExp, string][] = [
    [/ational$/i, 'ate'],
    [/tional$/i, 'tion'],
    [/ization$/i, 'ize'],
    [/ements$/i, ''],
    [/ement$/i, ''],
    [/ments$/i, ''],
    [/ment$/i, ''],
    [/ness$/i, ''],
    [/able$/i, ''],
    [/ible$/i, ''],
    [/ings$/i, ''],
    [/ing$/i, ''],
    [/ies$/i, 'i'],
    [/ors$/i, ''],
    [/ers$/i, ''],
    [/ed$/i, ''],
    [/es$/i, ''],
    [/s$/i, ''],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(token)) {
      return token.replace(pattern, replacement);
    }
  }

  return token;
}

/**
 * Detects which semantic concept clusters are triggered by text.
 * Uses exact token/stem matching for English to avoid substring collisions (e.g. "gene" in "generation"),
 * and substring/token matching for multi-word phrases and non-ASCII scripts.
 */
export function detectSemanticConcepts(text: string): Set<string> {
  const detected = new Set<string>();
  if (!text) return detected;

  const lowerText = text.toLowerCase();
  const tokens = tokenizeText(text);
  const tokenSet = new Set(tokens);
  const stemmedTokens = new Set(tokens.map(stemToken));

  for (const cluster of SEMANTIC_CLUSTERS) {
    for (const term of cluster.terms) {
      const lowerTerm = term.toLowerCase();

      if (lowerTerm.includes(' ')) {
        // Multi-word phrase check
        if (lowerText.includes(lowerTerm)) {
          detected.add(cluster.id);
          break;
        }
      } else {
        // Single word check
        if (/[^\u0000-\u007F]/.test(lowerTerm)) {
          // Non-ASCII (Hindi, Telugu, etc.)
          if (tokenSet.has(lowerTerm) || lowerText.includes(lowerTerm)) {
            detected.add(cluster.id);
            break;
          }
        } else {
          // ASCII English: strict token or stem match only to prevent partial substring false positives
          const stemmedTerm = stemToken(lowerTerm);
          if (tokenSet.has(lowerTerm) || stemmedTokens.has(stemmedTerm)) {
            detected.add(cluster.id);
            break;
          }
        }
      }
    }
  }

  return detected;
}

/**
 * Computes a detailed semantic relevance score between a search query and a candidate item.
 * Evaluates:
 * 1. Exact phrase matches (strongest signal)
 * 2. Conceptual cluster alignment (semantic meaning)
 * 3. Token and stem overlap across weighted fields
 * 4. Category alignment
 */
export function calculateSemanticScore(
  query: string,
  item: SemanticSearchableItem
): { score: number; matchedConcepts: string[] } {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { score: 1.0, matchedConcepts: [] };
  }

  const queryLower = trimmedQuery.toLowerCase();
  const queryTokens = tokenizeText(trimmedQuery);
  const stemmedQueryTokens = queryTokens.map(stemToken);

  // Detect semantic concepts in the query
  const queryConcepts = detectSemanticConcepts(trimmedQuery);

  // Compile item searchable text
  const title = (item.title || '').trim();
  const description = (item.description || item.overview || '').trim();
  const content = (item.content || '').trim();
  const simplifiedOverview = (item.simplifiedOverview || '').trim();
  const category = (item.category || '').toLowerCase().trim();
  const hashtags = Array.isArray(item.hashtags) ? item.hashtags.join(' ') : '';
  const genres = Array.isArray(item.genres)
    ? item.genres.map((g) => (typeof g === 'string' ? g : g.name)).join(' ')
    : '';
  const authorStr =
    typeof item.author === 'string'
      ? item.author
      : item.author?.name
        ? `${item.author.name} ${item.author.handle || ''}`
        : '';

  const fullItemText = `${title} ${description} ${content} ${simplifiedOverview} ${hashtags} ${genres} ${authorStr}`;
  const itemLower = fullItemText.toLowerCase();

  // Detect concepts strictly present in the item text
  const itemConcepts = detectSemanticConcepts(fullItemText);

  let score = 0;
  const matchedConcepts: string[] = [];

  // 1. Exact phrase and title boost (prioritize direct title and keyword matches)
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();

  if (titleLower === queryLower) {
    score += 100.0;
  } else if (titleLower.startsWith(queryLower)) {
    score += 60.0;
  } else if (titleLower.includes(queryLower)) {
    score += 40.0;
  } else if (descLower.includes(queryLower)) {
    score += 15.0;
  } else if (itemLower.includes(queryLower)) {
    score += 5.0;
  }

  // 2. Semantic Concept Matching (conceptual alignment for items without explicit title keyword)
  for (const qConcept of queryConcepts) {
    if (itemConcepts.has(qConcept)) {
      score += 5.0;
      matchedConcepts.push(qConcept);
    }
  }

  // 3. Token-level overlap across weighted fields
  const titleTokens = new Set(tokenizeText(title));
  const descTokens = new Set(tokenizeText(description));
  const otherTokens = new Set(tokenizeText(`${content} ${hashtags} ${genres} ${authorStr}`));

  const titleStems = new Set(Array.from(titleTokens).map(stemToken));
  const descStems = new Set(Array.from(descTokens).map(stemToken));
  const otherStems = new Set(Array.from(otherTokens).map(stemToken));

  for (let i = 0; i < queryTokens.length; i++) {
    const qToken = queryTokens[i];
    const qStem = stemmedQueryTokens[i];

    if (titleTokens.has(qToken)) {
      score += 20.0;
    } else if (titleStems.has(qStem)) {
      score += 10.0;
    }

    if (descTokens.has(qToken)) {
      score += 6.0;
    } else if (descStems.has(qStem)) {
      score += 3.0;
    }

    if (otherTokens.has(qToken)) {
      score += 2.0;
    } else if (otherStems.has(qStem)) {
      score += 1.0;
    }

    // Partial substring match for technical compounds (e.g. "semi" in "semiconductor")
    if (qToken.length >= 4 && itemLower.includes(qToken)) {
      score += 1.0;
    }
  }

  // 4. Category alignment
  if (category && (queryLower.includes(category) || queryConcepts.has(category))) {
    score += 1.5;
  }

  // Category association alignment with matched concept
  for (const cluster of SEMANTIC_CLUSTERS) {
    if (matchedConcepts.includes(cluster.id) && cluster.categoryAssociations.includes(category)) {
      score += 1.5;
    }
  }

  return { score, matchedConcepts };
}

/**
 * Filters and ranks any array of items according to semantic query relevance.
 * Items are returned in descending order of semantic relevance.
 *
 * @param items List of searchable items
 * @param query Search query string
 * @param threshold Minimum score threshold to consider an item relevant (default: 1.0)
 */
export function semanticSearchFilter<T extends object>(
  items: T[],
  query?: string | null,
  threshold = 1.0
): T[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (!query || !query.trim()) return items;

  const scored: SemanticSearchResult<T>[] = [];

  for (const item of items) {
    const { score, matchedConcepts } = calculateSemanticScore(
      query,
      item as unknown as SemanticSearchableItem
    );
    if (score >= threshold) {
      scored.push({ item, score, matchedConcepts });
    }
  }

  // If no items passed the strict threshold, check for graceful partial matches (> 0.4)
  if (scored.length === 0 && threshold > 0.4) {
    for (const item of items) {
      const { score, matchedConcepts } = calculateSemanticScore(
        query,
        item as unknown as SemanticSearchableItem
      );
      if (score >= 0.4) {
        scored.push({ item, score, matchedConcepts });
      }
    }
  }

  // Sort descending by semantic score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.item);
}
