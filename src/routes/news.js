import express from "express";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

// You'll need to add NEWS_API_KEY to your .env file
// Get free API key from https://newsapi.org/
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";

/* ============================================================
   GET NEWS FEED
   GET /api/news
   ============================================================ */
router.get("/", catchAsync(async (req, res) => {
  if (!NEWS_API_KEY) {
    return res.status(500).json({ 
      message: "News API key not configured",
      articles: []
    });
  }

  try {
    // Fetch top headlines from NewsAPI
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&category=general&pageSize=10&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch news");
    }

    const data = await response.json();

    // Format articles
    const articles = (data.articles || []).map(article => ({
      title: article.title,
      description: article.description || "No description available",
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source?.name || "Unknown Source",
    }));

    res.json({ articles });
  } catch (error) {
    console.error("News fetch error:", error);
    res.status(500).json({ 
      message: "Failed to fetch news",
      articles: []
    });
  }
}));

/* ============================================================
   GET LOCAL NEWS (by location)
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

  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch local news");
    }

    const data = await response.json();

    const articles = (data.articles || []).map(article => ({
      title: article.title,
      description: article.description || "No description available",
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source?.name || "Unknown Source",
    }));

    res.json({ articles });
  } catch (error) {
    console.error("Local news fetch error:", error);
    res.status(500).json({ 
      message: "Failed to fetch local news",
      articles: []
    });
  }
}));

export default router;
