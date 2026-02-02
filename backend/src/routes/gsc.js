import express from 'express';
import { google } from 'googleapis';
import { authenticateToken, getAuthenticatedClient } from './auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/gsc/sites
 * List all sites in Search Console
 */
router.get('/sites', async (req, res) => {
  try {
    const auth = getAuthenticatedClient(req.user.googleTokens);
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const { data } = await searchconsole.sites.list();
    res.json({
      sites: data.siteEntry || [],
      source: 'GSC',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GSC sites error:', error);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

/**
 * POST /api/gsc/query
 * Query search analytics data
 */
router.post('/query', async (req, res) => {
  const {
    siteUrl,
    startDate,
    endDate,
    dimensions = ['query', 'page'],
    rowLimit = 1000,
    startRow = 0
  } = req.body;

  if (!siteUrl) {
    return res.status(400).json({ error: 'siteUrl is required' });
  }

  try {
    const auth = getAuthenticatedClient(req.user.googleTokens);
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const { data } = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate || getDateNDaysAgo(28),
        endDate: endDate || getDateNDaysAgo(1),
        dimensions,
        rowLimit,
        startRow
      }
    });

    res.json({
      rows: data.rows || [],
      responseAggregationType: data.responseAggregationType,
      source: 'GSC',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GSC query error:', error);
    res.status(500).json({ error: 'Failed to query search analytics' });
  }
});

/**
 * GET /api/gsc/performance/:siteUrl
 * Get performance summary for a site
 */
router.get('/performance/:siteUrl', async (req, res) => {
  const siteUrl = decodeURIComponent(req.params.siteUrl);

  try {
    const auth = getAuthenticatedClient(req.user.googleTokens);
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    // Get last 28 days data
    const { data: currentData } = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: getDateNDaysAgo(28),
        endDate: getDateNDaysAgo(1),
        dimensions: ['date']
      }
    });

    // Get previous 28 days for comparison
    const { data: previousData } = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: getDateNDaysAgo(56),
        endDate: getDateNDaysAgo(29),
        dimensions: ['date']
      }
    });

    const currentMetrics = aggregateMetrics(currentData.rows || []);
    const previousMetrics = aggregateMetrics(previousData.rows || []);

    res.json({
      current: currentMetrics,
      previous: previousMetrics,
      change: calculateChange(currentMetrics, previousMetrics),
      dailyData: currentData.rows || [],
      source: 'GSC',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GSC performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

/**
 * GET /api/gsc/top-queries/:siteUrl
 * Get top performing queries
 */
router.get('/top-queries/:siteUrl', async (req, res) => {
  const siteUrl = decodeURIComponent(req.params.siteUrl);
  const limit = parseInt(req.query.limit) || 50;

  try {
    const auth = getAuthenticatedClient(req.user.googleTokens);
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const { data } = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: getDateNDaysAgo(28),
        endDate: getDateNDaysAgo(1),
        dimensions: ['query'],
        rowLimit: limit
      }
    });

    res.json({
      queries: data.rows || [],
      source: 'GSC',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GSC top queries error:', error);
    res.status(500).json({ error: 'Failed to fetch top queries' });
  }
});

// Helper functions
function getDateNDaysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split('T')[0];
}

function aggregateMetrics(rows) {
  return rows.reduce(
    (acc, row) => ({
      clicks: acc.clicks + (row.clicks || 0),
      impressions: acc.impressions + (row.impressions || 0),
      ctr: 0, // Will calculate after
      position: acc.position + (row.position || 0)
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  );
}

function calculateChange(current, previous) {
  const safeDiv = (a, b) => (b === 0 ? 0 : ((a - b) / b) * 100);
  return {
    clicks: safeDiv(current.clicks, previous.clicks),
    impressions: safeDiv(current.impressions, previous.impressions),
    ctr: safeDiv(current.ctr, previous.ctr),
    position: safeDiv(previous.position, current.position) // Lower is better
  };
}

export default router;
