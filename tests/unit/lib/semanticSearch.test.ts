import {
  tokenizeText,
  stemToken,
  detectSemanticConcepts,
  calculateSemanticScore,
  semanticSearchFilter,
  SemanticSearchableItem,
} from '@/lib/semanticSearch';

describe('semanticSearch', () => {
  const sampleNewsArticles: SemanticSearchableItem[] = [
    {
      id: 'news-chips',
      title: 'Next-Gen AI Hardware Accelerators Show 10x Efficiency Gains',
      description:
        'Novel photonic and neuromorphic computing architectures are demonstrating dramatic power reductions for large language model inference workloads.',
      content:
        'Researchers and semiconductor startups have achieved significant milestones in photonic and neuromorphic architectures. Silicon-based graphic processing units (GPUs) face severe thermal constraints. Startups are building optical chips.',
      category: 'technology',
      hashtags: ['hardware', 'chips', 'ai'],
    },
    {
      id: 'news-clean-energy',
      title: 'Global Markets Rally as Green Energy Investments Hit Record Highs',
      description:
        'Clean energy infrastructure spending surpassed $2 trillion globally this year, driving unprecedented momentum across renewable indexes.',
      content:
        'Allocations towards grid-scale battery storage, offshore wind installations, and next-generation perovskite solar technology jumped 34% year-over-year.',
      category: 'finance',
      hashtags: ['energy', 'investing', 'markets'],
    },
    {
      id: 'news-sports',
      title: 'Championship Contenders Clash in High-Stakes Double-Overtime Thriller',
      description:
        "An electrifying buzzer-beater seals a heart-stopping victory in one of the season's most fiercely contested tactical battles.",
      content:
        'With 1.2 seconds left on the clock in the second overtime, a step-back three-pointer at the buzzer sealed a 128-126 victory after ten fourth-quarter lead changes.',
      category: 'sports',
      hashtags: ['basketball', 'game', 'playoffs'],
    },
    {
      id: 'news-medicine',
      title: 'Targeted mRNA Nanomedicines Clear Phase III Trials for Rare Autoimmune Diseases',
      description:
        'Precision cellular therapies designed via predictive molecular dynamics successfully reprogram aberrant immune responses without systemic toxicity.',
      content:
        'Clinical trial results mark a major turning point as targeted lipid nanoparticle mRNA therapies cleared Phase III multicenter human trials. Over 82% achieved remission.',
      category: 'health',
      hashtags: ['health', 'medicine', 'biotech'],
    },
    {
      id: 'news-coding',
      title: 'Autonomous Coding Agents Redefine Enterprise Software Engineering Practices',
      description:
        'Development teams report 40% faster release cycles as multi-agent systems coordinate scaffolding, refactoring, and integration testing.',
      content:
        'Enterprise software engineering is undergoing an operational shift. Rather than engineers writing boilerplate code and debugging build errors, autonomous AI agents collaborate in pairs.',
      category: 'technology',
      hashtags: ['software', 'engineering', 'ai'],
    },
    {
      id: 'news-fintech',
      title: 'Fintech Innovations Accelerate Cross-Border Settlements in Record Settlement Times',
      description:
        'Central bank digital settlement rails reduce friction and costs for international trade finance corridors.',
      content:
        'Financial institutions across three continents connected distributed ledger settlement rails with commercial central bank payment networks, reducing cross-border clearing times from days to seconds.',
      category: 'business',
      hashtags: ['fintech', 'banking', 'payments'],
    },
  ];

  describe('tokenization and stemming', () => {
    it('normalizes accents, strips punctuation, and excludes stopwords', () => {
      const tokens = tokenizeText('The renewable solar-powered Énergies in 2026!');
      expect(tokens).toContain('renewable');
      expect(tokens).toContain('solar');
      expect(tokens).toContain('powered');
      expect(tokens).toContain('energies');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('in');
    });

    it('stems common English suffixes', () => {
      expect(stemToken('accelerators')).toBe('accelerat');
      expect(stemToken('processors')).toBe('process');
      expect(stemToken('investments')).toBe('invest');
      expect(stemToken('batteries')).toBe('batteri');
      expect(stemToken('engineered')).toBe('engineer');
    });
  });

  describe('detectSemanticConcepts', () => {
    it('identifies semiconductor concept from terminology', () => {
      const concepts = detectSemanticConcepts(
        'advancements in silicon wafer transistors and microchips'
      );
      expect(concepts.has('semiconductors')).toBe(true);
    });

    it('identifies clean energy concept from synonyms and phrases', () => {
      const concepts = detectSemanticConcepts(
        'breakthroughs in perovskite solar cells and battery storage'
      );
      expect(concepts.has('clean-energy')).toBe(true);
    });

    it('identifies concepts from multilingual terms', () => {
      const hindiConcepts = detectSemanticConcepts('दवा और चिकित्सा');
      expect(hindiConcepts.has('healthcare-medicine')).toBe(true);

      const teluguConcepts = detectSemanticConcepts('సినిమా మరియు నటన');
      expect(teluguConcepts.has('cinema-entertainment')).toBe(true);
    });
  });

  describe('calculateSemanticScore', () => {
    it('assigns high score for exact phrase match in title', () => {
      const { score } = calculateSemanticScore('Next-Gen AI Hardware', sampleNewsArticles[0]);
      expect(score).toBeGreaterThan(8.0);
    });

    it('assigns strong semantic score when concepts align even without exact title keyword', () => {
      // Query "chips" is not in the title of sampleNewsArticles[0] ("Next-Gen AI Hardware Accelerators...")
      const { score, matchedConcepts } = calculateSemanticScore('chips', sampleNewsArticles[0]);
      expect(score).toBeGreaterThan(5.0);
      expect(matchedConcepts).toContain('semiconductors');
    });
  });

  describe('semanticSearchFilter', () => {
    it('returns all items when query is empty or whitespace', () => {
      expect(semanticSearchFilter(sampleNewsArticles, '')).toHaveLength(sampleNewsArticles.length);
      expect(semanticSearchFilter(sampleNewsArticles, '   ')).toHaveLength(
        sampleNewsArticles.length
      );
      expect(semanticSearchFilter(sampleNewsArticles, null)).toHaveLength(
        sampleNewsArticles.length
      );
    });

    it('conceptually matches "chips" to hardware accelerators article', () => {
      const results = semanticSearchFilter(sampleNewsArticles, 'chips');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('news-chips');
    });

    it('conceptually matches "clean energy" or "renewable power" to green energy article', () => {
      const results = semanticSearchFilter(sampleNewsArticles, 'clean energy');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('news-clean-energy');

      const renewableResults = semanticSearchFilter(sampleNewsArticles, 'renewable power');
      expect(renewableResults.length).toBeGreaterThan(0);
      expect(renewableResults[0].id).toBe('news-clean-energy');
    });

    it('conceptually matches "basketball" or "match score" to sports thriller article', () => {
      const results = semanticSearchFilter(sampleNewsArticles, 'basketball');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('news-sports');
    });

    it('conceptually matches "cure for disease" or "treatment" to medicine article', () => {
      const results = semanticSearchFilter(sampleNewsArticles, 'cure for disease');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('news-medicine');
    });

    it('conceptually matches "programming" to autonomous coding agents article', () => {
      const results = semanticSearchFilter(sampleNewsArticles, 'programming');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('news-coding');
    });

    it('conceptually matches "international banking transfer" to fintech article', () => {
      const results = semanticSearchFilter(sampleNewsArticles, 'international banking transfer');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('news-fintech');
    });

    it('conceptually matches multilingual terms like "दवा" to health article', () => {
      const results = semanticSearchFilter(sampleNewsArticles, 'दवा');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('news-medicine');
    });

    it('returns empty array when query is completely unrelated', () => {
      const results = semanticSearchFilter(sampleNewsArticles, 'xyznonexistentword98765');
      expect(results).toHaveLength(0);
    });

    it('ranks exact keyword/title matches strictly above broad semantic cluster matches', () => {
      const candidates: SemanticSearchableItem[] = [
        {
          id: 'broad-cluster-item',
          title: 'Cinematic Trends Across Hollywood Studios',
          description: 'Exploring science fiction directing styles and space adventures in cinema.',
          category: 'entertainment',
        },
        {
          id: 'exact-title-match',
          title: 'Dune: Part Two',
          description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge.',
          category: 'movie',
        },
      ];

      const results = semanticSearchFilter(candidates, 'dune');
      expect(results[0].id).toBe('exact-title-match');
    });
  });
});
