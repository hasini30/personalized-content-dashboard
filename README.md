# FeedPulse: Personalized Content Dashboard



FeedPulse is an personalized intelligence dashboard that unifies high-frequency live intelligence across **Global News**, **Trending Cinema**, and **Community Social Discussions** into a single, adaptive, and accessible interface.

• [Live app](https://personalized-content-dashboard-3zlf.onrender.com/)

> **Try it:** sign in with `alex@example.com` / `password123`, or create your own account.
> If the app was idle, the first load can take about 30-60 seconds while the server wakes up.



---

## Features

- **Unified Multi-Source Feed:** Combines real-time global news (BBC, The Hindu, TechCrunch, Reuters, The Guardian, GNews, NewsAPI), cinema releases (TMDB), and decentralized social posts (Mastodon) into a standardized stream.

- **AI Article Summarizer:** Generates concise bullet-point takeaways and executive summaries on demand using LLMs.

- **11-Language Multilingual Engine:** Supports on-the-fly translation for articles and UI across English and 10 Indian languages (Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, and Urdu).

- **Distraction-Free Reader Mode:** Removes web clutter, ads, and pop-ups for a cleaner reading experience.

- **Customizable Workspace:** Supports drag-and-drop card reordering, topic filtering, multi-criteria sorting, and bookmarking/saving articles.

- **Live SSE Updates:** Streams incoming articles and alerts to the dashboard without requiring a full-page reload.

- **Zero-Config Resiliency:** The application can run without API keys using built-in mock fallbacks and sample datasets.

---
### Why I Built It

- **Information Overload & Tab Fatigue:** The modern internet forces people to switch between multiple tabs for news, social media, movie information, and translation tools, which can make information consumption fragmented and tiring.

- **Cluttered, Ad-Heavy Web:** Many news websites contain ads, trackers, cookie prompts, and pop-ups that can make reading distracting.

- **Language Barriers:** A lot of international and technical content is available primarily in English, making it less accessible to users who prefer regional languages.

- **Siloed Content Formats:** News, social media posts, and entertainment content are available across different platforms with different formats and interfaces.

- **The Goal:** Build a simple, distraction-free dashboard that brings content from different sources into one place, personalizes discovery, supports multiple languages, and uses AI to help users consume information faster.
---



## How It Works
```
┌────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA SOURCES                           │
│  [RSS Feeds]   [GNews / NewsAPI]   [TMDB]   [Mastodon API]             │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    INGESTION & NORMALIZATION                           │
│  • RSS / REST fetchers                                                 │
│  • Deduplication                                                       │
│  • Common ContentItem schema                                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
            ┌────────────────────────┼────────────────────────┐
            ▼                        ▼                        ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐
│   STORAGE LAYER      │  │   AI & TRANSLATION   │  │  REAL-TIME STREAM  │
│ • SQLite             │  │ • OpenRouter LLM     │  │ • Server-Sent      │
│ • WAL Mode           │  │ • 11 Languages       │  │   Events (SSE)     │
│ • Bookmarks & Auth   │  │ • Translation Cache  │  │ • Live Updates     │
└──────────┬───────────┘  └──────────┬───────────┘  └──────────┬─────────┘
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND PRESENTATION                            │
│  • Next.js + React                                                     │
│  • Redux Toolkit                                                       │
│  • Drag-and-drop feed reordering                                       │
│  • Reader mode & responsive UI                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Ingestion & Normalization

The application periodically fetches content from RSS feeds, GNews, NewsAPI, TMDB, and Mastodon. The different response formats are cleaned, deduplicated, and converted into a common `ContentItem` format.

### Storage

SQLite stores user data such as bookmarks, layout preferences, authentication data, and cached translations. WAL mode is enabled for better database performance.

### AI Summarization & Translation

When requested, article content is sent to an LLM through OpenRouter to generate summaries or translate content into the selected language. Translations are cached to avoid unnecessary repeated API calls.

### Real-Time Updates

The `/api/stream` endpoint uses Server-Sent Events (SSE) to send newly available content and alerts to connected clients without requiring a page refresh.

### Frontend & State Management

The frontend is built with Next.js and React. Redux Toolkit manages filters, search, language selection, and bookmarks. Users can also rearrange feed cards using drag-and-drop.

---
### 🛠️ Tech Used

| Category | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **State Management** | Redux Toolkit |
| **Styling & UI** | Tailwind CSS, Lucide React, @dnd-kit |
| **Backend & Data Ingestion** | Next.js Route Handlers, fast-xml-parser, Server-Sent Events (SSE) |
| **Database & Caching** | Node.js 22 Native SQLite (`node:sqlite`), WAL mode |
| **Authentication** | NextAuth.js v4, Credentials Provider, JWT, bcrypt |
| **AI & NLP** | OpenRouter API, Gemini 2.5 Flash, custom multilingual translation |
| **Testing & Code Quality** | Jest, React Testing Library, ESLint |
| **Deployment** | Docker, Docker Compose, Render |

## How to Run It

### Option A: Use the Live App

No installation required. Open the deployed application:

[Live app](https://personalized-content-dashboard-3zlf.onrender.com/)

### Option B: Run Locally

**Prerequisites:** Node.js v22.12.0 or higher and npm.

```bash
# 1. Clone the repository
git clone https://github.com/hasini30/personalized-content-dashboard.git
cd personalized-content-dashboard

# 2. Install dependencies
npm install

# 3. Create environment configuration
cp .env.example .env.local

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option C: Run with Docker

```bash
docker compose up --build -d
```

---

## 🚢 Deployment

The app is deployed on **Render** with persistent disk storage for SQLite:

- **Live App:** [personalized-content-dashboard-3zlf.onrender.com](https://personalized-content-dashboard-3zlf.onrender.com/)
- **1-Click Deploy:** Deploy your own instance using the included `render.yaml`:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/hasini30/personalized-content-dashboard)

---

## ⚠️ Limitations & Considerations

- **Single-Node SQLite Architecture:** Uses Node 22's native `node:sqlite` in WAL (Write-Ahead Logging) mode. It is ultra-fast, zero-maintenance, and requires no external database server for single-instance container deployments. Horizontal multi-instance autoscaling behind a load balancer would require a shared network disk or migrating to a distributed database (e.g., PostgreSQL or Turso / LibSQL).
- **Free-Tier Cold Starts:** On Render's free tier, inactive web services spin down after 15 minutes of idle time. The initial incoming request can take 30 to 50 seconds while the container wakes up.
- **Third-Party API Rate Limits:** Free developer tiers for external providers have daily request quotas (e.g., GNews allows 100 requests/day, NewsAPI allows 100 requests/day). If quotas are exceeded, FeedPulse automatically falls back to built-in sample data to ensure uninterrupted service.
- **In-Memory Rate Limiting & Summarizer Cache:** The IP rate limiter (60 requests/minute per client) and temporary memory cache reside in process memory and reset when the server restarts.
- **AI Latency & Token Usage:** Generating 3-point AI summaries and translating full articles requires round-trip LLM inference via OpenRouter (~1–2 seconds per article). Cached translations in SQLite prevent redundant API calls for previously translated articles.
- **Pre-Seeded Demo Accounts:** Pre-seeded demo credentials (`alex@example.com`, etc.) are provided for instant evaluation and testing. For a production deployment, replace or disable them.

---

