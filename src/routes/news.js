import express from "express";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

// You'll need to add NEWS_API_KEY to your .env file
// Get free API key from https://newsapi.org/
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";

/* ============================================================
   IN-MEMORY CACHE
   Keyed by normalized city name (or "__global__" for generic).
   Each entry: { articles: [], timestamp: Date.now() }
   TTL: 15 minutes — avoids hammering NewsAPI free tier (100 req/day).
   ============================================================ */
const newsCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

function getCached(key) {
  const entry = newsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    newsCache.delete(key);
    return null;
  }
  return entry.articles;
}

function setCache(key, articles) {
  // Cap cache size to prevent memory leaks on Render free tier
  if (newsCache.size > 50) {
    const oldest = newsCache.keys().next().value;
    newsCache.delete(oldest);
  }
  newsCache.set(key, { articles, timestamp: Date.now() });
}

/* ============================================================
   SAFETY-FOCUSED KEYWORDS
   Used when a city is provided to ensure results are relevant
   to a neighborhood safety app, not general entertainment.
   ============================================================ */
const SAFETY_KEYWORDS = "(safety OR crime OR police OR emergency OR weather OR accident OR fire OR civic OR security)";

/* ============================================================
   FORMAT ARTICLES — shared helper
   ============================================================ */
function formatArticles(rawArticles) {
  return (rawArticles || [])
    .filter(a => a.title && a.title !== "[Removed]") // NewsAPI returns removed articles
    .map(article => ({
      title: article.title,
      description: article.description || "No description available",
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source?.name || "Unknown Source",
    }));
}

/* ============================================================
   GET NEWS FEED
   GET /api/news
   GET /api/news?city=Mumbai
   
   When ?city is provided: fetches local safety-relevant news.
   When no city: falls back to generic global safety news.
   ============================================================ */
router.get("/", catchAsync(async (req, res) => {
  if (!NEWS_API_KEY) {
    return res.status(500).json({ 
      message: "News API key not configured",
      articles: []
    });
  }

  const city = (req.query.city || "").trim();
  const cacheKey = city ? city.toLowerCase() : "__global__";

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ articles: cached, cached: true, city: city || null });
  }

  try {
    let query;
    if (city) {
      // Location-aware query with safety keywords
      query = `${city} AND ${SAFETY_KEYWORDS}`;
    } else {
      // Fallback: highly curated global safety and disaster news
      query = '("public safety" OR crime OR disaster OR emergency OR security OR police OR earthquake OR flood OR wildfire OR terrorism)';
    }

    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=15&language=en&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("NewsAPI error:", response.status, errBody);
      throw new Error("Failed to fetch news");
    }

    const data = await response.json();
    const articles = formatArticles(data.articles).slice(0, 15);

    // Cache the result
    setCache(cacheKey, articles);

    res.json({ articles, cached: false, city: city || null });
  } catch (error) {
    console.error("News fetch error:", error);
    res.status(500).json({ 
      message: "Failed to fetch news",
      articles: []
    });
  }
}));

/* ============================================================
   GET LOCAL NEWS (by location) — legacy endpoint, kept for 
   backward compatibility
   GET /api/news/local?q=location
   ============================================================ */
router.get("/local", catchAsync(async (req, res) => {
  const { q } = req.query;

  if (!NEWS_API_KEY) {
    return res.status(500).json({ 
      message: "News API key not configured",
      articles: []
    });
  }

  if (!q) {
    return res.status(400).json({ message: "Location query required" });
  }

  const cacheKey = `local_${q.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ articles: cached, cached: true });
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=8&language=en&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch local news");
    }

    const data = await response.json();
    const articles = formatArticles(data.articles).slice(0, 5);

    setCache(cacheKey, articles);

    res.json({ articles, cached: false });
  } catch (error) {
    console.error("Local news fetch error:", error);
    res.status(500).json({ 
      message: "Failed to fetch local news",
      articles: []
    });
  }
}));

export default router;
