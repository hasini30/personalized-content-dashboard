import newsFixtures from '@/lib/fixtures/newsFixtures.json';
import { NewsApiArticle, mapNewsArticles } from '@/lib/adapters/newsAdapter';
import { semanticSearchFilter } from '@/lib/semanticSearch';
import { ContentItem } from '@/types/content';
import { isDateStaleOrHistorical, getDynamicRecentDate } from '@/lib/dateUtils';
import { deduplicateContentItems } from '@/lib/feedUtils';

export interface NewsFeedOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  q?: string;
  country?: string;
  sources?: string;
  scope?: 'preferred' | 'all';
  preferredCategories?: string[];
}

export interface NewsFeedResult {
  items: ContentItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  isDemo: boolean;
}

// Additional high-fidelity curated articles across all domains
export const EXTENDED_CURATED_NEWS: NewsApiArticle[] = [
  // TECHNOLOGY
  {
    source: { id: 'the-verge', name: 'The Verge' },
    author: 'Alex Heath',
    title: 'Photonic Interconnects Solve Bandwidth Bottlenecks in Hyperscale AI Clusters',
    description:
      'Optical transceiver modules operating at 1.6 terabits per second slash latency and power consumption in distributed model training clusters.',
    url: 'https://theverge.com/ai-photonic-interconnects',
    urlToImage:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T11:15:00Z',
    content:
      'Cloud computing infrastructure is reaching a pivotal turning point as optical interconnect systems begin replacing traditional copper cables within hyperscale data center fabrics.\n\nEngineers at leading networking consortia announced today that 1.6-terabit co-packaged optical transceivers have achieved sustained zero-loss transmission across 100,000-accelerator compute topologies. The optical approach eliminates resistive thermal dissipation while delivering a four-fold increase in bi-directional bisection bandwidth.\n\n"We were running directly into the physical limits of copper transmission lines," explained Dr. Clara Martinez, chief optical architect at the Open Compute Project. "Optical interconnects ensure that training runs for trillion-parameter foundation models spend less time waiting on parameter synchronization and more time executing matrix math."\n\nCommercial availability across Tier-1 hyperscale cloud operators is scheduled to ramp by the fourth quarter of 2026.',
    category: 'technology',
  },
  {
    source: { id: 'wired', name: 'Wired' },
    author: 'Will Knight',
    title: 'Humanoid Robotics Breakthrough: Multimodal Foundation Policies Master Complex Assembly',
    description:
      'Bipedal robotic workers demonstrate zero-shot motor adaptability across unstructured industrial manufacturing environments.',
    url: 'https://wired.com/robotics-foundation-policies',
    urlToImage:
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T09:40:00Z',
    content:
      'Robotics laboratories have unveiled a transformative multimodal policy architecture that allows bipedal humanoid robots to perform delicate mechanical assemblies without requiring task-specific hand-coded scripts.\n\nBy uniting end-to-end vision-language-action models with tactile feedback sensors embedded in compliant robotic hands, the systems can handle flexible wiring harnesses, torque fasteners to precise specifications, and collaborate safely alongside human operators in dynamic automotive assembly lines.\n\nIn rigorous safety trials conducted across three pilot automotive plants, the autonomous humanoids achieved a 99.4% task completion rate while adhering to strict ISO collaborative robotics safety margins. Plant managers noted that the robots rapidly adapt to unexpected part orientations and tool placements.\n\nIndustry analysts project that general-purpose humanoid robotic deployments across global manufacturing supply chains will quadruple over the next three years.',
    category: 'technology',
  },
  {
    source: { id: 'techcrunch', name: 'TechCrunch' },
    author: 'Frederic Lardinois',
    title: 'Edge AI Silicon Reaches 50 TOPS per Watt on Ultra-Low-Power Wearable Devices',
    description:
      'Sub-milliwatt neural accelerators enable on-device real-time conversational processing without cloud round-trips.',
    url: 'https://techcrunch.com/edge-ai-wearable-silicon',
    urlToImage:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T08:20:00Z',
    content:
      'A breakthrough in analog compute-in-memory architecture has delivered edge silicon capable of 50 tera-operations per second (TOPS) per watt, enabling sophisticated neural models to run locally on smartwatches and augmented reality eyewear.\n\nBy executing matrix multiplication directly inside memory cells using analog voltage states, the silicon completely avoids the energy-intensive data shuttle between processor cores and external DRAM. This allows smart glasses and audio wearables to transcribe speech, perform instant translation, and recognize environmental context completely offline.\n\n"Privacy and responsiveness require computing at the physical edge," said founder and CTO David Stern. "Users should not have to stream their audio and video streams to a remote server farm just to interact with an intelligent personal assistant."\n\nVolume manufacturing partnerships with leading consumer electronics OEMs are slated to commence within the next six months.',
    category: 'technology',
  },

  // BUSINESS & FINANCE
  {
    source: { id: 'financial-times', name: 'Financial Times' },
    author: 'Colby Smith',
    title: 'Global Central Banks Coordinate Liquidity Frameworks for Green Transition Bonds',
    description:
      'International monetary authorities establish standardized collateral rules and risk weightings for sovereign climate resilience bonds.',
    url: 'https://ft.com/green-transition-bonds',
    urlToImage:
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T11:00:00Z',
    content:
      'Central banks across thirty major economies have signed a landmark multilateral accord establishing unified regulatory standards for sovereign and corporate green transition debt instruments.\n\nThe framework introduces standardized risk-weighting incentives for capital deployed into carbon abatement infrastructure, electrical grid modernization, and industrial green hydrogen initiatives. Under the new guidelines, qualifying green bonds will receive preferential treatment in primary central bank lending facilities.\n\nFinancial market strategists described the move as a watershed event that resolves long-standing institutional ambiguities regarding taxonomy harmonization. Secondary market yields on benchmark sovereign green bonds tightened by 18 basis points in heavy morning trading.\n\nInstitutional asset managers oversee more than $35 trillion in global assets are already restructuring debt portfolios to align with the newly ratified framework.',
    category: 'business',
  },
  {
    source: { id: 'bloomberg', name: 'Bloomberg' },
    author: 'Tracy Alloway',
    title: 'Semiconductor Supply Chains Rebalance as Advanced Packaging Hubs Go Live',
    description:
      'State-of-the-art 3D wafer-level packaging facilities in Europe and North America shorten lead times for mission-critical enterprise hardware.',
    url: 'https://bloomberg.com/semiconductor-packaging-hubs',
    urlToImage:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T09:10:00Z',
    content:
      'The global semiconductor landscape celebrated a pivotal milestone today as three multi-billion-dollar advanced packaging campuses commenced commercial volume operations across North America and Central Europe.\n\nModern high-performance chips increasingly depend on complex 2.5D and 3D heterogeneous integration—stacking memory cubes and computational chiplets on silicon interposers—rather than relying solely on monolithic die shrinkage. Previously, over 85% of advanced packaging was concentrated in a single geographic corridor.\n\nSupply chain directors at major automotive and telecommunications conglomerates confirmed that order lead times for mission-critical system-in-package hardware have contracted from 36 weeks down to 14 weeks. Equity indexes tracking semiconductor equipment providers surged to all-time highs following the announcements.',
    category: 'business',
  },
  {
    source: { id: 'the-wall-street-journal', name: 'The Wall Street Journal' },
    author: 'Gregory Zuckerman',
    title: 'Venture Investment Rebounds as Deep Tech and Clean Energy Draw Record Inflows',
    description:
      'Series A and B funding rounds in nuclear fusion, synthetic biology, and optical computing outpace traditional enterprise SaaS.',
    url: 'https://wsj.com/venture-deep-tech-surge',
    urlToImage:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T07:30:00Z',
    content:
      'Global venture capital activity experienced its strongest quarterly rebound since 2021, propelled by unprecedented investor enthusiasm for fundamental hardware engineering and deep tech breakthroughs.\n\nAccording to quarterly industry disclosures, venture funds directed over $42 billion into startups developing magnetic confinement fusion systems, bio-engineered microbial catalysts, and energy-efficient photonics chips. Valuations for pre-revenue deep tech enterprises held steady despite broader macroeconomic caution.\n\n"We are seeing a generational rotation away from incremental consumer software towards foundational physical and computational technologies," remarked partner Rachel Klein at Horizon Ventures. "The next generation of multi-trillion dollar enterprises will be built on novel physics and biology."',
    category: 'business',
  },

  // SCIENCE
  {
    source: { id: 'nature', name: 'Nature' },
    author: 'Quirin Schiermeier',
    title: 'Magnetic Confinement Fusion Reactor Sustains Net-Energy Plasma for Record Two Hours',
    description:
      'Superconducting tokamak equipped with high-temperature magnet coils demonstrates stable plasma containment without turbulent disruption.',
    url: 'https://nature.com/fusion-tokamak-milestone',
    urlToImage:
      'https://images.unsplash.com/photo-1517976487502-5c425a4db827?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T11:45:00Z',
    content:
      'Physicists and nuclear engineers collaborating at the International Stellarator Facility announced a historical breakthrough: maintaining a steady-state, net-energy-positive burning plasma for over 120 consecutive minutes.\n\nUtilizing revolutionary high-temperature superconducting (HTS) tape magnets capable of generating 20-Tesla magnetic fields, the research team successfully controlled magneto-hydrodynamic instabilities that have historically plagued fusion confinement vessels. Advanced neural feedback controllers adjusted magnetic shaping coils thousands of times per second to quench edge-localized turbulence before it could degrade thermal insulation.\n\n"For decades, maintaining steady burning plasma was considered the central barrier to commercial fusion," stated lead investigator Dr. Henrik Lindqvist. "Today we have proven that controlled fusion can operate stably as an unyielding baseload energy source."\n\nPilot grid-tied demonstration facilities are currently targeting initial electrical interconnection by 2030.',
    category: 'science',
  },
  {
    source: { id: 'scientific-american', name: 'Scientific American' },
    author: 'Clara Moskowitz',
    title: 'James Webb Telescope Detects Atmospheric Water and Methane on Habitable-Zone Exoplanet',
    description:
      'Transmission spectroscopy of exoplanet K2-18b confirms thick atmosphere with chemical signatures indicative of temperate oceans.',
    url: 'https://scientificamerican.com/jwst-habitable-exoplanet',
    urlToImage:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T09:00:00Z',
    content:
      'Astrophysicists analyzing ultra-deep transmission spectra gathered by the James Webb Space Telescope have published definitive evidence of water vapor, methane, and carbon dioxide in the atmosphere of a super-Earth orbiting in the habitable zone of a calm red dwarf star.\n\nThe observations, gathered over seven consecutive planetary transits with the NIRSpec instrument, reveal clear atmospheric absorption fingerprints that rule out barren rock or hydrogen-choked primordial envelopes. Planetary modelers conclude that the spectral ratio is most consistent with a temperate ocean world.\n\n"This represents the clearest atmospheric fingerprint of a temperate terrestrial-mass world beyond our solar system ever recorded," remarked Dr. Aida Beltran of the Space Telescope Science Institute. Further spectroscopy runs are scheduled to assess potential atmospheric biosignatures.',
    category: 'science',
  },
  {
    source: { id: 'national-geographic', name: 'National Geographic' },
    author: 'Douglas Main',
    title: 'Autonomous Deep-Sea Rovers Uncover Thriving Chemosynthetic Ecosystem in Oceanic Trench',
    description:
      'Robotic submersibles diving 9,000 meters into the Mariana Trench discover dozens of undocumented species thriving around serpentine hydrothermal vents.',
    url: 'https://nationalgeographic.com/abyssal-ecosystem-discovery',
    urlToImage:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T06:50:00Z',
    content:
      'An international oceanographic expedition utilizing untethered autonomous deep-diving submersibles has cataloged a vast, thriving biological oasis at a depth of 9,200 meters in the hadal zone.\n\nPowered by geothermal serpentinization reactions rather than solar photosynthesis, the newly discovered hydrothermal fields support dense communities of translucent amphipods, novel predatory siphonophores, and mats of hydrogen-oxidizing archaea that synthesize nutrients in complete darkness under immense crushing pressures.\n\nMarine biologists highlighted that analyzing the extreme enzymes utilized by hadal organisms offers immense potential for industrial biocatalysis and pharmaceutical research. The expedition team has urged international bodies to designate the trench as an untouchable marine scientific reserve.',
    category: 'science',
  },

  // HEALTH
  {
    source: { id: 'the-lancet', name: 'The Lancet' },
    author: 'Dr. Fiona Godlee',
    title: 'Universal Pan-Coronavirus Vaccine Shows 98% Neutralization Against Emerging Strains',
    description:
      'Broadly neutralizing nanoparticle immunogens elicit long-lasting mucosal immunity across animal models and Phase II human cohorts.',
    url: 'https://thelancet.com/universal-coronavirus-vaccine',
    urlToImage:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T10:10:00Z',
    content:
      'Clinical researchers have published remarkable Phase II human trial results demonstrating that a mosaic nanoparticle vaccine stimulates broad, cross-protective antibody responses against all known beta-coronavirus lineages.\n\nRather than targeting mutable surface loops, the vaccine presents structurally conserved epitopes of the viral fusion machinery on self-assembling ferritin scaffolds. In clinical cohorts, the formulation induced high-titer neutralizations that remained robust even against heavily mutated synthetic escape variants.\n\n"Our goal was to end the cycle of chasing seasonal mutations," explained principal investigator Dr. Ramesh Sundaram. "By targeting the immutable structural core of the virus, we provide durable protection against future zoonotic spillover threats."\n\nPhase III efficacy trials involving 25,000 participants across four continents are scheduled to begin next month.',
    category: 'health',
  },
  {
    source: { id: 'stat-news', name: 'STAT News' },
    author: 'Matthew Herper',
    title: 'Non-Invasive Brain-Computer Interfaces Restore Fine Motor Control for Stroke Survivors',
    description:
      'High-density magnetoencephalography headsets combined with neuromuscular stimulation sleeves retrain lost motor pathways.',
    url: 'https://statnews.com/noninvasive-bci-stroke-recovery',
    urlToImage:
      'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T08:45:00Z',
    content:
      'A pioneering clinical trial published in the New England Journal of Medicine has revealed that non-invasive brain-computer interfaces (BCIs) can dramatically accelerate neuro-motor recovery in individuals who suffered severe ischemic strokes.\n\nPatients wearing lightweight wireless sensor caps that decode intended motor cortex activity operated synchronized electronic neuromuscular sleeves. When a patient attempts to move their fingers, the system detects the neural intent within 50 milliseconds and delivers gentle, coordinated functional electrical stimulation to the corresponding muscle groups.\n\nOver an eight-week therapy regimen, 86% of trial participants achieved meaningful, permanent gains in grasping strength, independent dexterity, and daily living tasks. Neurologists observed significant neuroplastic re-wiring around damaged brain regions on functional MRI scans.',
    category: 'health',
  },
  {
    source: { id: 'bbc-news', name: 'BBC Health' },
    author: 'Fergus Walsh',
    title:
      'Global Trial Confirms Longevity and Cardiovascular Benefits of Circadian Sleep Alignment',
    description:
      'Multi-year study across 100,000 individuals demonstrates that consistent sleep timing reduces systemic inflammation and vascular disease risk by 42%.',
    url: 'https://bbc.com/health/circadian-sleep-longevity',
    urlToImage:
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T06:20:00Z',
    content:
      'Sleep scientists and epidemiologists tracking 100,000 participants using wearable biometric monitors have established that consistency in sleep onset and waking times is even more predictive of long-term cardiovascular health than total sleep duration.\n\nParticipants whose sleep schedules varied by less than 30 minutes each day exhibited a 42% lower incidence of major adverse cardiovascular events and 35% lower biomarkers of chronic systemic inflammation compared to irregular sleepers with identical average hours.\n\n"The biological clock regulates cellular repair, glycemic control, and vascular tone with exquisite precision," said lead author Prof. Michelle Evans. "Maintaining a stable circadian rhythm provides immense protective dividends across your entire lifespan."',
    category: 'health',
  },

  // SPORTS
  {
    source: { id: 'the-athletic', name: 'The Athletic' },
    author: 'Sam Amick',
    title:
      'Tactical Evolution: High-Pace Five-Out Offenses Dominate International Basketball Tournaments',
    description:
      'Dynamic ball movement, positionless playmaking, and rim-pressure spacing redefine championship contention.',
    url: 'https://theathletic.com/basketball-tactical-evolution',
    urlToImage:
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T11:10:00Z',
    content:
      "International basketball is experiencing a profound tactical renaissance as teams adopt hyper-fluid five-out offensive schemes that stretch opposing defenses past their breaking point.\n\nIn yesterday evening's tournament clash, the visiting underdogs executed a masterclass in modern spatial discipline. By positioning five skilled ball-handlers along the perimeter, they eliminated traditional rim protection and generated a staggering 46 wide-open three-point attempts.\n\nHead coaches emphasized that roster construction now prioritizes decision-making speed and defensive versatility over traditional static height. Analytics departments showed that teams embracing five-out spacing averaged 1.28 points per possession, the highest efficiency rating recorded in international tournament history.",
    category: 'sports',
  },
  {
    source: { id: 'espn', name: 'ESPN' },
    author: 'Gabriele Marcotti',
    title: 'Champions League Thriller: Dramatic Extra-Time Comeback Stuns Record Stadium Crowd',
    description:
      'Sublime passing combinations and heroic goalkeeping culminate in a dramatic 3-2 aggregate triumph in the 119th minute.',
    url: 'https://espn.com/soccer/champions-league-thriller',
    urlToImage:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T09:25:00Z',
    content:
      'Eighty-two thousand roaring fans witnessed an unforgettable European night as an audacious 119th-minute volley completed a staggering second-half comeback to secure a berth in the tournament semifinals.\n\nTrailing 2-0 on aggregate at halftime, the home side transformed their pressing shape, suffocating the opposition\'s midfield pivot and unleashing wave after wave of incisive counter-attacks down the flanks. A curling free-kick leveled the tie before the late heroics sent the home bench into euphoria.\n\n"Football produces moments that defy logic and statistical probability," exclaimed the emotional manager in the post-match press conference. "Our players fought for every blade of grass, and tonight their belief was rewarded."',
    category: 'sports',
  },
  {
    source: { id: 'reuters', name: 'Reuters Sports' },
    author: 'Mitch Phillips',
    title: 'Marathon World Record Shattered as Biomechanics and Energy-Return Footwear Converge',
    description:
      'Elite runner clocks historic 1:59:12 official marathon time on certified city course under ideal weather conditions.',
    url: 'https://reuters.com/sports/marathon-record-shattered',
    urlToImage:
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T07:15:00Z',
    content:
      'Running history was made early Sunday morning as 24-year-old endurance sensation Kibiwott clocked an official time of 1:59:12, becoming the first athlete to break the two-hour barrier in a sanctioned open-city marathon.\n\nBolstered by precise aerodynamic pacing formations, personalized real-time hydration telemetry, and advanced nitrogen-infused super-foams, the runner maintained an astonishing average split of 2 minutes and 49 seconds per kilometer.\n\nSports scientists in attendance hailed the achievement as the pinnacle of human physiological endurance and biomechanical optimization. Race organizers confirmed that all timing sensors, anti-doping verifications, and course certifications conformed to official international athletics standards.',
    category: 'sports',
  },

  // ENTERTAINMENT
  {
    source: { id: 'the-hollywood-reporter', name: 'The Hollywood Reporter' },
    author: 'Pamela McClintock',
    title:
      'Independent Cinema Renaissance: Low-Budget Visionaries Sweep Prestigious Festival Honors',
    description:
      'Character-driven storytelling, tactile practical effects, and authentic location cinematography captivate global audiences.',
    url: 'https://hollywoodreporter.com/indie-cinema-festival-sweep',
    urlToImage:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T10:40:00Z',
    content:
      'This year\'s international film festival circuit concluded with a decisive affirmation of independent filmmaking as low-budget original features claimed the top three jury awards over heavily marketed studio tentpoles.\n\nThe Palme d\'Or recipient, a poignant family drama filmed on 16mm celluloid for under $3 million, drew a ten-minute standing ovation during its premiere. Critics lauded its nuanced emotional depth, naturalistic lighting, and refusal to rely on derivative algorithmic narrative formulas.\n\n"Audiences are craving genuine human connection and bold artistic voices," remarked festival director Camille Laurent. "When filmmakers trust their actors and commit to distinct creative visions, the screen comes alive with unmatched resonance."',
    category: 'entertainment',
  },
  {
    source: { id: 'rolling-stone', name: 'Rolling Stone' },
    author: 'Brian Hiatt',
    title: 'Spatial Audio and Generative Synthesis Spark New Wave of Contemporary Orchestration',
    description:
      'Acoustic composers and electronic sound artists blend live orchestral ensembles with dynamic 3D audio environments.',
    url: 'https://rollingstone.com/spatial-audio-orchestral-wave',
    urlToImage:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T08:50:00Z',
    content:
      "A thrilling convergence between symphonic orchestration and cutting-edge spatial acoustics is transforming modern concert halls and streaming releases.\n\nIn sold-out performances across London and Tokyo, composers conducted 60-piece acoustic orchestras wired with multi-directional acoustic transducers that pan melodic motifs around the concert hall in response to the conductor's gestures. Listeners describe feeling completely enveloped in shifting harmonic textures that seem to inhabit physical space.\n\nMusicologists point out that spatial composition allows orchestral instruments to occupy distinct acoustic dimensions without frequency masking, creating pristine clarity even during complex polyphonic crescendos.",
    category: 'entertainment',
  },

  // WORLD
  {
    source: { id: 'associated-press', name: 'Associated Press' },
    author: 'Elena Vasquez',
    title: 'Cross-Border Renewable Energy Supergrid Synchronizes Power Grids Across Three Nations',
    description:
      'High-voltage direct current (HVDC) transmission link shares offshore wind and desert solar power with sub-millisecond balancing.',
    url: 'https://apnews.com/world/crossborder-renewable-supergrid',
    urlToImage:
      'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T11:25:00Z',
    content:
      'Energy ministers from three neighboring countries gathered today to commission an interconnected 5-gigawatt high-voltage direct current (HVDC) power corridor, marking a historic leap in regional green energy integration.\n\nThe transmission link connects abundant northern offshore wind farms directly to southern solar arrays and alpine pumped-hydro storage reservoirs. By smoothing diurnal variations across geographic zones, the supergrid maintains round-the-clock grid reliability without firing fossil backup plants.\n\n"Today we demonstrate that electrical grids know no political borders when the common goal is energy independence and decarbonization," declared the joint ministerial declaration. Additional nations have requested accession talks to connect their municipal grids by 2028.',
    category: 'world',
  },
  {
    source: { id: 'reuters', name: 'Reuters World' },
    author: 'Kavita Sharma',
    title: 'UN Climate Accord Enacts Historic Clean Water Access and Glacier Preservation Protocol',
    description:
      'Delegations establish a multilateral emergency trust fund to safeguard alpine watersheds and protect downstream freshwater supplies.',
    url: 'https://reuters.com/world/glacier-preservation-protocol',
    urlToImage:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T09:05:00Z',
    content:
      'Diplomats representing 160 nations reached unanimous agreement on a comprehensive international treaty to protect critical glacial watersheds and guarantee clean water access for vulnerable riparian populations.\n\nThe agreement mandates strict localized emissions curbs around high-altitude icefields, bans environmentally hazardous mining adjacent to headwaters, and establishes a $50 billion adaptation fund to construct resilient water retention infrastructure for downstream agrarian basins.\n\nHydrologists and humanitarian agencies applauded the treaty as an indispensable safeguard against seasonal water insecurity for over 1.5 billion people.',
    category: 'world',
  },

  // POLITICS
  {
    source: { id: 'politico', name: 'Politico' },
    author: 'James Harrington',
    title:
      'Open Source Civic Governance: Municipalities Adopt Transparent Public Budgeting Platforms',
    description:
      'Citizens directly allocate municipal infrastructure spending through tamper-evident digital voting and deliberative town halls.',
    url: 'https://politico.com/civic-governance-open-budgeting',
    urlToImage:
      'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T10:05:00Z',
    content:
      'Civic governance is embracing unprecedented transparency as fifteen major metropolitan governments enacted ordinances requiring participatory digital budgeting for public works allocations.\n\nUnder the new protocols, residents vote directly on neighborhood park improvements, pedestrian crosswalk installations, and community center refurbishments using verifiable cryptographic credentials. Every municipal expenditure is tracked in real-time on public dashboards, eliminating back-room procurement favoritism.\n\nCivic participation rates jumped four-fold compared to traditional city council hearings, with young families and working-class neighborhoods leading grassroots proposal submissions.',
    category: 'politics',
  },

  // ENVIRONMENT
  {
    source: { id: 'the-guardian', name: 'The Guardian' },
    author: 'Fiona Harvey',
    title: 'Perovskite-Silicon Tandem Solar Cells Exceed 34% Efficiency in Commercial Field Trials',
    description:
      'Next-generation photovoltaic modules yield 40% more electricity per square meter than conventional silicon panels.',
    url: 'https://theguardian.com/environment/perovskite-tandem-solar-breakthrough',
    urlToImage:
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T11:35:00Z',
    content:
      'Field trial data from independent testing laboratories in Germany and Australia confirmed today that commercial tandem perovskite-silicon solar modules have achieved an operational efficiency of 34.2% under full sunlight conditions.\n\nBy layering wide-bandgap perovskite crystals directly on top of conventional crystalline silicon bases, the dual-junction cells capture high-energy blue and green photons while allowing lower-energy infrared light to penetrate into the lower layer. Accelerated weather testing proved that advanced atomic-layer encapsulation protects the perovskite layer against moisture degradation for over 25 years.\n\nRenewable utility developers noted that the higher density dramatically reduces land acquisition and racking balance-of-system costs, making solar power even cheaper than grid transmission fees in many regions.',
    category: 'environment',
  },
  {
    source: { id: 'national-geographic', name: 'National Geographic' },
    author: 'Carl Safina',
    title: 'Autonomous Ocean Cleaners Intercept 10,000 Tons of Plastic Waste at River Mouths',
    description:
      'Solar-powered interceptor vessels prevent marine plastic debris from entering delicate ocean currents and coral reef sanctuaries.',
    url: 'https://nationalgeographic.com/ocean-cleaners-milestone',
    urlToImage:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T07:55:00Z',
    content:
      'Environmental engineering foundations reported a monumental marine conservation milestone as a fleet of fifty solar-powered automated interceptor barges celebrated the extraction of their 10,000th ton of waste plastic from major river mouths.\n\nDeploying permeable containment barriers that guide surface debris directly into automated conveyor belts without disturbing fish or aquatic wildlife, the vessels operate continuously along high-runoff waterways. Recycled plastics are sorted and processed into construction aggregates by local community recycling cooperatives.\n\nMarine biologists observing coastal estuaries reported immediate improvements in benthic water clarity and a swift resurgence of juvenile marine life.',
    category: 'environment',
  },

  // EDUCATION
  {
    source: { id: 'edweek', name: 'Education Week' },
    author: 'Sarah D. Sparks',
    title: 'Inquiry-Based Learning and Micro-Credentials Close Practical Skills Gaps in Higher Ed',
    description:
      'Universities collaborate with vocational apprenticeships to provide students with verifiable portfolio credentials alongside degrees.',
    url: 'https://edweek.com/inquiry-learning-microcredentials',
    urlToImage:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T09:50:00Z',
    content:
      'Higher education institutions are revamping undergraduate curricula to blend rigorous academic scholarship with practical, industry-verified micro-credentials.\n\nRather than passive lecture halls, students collaborate in interdisciplinary studios to design real-world solutions for local clean energy transitions, public health outreach, and digital accessibility tools. Graduating cohorts present verifiable digital portfolios demonstrating applied mastery to prospective employers.\n\nPost-graduate employment surveys revealed a 92% placement rate within four months of graduation, with employers praising graduates for their collaborative agility, critical thinking, and rapid problem-solving abilities.',
    category: 'education',
  },

  // GENERAL
  {
    source: { id: 'monocle', name: 'Monocle' },
    author: 'Andrew Tuck',
    title: 'The 15-Minute City Triumph: How Walkable Neighborhoods Revitalized Urban Happiness',
    description:
      'Transforming car-centric avenues into shaded parkways, cycle highways, and mixed-use public plazas elevates civic wellbeing.',
    url: 'https://monocle.com/urbanism-15-minute-city-triumph',
    urlToImage:
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-03T08:10:00Z',
    content:
      'A comprehensive sociological study across twelve metropolitan cities that embraced the 15-minute city model revealed that prioritizing human-scale streetscapes has produced an unprecedented surge in resident satisfaction, local economic vitality, and mental wellbeing.\n\nBy ensuring that daily necessities—groceries, primary healthcare, public libraries, parks, and schools—are accessible within a comfortable 15-minute walk or bicycle ride, cities have reclaimed thousands of square meters previously lost to asphalt parking lots and highway flyovers.\n\nNeighborhood shopkeepers reported a 35% increase in foot traffic, while public health metrics showed marked declines in childhood asthma and stress-related ailments.',
    category: 'general',
  },
];

// Procedural dynamic generation components for endless fresh news stream
const CATEGORY_TOPICS: Record<
  string,
  Array<{
    headlineTemplates: string[];
    descriptions: string[];
    contentTemplates: string[];
    sources: Array<{ id: string; name: string }>;
    authors: string[];
    images: string[];
  }>
> = {
  technology: [
    {
      headlineTemplates: [
        'Next-Gen Neuromorphic Accelerators Achieve Sub-Watt Edge Intelligence',
        'Breakthrough In Multi-Modal Agent Architectures Sets New Reasoning Benchmarks',
        'Researchers Synthesize Room-Temperature Optical Waveguides For Quantum Interconnects',
        'Distributed Zero-Knowledge Verification Scales Cross-Cloud Trust Fabrics',
        '2-Nanometer GAA Transistors Enter High-Yield Commercial Foundry Production',
      ],
      descriptions: [
        'Semiconductor laboratories report radical energy efficiency gains as computational physics transitions towards biologically inspired architectures.',
        'Independent benchmark evaluations confirm autonomous coding and reasoning models have attained unprecedented multi-step problem solving accuracy.',
        'Novel photonic substrate materials dramatically diminish optical insertion losses, paving the way for scalable quantum computing clusters.',
        'High-throughput cryptographic protocols enable decentralized applications to settle microtransactions with mathematical certainty and zero data leakage.',
        'Advanced extreme ultraviolet lithography enables sub-atomic precision for the next generation of server microprocessors and mobile silicon.',
      ],
      contentTemplates: [
        'Semiconductor research teams have published verified breakthrough data demonstrating sub-watt neural processing on specialized silicon architectures.\n\nBy executing weight computations directly inside memristor crossbar arrays, the novel chips eliminate memory bus contention and lower power consumption by up to 88% compared to traditional GPU architectures.\n\n"We are entering an era where edge computing devices will possess the same contextual comprehension as massive cloud server racks," stated lead researcher Dr. Marcus Vance.\n\nPilot hardware evaluation boards are being distributed to automotive and consumer electronics manufacturers worldwide.',
      ],
      sources: [
        { id: 'techcrunch', name: 'TechCrunch' },
        { id: 'the-verge', name: 'The Verge' },
        { id: 'wired', name: 'Wired' },
        { id: 'mit-tech-review', name: 'MIT Technology Review' },
      ],
      authors: [
        'Alex Wilhelm',
        'Will Knight',
        'Frederic Lardinois',
        'Kavita Patel',
        'Marcus Vance',
      ],
      images: [
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  business: [
    {
      headlineTemplates: [
        'Global Sovereign Wealth Allocations Surge Into Clean Tech Infrastructure Funds',
        'Fintech Clearing Protocols Eliminate Cross-Border Settlement Frictions',
        'Venture Capital Deployments in Deep Hardware Startups Hit Multi-Year Highs',
        'Central Bank Digital Currency Pilot Completes Multilateral Forex Settlements',
        'Supply Chain Diversification Drives Unprecedented Industrial Real Estate Growth',
      ],
      descriptions: [
        'Institutional asset managers commit over $400 billion toward grid-scale battery storage and transmission networks worldwide.',
        'Automated liquidity rails and distributed ledger settlement reduce clearing costs from days down to sub-second finality.',
        'Investors prioritize fundamental physics, semiconductor fabrication, and clean energy over incremental enterprise software.',
        'Treasury departments across 18 countries verify instant bilateral currency swaps with negligible transactional friction.',
        'Manufacturing reshoring initiatives spur modern logistics campuses equipped with autonomous material handling fleets.',
      ],
      contentTemplates: [
        'International financial markets responded with strong positive momentum as sovereign wealth managers announced expanded capital allocations for strategic infrastructure projects.\n\nInstitutional capital inflows toward renewable energy networks, advanced semiconductor packaging facilities, and high-speed freight corridors surged 38% year-over-year.\n\n"Long-term economic resilience requires heavy, strategic capital investment in physical infrastructure and foundational supply chains," noted chief market economist Sarah Ponczek.\n\nEquity indices tracking global infrastructure operators traded sharply higher following the announcements.',
      ],
      sources: [
        { id: 'bloomberg', name: 'Bloomberg' },
        { id: 'financial-times', name: 'Financial Times' },
        { id: 'reuters', name: 'Reuters' },
        { id: 'wsj', name: 'The Wall Street Journal' },
      ],
      authors: [
        'Sarah Ponczek',
        'Tracy Alloway',
        'Danielle Chaves',
        'Gregory Zuckerman',
        'Marcus Vance',
      ],
      images: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  science: [
    {
      headlineTemplates: [
        'Deep-Space Infrared Observatories Map Pristine Proto-Galactic Clusters',
        'High-Temperature Superconducting Magnets Double Magnetic Confinement Density',
        'Biologists Synthesize Artificial Enzymes Capable Of Breaking Down Complex Polymers',
        'Geological Survey Unveils Massive Subterranean Freshwater Aquifers In Arid Zones',
        'Particle Accelerator Experiments Reveal Subtle Symmetries In Neutrino Oscillation',
      ],
      descriptions: [
        'Astrophysicists capture light emitted just 350 million years after the Big Bang, rewriting models of early cosmic structure formation.',
        'Novel magnet geometries achieve record plasma pressure ratios, accelerating the timeline toward commercial fusion power.',
        'Engineered bio-catalytic proteins degrade persistent plastics into harmless organic compounds within hours.',
        'High-resolution satellite gravimetry confirms vast underground freshwater reservoirs that could secure regional irrigation for centuries.',
        'Groundbreaking neutrino measurements offer crucial clues toward explaining the matter-antimatter imbalance in the observable universe.',
      ],
      contentTemplates: [
        'International scientific teams published peer-reviewed findings today detailing unprecedented discoveries that expand the boundaries of modern physics and cosmology.\n\nUsing high-precision cryogenic detectors and adaptive optics, the research collaboration mapped structural dynamics with sub-atomic fidelity.\n\n"Every major experimental leap provides a clearer lens through which to understand our universe," said lead astrophysicist Dr. Gideon Lichfield.\n\nFollow-up observations are slated to run across international observatories throughout the coming year.',
      ],
      sources: [
        { id: 'nature', name: 'Nature' },
        { id: 'scientific-american', name: 'Scientific American' },
        { id: 'science-mag', name: 'Science' },
        { id: 'national-geographic', name: 'National Geographic' },
      ],
      authors: [
        'Ewen Callaway',
        'Quirin Schiermeier',
        'Clara Moskowitz',
        'Dr. David Vance',
        'Carl Safina',
      ],
      images: [
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517976487502-5c425a4db827?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  health: [
    {
      headlineTemplates: [
        'Targeted Gene-Editing Clears Pre-Clinical Safety Trials For Inherited Cardiomyopathy',
        'Non-Invasive Optical Sensors Detect Neurological Biomarkers Years Before Symptom Onset',
        'Global Health Initiative Achieves 95% Childhood Immunization Rate in Target Regions',
        'Novel Synthetic Antimicrobial Peptides Overcome Multi-Drug Resistant Superbugs',
        'Personalized Microbiome Interventions Reverse Metabolic Syndrome In Randomized Trials',
      ],
      descriptions: [
        'Precision CRISPR base-editing corrects genetic heart defects without triggering off-target chromosomal translocations.',
        'High-speed retinal scans identify minute vascular and neural changes correlated with early-stage neurodegenerative disorders.',
        'Coordinated international supply chains deliver heat-stable oral vaccines to remote communities, eliminating regional endemic reservoirs.',
        'Designed via generative molecular modeling, novel peptide structures disrupt bacterial cell membranes without human cell toxicity.',
        'Dietary microbiome recalibration leads to sustained glycemic normalization and marked reduction in systemic inflammatory markers.',
      ],
      contentTemplates: [
        'Medical researchers and clinical trial investigators announced major milestones today in the rapid progression of precision therapeutics.\n\nIn controlled multicenter double-blind trials, patients receiving the molecular intervention demonstrated statistically superior outcomes with negligible adverse events.\n\n"We are shifting medical practice from treating symptoms to systematically correcting underlying cellular etiologies," explained chief medical officer Dr. Fiona Godlee.\n\nRegulatory authorities are expediting review timelines to enable broad clinical availability by year-end.',
      ],
      sources: [
        { id: 'the-lancet', name: 'The Lancet' },
        { id: 'stat-news', name: 'STAT News' },
        { id: 'bbc-health', name: 'BBC Health' },
        { id: 'nature-medicine', name: 'Nature Medicine' },
      ],
      authors: [
        'Dr. Fiona Godlee',
        'Matthew Herper',
        'Fergus Walsh',
        'Dr. Maya Raman',
        'Ewen Callaway',
      ],
      images: [
        'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  sports: [
    {
      headlineTemplates: [
        'Dramatic Final-Lap Overtake Clinches Thrilling Motorsport Grand Prix Victory',
        'Youth Sports Academies Pioneer Biomechanical Injury Prevention Frameworks',
        'Grand Slam Champion Stuns Top Seed In Five-Set Masterclass Of Tactical Precision',
        'Record-Breaking Relay Team Captures Gold With Flawless Baton Exchanges',
        'Underdog Franchise Completes Historic Playoff Sweep With Stifling Half-Court Defense',
      ],
      descriptions: [
        'A daring maneuver on the penultimate corner seals a memorable triumph before a roaring crowd of motorsport enthusiasts.',
        'High-speed wearable telemetry and load-monitoring algorithms reduce soft-tissue injuries by over 60% across junior sports leagues.',
        'Unrelenting baseline consistency and timely net approaches fuel one of the greatest upsets in recent tennis tournament history.',
        'Synchronized transition timing and blistering sprint splits lead to a new world championship record in track and field.',
        'A resilient defensive unit forces 24 turnovers to seal an unforgettable championship series victory.',
      ],
      contentTemplates: [
        'Sports fans around the globe were treated to an electrifying athletic spectacle as championship contenders battled down to the final whistle.\n\nThe contest featured breathtaking changes in momentum, tactical adaptations, and exceptional displays of physical grit and poise under immense pressure.\n\n"Our athletes executed every phase of the game plan with utter composure and heart," praised the winning head coach in post-game remarks.\n\nTournament standings now set up a mouth-watering semifinal clash scheduled for the upcoming weekend.',
      ],
      sources: [
        { id: 'espn', name: 'ESPN' },
        { id: 'the-athletic', name: 'The Athletic' },
        { id: 'reuters-sports', name: 'Reuters Sports' },
        { id: 'bbc-sport', name: 'BBC Sport' },
      ],
      authors: ['Zach Lowe', 'Sam Amick', 'Mitch Phillips', 'Gabriele Marcotti', 'David Ornstein'],
      images: [
        'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  entertainment: [
    {
      headlineTemplates: [
        'Visionary Auteur Unveils Groundbreaking Immersive Theater Experience',
        'Acoustic Composers Merge Historical Instruments With Holographic Audio Design',
        'Indie Studio Animation Wins Acclaim For Hand-Drawn Expressive Artistry',
        'Global Literature Festival Awards Coveted Laureate To Emerging Novelist',
        'Interactive Game Directors Blend Narrative Storytelling With Adaptive Musical Scores',
      ],
      descriptions: [
        'Dynamic digital sets and intimate character acting create an unforgettable theatrical journey that dissolves the fourth wall.',
        'Surround sound transducers transform classical chamber works into three-dimensional acoustic tapestries.',
        'Audiences and critics celebrate a stunning return to hand-crafted traditional animation techniques.',
        'A lyrical debut novel examining intergenerational memory and cultural heritage earns highest literary accolades.',
        'Adaptive orchestral arrangements modulate seamlessly in response to real-time player choices and environmental tension.',
      ],
      contentTemplates: [
        'The global creative arts and entertainment community celebrated inspiring achievements today as innovative storytelling pushed creative horizons.\n\nFrom sold-out theatrical premieres to international critical acclaim, artists are connecting with audiences through genuine emotional resonance and visionary technique.\n\n"Great art reminds us of our shared humanity and our capacity for wonder," remarked festival director Camille Laurent.\n\nExhibition tours and digital streaming releases will expand to international markets beginning next month.',
      ],
      sources: [
        { id: 'variety', name: 'Variety' },
        { id: 'the-hollywood-reporter', name: 'The Hollywood Reporter' },
        { id: 'rolling-stone', name: 'Rolling Stone' },
        { id: 'deadline', name: 'Deadline' },
      ],
      authors: ['Brent Lang', 'Pamela McClintock', 'Brian Hiatt', 'Clara Chen', 'Matt Donnelly'],
      images: [
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  world: [
    {
      headlineTemplates: [
        'Diplomatic Accord Establishes Protected High-Altitude Wildlife Corridors Across Borders',
        'International Clean Water Consortium Commissions Solar Desalination Network',
        'Summit of Emerging Economies Enacts Harmonized Digital Trade Standards',
        'Global Disaster Relief Network Deploys Rapid Autonomous Aerial Logistics Fleet',
        'Multilateral Cultural Accord Repatriates Ancient Artifacts To Ancestral Lands',
      ],
      descriptions: [
        'Border nations agree to eliminate physical barriers along endangered mountain habitats, securing vital seasonal migratory flyways.',
        'Zero-emission solar thermal desalination plants provide over 500 million liters of potable water daily to drought-stricken coastal cities.',
        'Cross-border digital certification and harmonized customs protocols reduce port container dwell times by 55%.',
        'Autonomous long-range cargo drones deliver emergency medical supplies and water filtration units within two hours of natural disaster declarations.',
        'Preservation treaties celebrate the voluntary return of sacred indigenous sculptures and historical manuscripts to native museums.',
      ],
      contentTemplates: [
        'International delegates and diplomatic representatives finalized a historic multilateral pact today, demonstrating the power of cross-border collaboration.\n\nThe framework establishes binding verification mechanisms, cooperative funding structures, and shared scientific telemetry.\n\n"When nations unite around practical humanitarian and environmental imperatives, we forge lasting foundations for peaceful progress," declared the joint summit communiqué.\n\nImplementation working groups will begin field deployments across member nations over the upcoming quarter.',
      ],
      sources: [
        { id: 'associated-press', name: 'Associated Press' },
        { id: 'reuters-world', name: 'Reuters World' },
        { id: 'bbc-world', name: 'BBC World' },
        { id: 'the-guardian', name: 'The Guardian' },
      ],
      authors: [
        'Elena Vasquez',
        'Kavita Sharma',
        'Clive Myrie',
        'James Harrington',
        'Aisha Al-Mansoor',
      ],
      images: [
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  politics: [
    {
      headlineTemplates: [
        'Parliament Passes Landmark Legislation Mandating Automated Algorithmic Transparency',
        'Civic Accountability Board Enacts Real-Time Procurement Auditing System',
        'Bipartisan Infrastructure Accord Approves High-Speed Intercity Electric Rail Corridor',
        'Consumer Protection Agency Bans Deceptive Dark Patterns Across Digital Platforms',
        'Municipal Reform Measures Expand Ranked-Choice Voting To Local School Boards',
      ],
      descriptions: [
        'Major technology operators must provide verifiable explainability frameworks for automated content recommendation engines.',
        'Public expenditure dashboards display municipal contract bids and milestone disbursements with cryptographically verified receipts.',
        'Federal funding guarantees construction of modern electrified passenger lines connecting six major manufacturing centers.',
        'Strict regulatory guidance penalizes manipulative cancellation flows and coercive subscription renewal mechanisms.',
        'Voters embrace electoral modernizations designed to foster collaborative civic debate and eliminate vote-splitting distortions.',
      ],
      contentTemplates: [
        'Lawmakers and civic leaders approved comprehensive statutory reforms today aimed at bolstering democratic transparency and consumer rights.\n\nThe legislation passed with broad bipartisan support following extensive public hearings and expert testimony from technologists, legal scholars, and civil liberties advocates.\n\n"Trust in public institutions is earned through transparency, accountability, and demonstrable service to citizens," stated the committee chair during the bill signing.\n\nEnforcement provisions will take effect across public agencies and commercial entities over the coming months.',
      ],
      sources: [
        { id: 'politico', name: 'Politico' },
        { id: 'the-hill', name: 'The Hill' },
        { id: 'bbc-news', name: 'BBC News' },
        { id: 'washington-post', name: 'The Washington Post' },
      ],
      authors: [
        'James Harrington',
        'Amara Okafor',
        'Robert Sterling',
        'Elena Vasquez',
        'Sarah Jenkins',
      ],
      images: [
        'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  environment: [
    {
      headlineTemplates: [
        'Urban Rewilding Initiatives Lower City Surface Temperatures by 4.5 Degrees Celsius',
        'Advanced Flow Batteries Provide 24-Hour Grid Balancing for Massive Solar Farm',
        'Satellite Surveys Confirm Rebound of Endangered Keystone Predators in Reclaimed Forests',
        'Direct Air Carbon Mineralization Facility Permanently Sequesters Industrial Emissions',
        'Coastal Salt Marsh Restoration Protects Barrier Islands From Storm Surge Inundation',
      ],
      descriptions: [
        'Replacing concrete medians with native wildflower meadows and shaded tree canopies creates thriving urban microclimates.',
        'Non-toxic iron-flow chemistry ensures safe, long-duration energy storage without reliance on rare earth minerals.',
        'Continuous wildlife acoustic monitors record healthy breeding packs returning to protected ecological corridors.',
        'Geothermal energy powers specialized reactors that turn captured atmospheric CO2 into solid carbonate rock within basalt formations.',
        'Restored coastal wetlands absorb wave energy, drastically reducing flood damages for adjacent shoreline communities.',
      ],
      contentTemplates: [
        'Environmental scientists and conservation teams released comprehensive field data showing the remarkable ecological returns of large-scale habitat rehabilitation.\n\nThrough community-led land management, native plant reintroduction, and strategic removal of artificial barriers, biodiversity indices rebounded dramatically.\n\n"Nature possesses astonishing resilience when we give natural systems the space and protection they need to heal," emphasized lead ecologist Dr. Maya Raman.\n\nRegional authorities have pledged sustained funding to expand the conservation corridors over the next decade.',
      ],
      sources: [
        { id: 'the-guardian', name: 'The Guardian' },
        { id: 'national-geographic', name: 'National Geographic' },
        { id: 'nature-climate', name: 'Nature Climate' },
        { id: 'bbc-environment', name: 'BBC Environment' },
      ],
      authors: ['Fiona Harvey', 'Carl Safina', 'Dr. Maya Raman', 'Elena Vasquez', 'Douglas Main'],
      images: [
        'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  education: [
    {
      headlineTemplates: [
        'Interactive Open-Source Science Textbooks Eliminate Burden For Undergraduates',
        'Universal High-Speed Broadband Reaches 10,000 Rural Public Classrooms',
        'Adaptive Language Immersion Platforms Double Multilingual Fluency In Elementary Schools',
        'University Research Consortia Make All Publicly Funded Discoveries Free To The World',
        'Vocational Technical Academies Report 98% Placement In Clean Energy Careers',
      ],
      descriptions: [
        'Community-curated digital textbooks featuring interactive 3D simulations save students millions in course materials.',
        'Fiber-optic connectivity enables rural students to participate in live virtual laboratory experiments with national universities.',
        'Spaced-repetition conversational games help primary school children learn secondary languages with natural cognitive ease.',
        'Global academic libraries unite behind zero-embargo open access mandates for all publicly supported scientific literature.',
        'Hands-on training in solar installation, heat pump maintenance, and electric vehicle diagnostics guarantees high-wage jobs.',
      ],
      contentTemplates: [
        'Educators, policy leaders, and student advocates celebrated meaningful pedagogical advances today as innovative learning models demonstrated measurable gains.\n\nRather than rigid rote memorization, students engage in collaborative inquiry and hands-on laboratory exploration.\n\n"When we democratize access to high-quality educational tools, we unlock the extraordinary potential of every learner," noted Prof. Arthur Chen.\n\nParticipating school districts plan to share their open curricula with partner systems nationwide.',
      ],
      sources: [
        { id: 'edweek', name: 'Education Week' },
        { id: 'the-chronicle', name: 'The Chronicle of Higher Education' },
        { id: 'bbc-education', name: 'BBC Education' },
        { id: 'reuters', name: 'Reuters' },
      ],
      authors: [
        'Prof. Arthur Chen',
        'Sarah D. Sparks',
        'Aisha Al-Mansoor',
        'Clive Myrie',
        'Amara Okafor',
      ],
      images: [
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
  general: [
    {
      headlineTemplates: [
        'High-Speed Electric Rail Corridor Connects Four Metropolitan Hubs In Record Travel Times',
        'Public Library Transformations Offer Digital Media Labs And Maker Spaces For Communities',
        'Community Solar Gardens Enable Apartment Renters To Share Clean Energy Savings',
        'Slow Travel and Eco-Tourism Movements Spark Cultural Preservation In Historic Villages',
        'Mass Timber Architecture Slashes Carbon Footprint of New Civic Concert Hall',
      ],
      descriptions: [
        'Zero-emission magnetic-levitation and bullet train lines slash intercity commute durations by 65%.',
        'Modernized public branches provide 3D printers, recording studios, and digital literacy classes free to all neighborhood residents.',
        'Neighborhood cooperative arrays allow renters and small businesses to offset electrical bills with solar credits.',
        'Travelers embrace immersive, low-impact cultural journeys that support local artisans and traditional craftsmanship.',
        'Engineered cross-laminated timber provides structural warmth, seismic resilience, and carbon-negative construction.',
      ],
      contentTemplates: [
        'Metropolitan planners and civic designers announced the completion of visionary public infrastructure projects dedicated to enhancing community life.\n\nFrom walkable green corridors to community innovation centers, public investments are delivering tangible improvements in daily living standards.\n\n"Great cities are built on accessible, beautiful public spaces that bring people together," remarked lead architect Clive Myrie.\n\nCivic tours and public opening ceremonies will welcome community members throughout the coming weekend.',
      ],
      sources: [
        { id: 'bbc-news', name: 'BBC News' },
        { id: 'monocle', name: 'Monocle' },
        { id: 'associated-press', name: 'Associated Press' },
        { id: 'the-guardian', name: 'The Guardian' },
      ],
      authors: ['Clive Myrie', 'Andrew Tuck', 'Elena Vasquez', 'Fiona Harvey', 'Marcus Vance'],
      images: [
        'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ],
};

const ALL_CATEGORY_KEYS = [
  'technology',
  'business',
  'science',
  'health',
  'sports',
  'entertainment',
  'world',
  'politics',
  'environment',
  'education',
  'general',
];

/**
 * Normalizes category names to standard keys (e.g. finance -> business, climate -> environment)
 */
export function normalizeCategory(category?: string): string {
  if (!category || category === 'all') return 'all';
  const lower = category.toLowerCase().trim();
  if (lower === 'finance') return 'business';
  if (lower === 'climate') return 'environment';
  return lower;
}

const DYNAMIC_HEADLINE_MODIFIERS = [
  'Sets New Commercial Benchmark In Global Field Trials',
  'Accelerates Multi-National Deployment Across Key Sectors',
  'Demonstrates Transformative Efficiency In Independent Audit',
  'Secures Cross-Border Regulatory Approval For Immediate Rollout',
  'Integrates Standardized Open Architecture For Global Adoption',
  'Receives Major Institutional Backing From Multilateral Consortia',
  'Expands Regional Pilot Program To Over 50 New Communities',
  'Unveils Next-Generation Milestone Ahead Of Projected Schedule',
  'Pioneers Breakthrough Protocol To Modernize Existing Infrastructure',
  'Establishes Long-Term International Partnership For Scaled Access',
];

const DYNAMIC_CATEGORY_ENTITIES: Record<string, string[]> = {
  technology: [
    'Advanced Quantum Interconnect Consortium',
    'Next-Gen Neuromorphic Computing Initiative',
    'Distributed Zero-Knowledge Privacy Protocol',
    'Autonomous Multi-Modal Robotics Laboratory',
    'Open-Weight Frontier Foundation Model Group',
    'Sub-Milliwatt Edge Intelligence Architecture',
    'Photonic Interconnect Networking Taskforce',
    'Post-Quantum Lattice Encryption Standard',
  ],
  business: [
    'Global Clean Energy Infrastructure Alliance',
    'Cross-Border Digital Settlement Network',
    'Multilateral Sovereign Wealth Syndicate',
    'Deep-Tech Hardware Venture Capital Fund',
    'Global Supply Chain Resilience Initiative',
    'Green Transition Collateral Council',
    'Automated Port Logistics Clearinghouse',
    'Decentralized Trade Finance Protocol',
  ],
  science: [
    'International Cryogenic Physics Collaboration',
    'Deep-Space Habitable Exoplanet Survey',
    'Synthetic Bio-Catalysis Research Center',
    'High-Temperature Superconducting Magnet Project',
    'Global Abyssal Trench Oceanographic Expedition',
    'Atmospheric Paleo-Climatology Core Team',
    'Sub-Atomic Neutrino Symmetry Observatory',
    'Next-Gen Burning Plasma Confinement Facility',
  ],
  health: [
    'Precision Molecular Cardiology Consortium',
    'Non-Invasive Early-Stage Oncology Network',
    'Heat-Stable Universal Vaccine Initiative',
    'Personalized Glycemic Microbiome Trial',
    'Synthetic Antimicrobial Peptide Discovery Lab',
    'Clinical Transdermal Biosensor Taskforce',
    'Organ-On-A-Chip Multicenter Study Group',
    'Synaptic Density Neuroplasticity Program',
  ],
  sports: [
    'Biomechanical Athletic Longevity Academy',
    'Championship Motorsport Engineering Team',
    'Autonomous Tactical Video Analytics System',
    'Endurance Physiology Peak Performance Lab',
    'Sub-Second Real-Time Offside Telemetry Unit',
    'Junior Sports Concussion Mitigation Protocol',
    'High-Altitude Aerodynamic Velocity Institute',
    'Olympic Relay Transition Optimization Hub',
  ],
  entertainment: [
    'Volumetric LED Stage Cinema Collective',
    'Generative Spatial Audio Performing Arts Guild',
    'Cross-Media Worldbuilding Studio Coalition',
    'Archival 8K Volumetric Preservation Project',
    'Interactive Real-Time Virtual Theater Lab',
    'Independent International Film Showcase',
    'Autonomous Choreography Drone Ensemble',
    'Next-Gen Immersive Exhibition Platform',
  ],
  world: [
    'Intercontinental High-Speed Freight Corridor',
    'Multilateral Basin Water Cooperation Accord',
    'Cross-Border Clean Microgrid Cooperative',
    'High-Seas Marine Ecosystem Protection Commission',
    'Global Humanitarian Food Reserve Network',
    'Bilateral Border Modernization Taskforce',
    'Arctic Scientific Climate Sanctuary Council',
    'International Disaster Preparedness Alliance',
  ],
  politics: [
    'Bipartisan AI Transparency & Safety Commission',
    'Electoral Cryptographic Audit Authority',
    'Municipal Participatory Governance Platform',
    'Clean Transit Infrastructure Appropriations Board',
    'National Grid Modernization Regulatory Agency',
    'Open-Data Public Stewardship Taskforce',
    'Civil Service Technology Ethics Council',
    'Constitutional Environmental Jurisprudence Forum',
  ],
  environment: [
    'Global Coastal Mangrove Regeneration Compact',
    'Perovskite High-Efficiency Solar Consortium',
    'Direct-Air Carbon Mineralization Complex',
    'Industrial Closed-Loop Water Recovery Coalition',
    'Autonomous Wildfire Reforestation Squadron',
    'Sub-Polar Ozone Layer Monitoring Network',
    'Municipal Circular Bio-Waste Infrastructure',
    'Agricultural Soil Microbiome Renewal Pact',
  ],
  education: [
    'Adaptive Cognitive Mathematics Learning Hub',
    'Open-Access Quantum Curriculum Initiative',
    'Immersive VR Science Access Program',
    'Early Multilingual Neurodevelopment Study',
    'Hands-On Robotics Micro-Credential Alliance',
    'Global Foundational Literacy Consortium',
    'Rural Digital Academy Outreach Project',
    'Lifelong STEM Workforce Reskilling Initiative',
  ],
  general: [
    'International Technology Safeguards Forum',
    'Global Infrastructure Innovation Council',
    'Public Domain Scientific Knowledge Archive',
    'Metropolitan Clean Transitway Network',
    'Regional Sustainability Excellence Program',
    'Community Resilience & Innovation Network',
  ],
};

/**
 * Procedurally generates a deterministic, realistic news article for any category and sequence index.
 * Guaranteed to produce coherent headlines, journalistic descriptions, multi-paragraph text, and images.
 */
export function generateProceduralArticle(category: string, index: number): NewsApiArticle {
  const normCat =
    normalizeCategory(category) === 'all'
      ? ALL_CATEGORY_KEYS[index % ALL_CATEGORY_KEYS.length]
      : normalizeCategory(category);

  const topicConfig = CATEGORY_TOPICS[normCat]?.[0] || CATEGORY_TOPICS.general[0];
  const headlineCount = topicConfig.headlineTemplates.length;
  const headlineIdx = index % headlineCount;
  const cycle = Math.floor(index / headlineCount);

  let title = '';
  let description = '';

  if (cycle === 0) {
    title = topicConfig.headlineTemplates[headlineIdx];
    description = topicConfig.descriptions[headlineIdx % topicConfig.descriptions.length];
  } else {
    const entityList = DYNAMIC_CATEGORY_ENTITIES[normCat] || DYNAMIC_CATEGORY_ENTITIES.general;
    const entity = entityList[(headlineIdx + cycle * 3) % entityList.length];
    const modifier =
      DYNAMIC_HEADLINE_MODIFIERS[(headlineIdx * 3 + cycle) % DYNAMIC_HEADLINE_MODIFIERS.length];
    title = `${entity} ${modifier}`;
    description = `${entity} announced today that operations have officially reached a new operational milestone, with verified field data confirming outstanding performance across target sectors.`;
  }

  const source = topicConfig.sources[(index + cycle) % topicConfig.sources.length];
  const author = topicConfig.authors[(index + cycle) % topicConfig.authors.length];
  const image = topicConfig.images[(index + cycle) % topicConfig.images.length];
  const content = topicConfig.contentTemplates[0];

  // Stagger timestamps: each index is roughly 25-45 minutes older than previous
  const minutesAgo = index * 35 + 15;
  const publishedDate = new Date(Date.now() - minutesAgo * 60 * 1000);

  return {
    source,
    author,
    title,
    description,
    url: `#procedural-${normCat}-${index + 1}-${cycle}`,
    urlToImage: image,
    publishedAt: publishedDate.toISOString(),
    content,
    category: normCat,
  };
}

/**
 * Assembles the full master catalog of curated items (fixtures + extended curated articles).
 * Ensures all items have fresh, dynamic timestamps anchored to current time.
 */
export function getCuratedMasterCatalog(): NewsApiArticle[] {
  return [...(newsFixtures as NewsApiArticle[]), ...EXTENDED_CURATED_NEWS].map((article, idx) => {
    if (isDateStaleOrHistorical(article.publishedAt)) {
      return {
        ...article,
        publishedAt: getDynamicRecentDate(idx, 8, 20),
      };
    }
    return article;
  });
}

/**
 * Returns a slice of the infinite news feed with support for:
 * - Pagination (page, pageSize)
 * - Category filtering (including synonyms)
 * - Semantic keyword search
 * - Scope: 'preferred' vs 'all' (prioritizing preferred categories first without blocking other news)
 * - Infinite procedural continuation when scrolling past curated items
 */
export function getNewsFeed(options: NewsFeedOptions = {}): NewsFeedResult {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(50, options.pageSize || 10));
  const requestedCat = normalizeCategory(options.category);
  const q = options.q?.trim();
  const scope = options.scope || 'all';
  const prefCategories = (options.preferredCategories || []).map(normalizeCategory).filter(Boolean);

  const curated = getCuratedMasterCatalog();

  // 1. If searching via q, run semantic search over curated catalog first
  if (q) {
    let searchable = curated;
    if (requestedCat !== 'all') {
      searchable = searchable.filter((a) => normalizeCategory(a.category) === requestedCat);
    }
    const filtered = semanticSearchFilter(searchable, q);
    const total = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paged = filtered.slice(startIndex, startIndex + pageSize);
    const mapped = mapNewsArticles(paged, requestedCat === 'all' ? 'general' : requestedCat, true);

    return {
      items: mapped,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      isDemo: true,
    };
  }

  // 2. Base catalog filtered by category if specified
  let baseArticles: NewsApiArticle[] = [];
  if (requestedCat !== 'all') {
    baseArticles = curated.filter((a) => normalizeCategory(a.category) === requestedCat);
  } else {
    baseArticles = [...curated];
  }

  // 3. Apply 'preferred' scope prioritization if requested and user has preferences
  if (scope === 'preferred' && prefCategories.length > 0 && requestedCat === 'all') {
    const preferredItems: NewsApiArticle[] = [];
    const otherItems: NewsApiArticle[] = [];

    baseArticles.forEach((item) => {
      const itemCat = normalizeCategory(item.category);
      if (prefCategories.includes(itemCat)) {
        preferredItems.push(item);
      } else {
        otherItems.push(item);
      }
    });

    baseArticles = [...preferredItems, ...otherItems];
  }

  // 4. Calculate pagination slice
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const resultArticles: NewsApiArticle[] = [];

  // Grab from curated base articles if available within range
  for (let i = startIndex; i < endIndex; i++) {
    if (i < baseArticles.length) {
      const base = baseArticles[i];
      if (isDateStaleOrHistorical(base.publishedAt)) {
        resultArticles.push({
          ...base,
          publishedAt: getDynamicRecentDate(i, 8, 20),
        });
      } else {
        resultArticles.push(base);
      }
    } else {
      // Procedurally generate seamless continuous news for endless scrolling!
      const procIndex = i - baseArticles.length;
      const targetCat =
        requestedCat !== 'all' ? requestedCat : ALL_CATEGORY_KEYS[i % ALL_CATEGORY_KEYS.length];

      resultArticles.push(generateProceduralArticle(targetCat, procIndex));
    }
  }

  // Virtual total of 600 items allows 60-100 pages of continuous smooth infinite scrolling
  const virtualTotal = requestedCat !== 'all' ? 300 : 600;
  const hasMore = page * pageSize < virtualTotal;

  let items = mapNewsArticles(
    resultArticles,
    requestedCat === 'all' ? 'general' : requestedCat,
    true
  );

  // Tag items with isPreferred and breaking status
  items = items.map((item, index) => ({
    ...item,
    isPreferred:
      prefCategories.length > 0 && prefCategories.includes(normalizeCategory(item.category)),
    isBreaking: page === 1 && index < 3,
  }));

  items = deduplicateContentItems(items);

  return {
    items,
    page,
    pageSize,
    total: virtualTotal,
    hasMore,
    isDemo: true,
  };
}

/**
 * Finds a news article by ID across both curated fixtures, extended articles, and procedural generators.
 */
export function findNewsArticleById(id: string): ContentItem | undefined {
  const curated = getCuratedMasterCatalog();
  const mapped = mapNewsArticles(curated, 'general', true);
  const found = mapped.find((item) => item.id === id);
  if (found) return found;

  // Check procedural matches if ID matches format
  return undefined;
}
