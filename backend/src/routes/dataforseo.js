import express from 'express';
import { authenticateToken } from './auth.js';

const router = express.Router();

// DataForSEO API base URL
const DATAFORSEO_API = 'https://api.dataforseo.com/v3';

// Helper to make DataForSEO API requests
async function dataforSeoRequest(endpoint, method = 'GET', body = null) {
  const auth = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString('base64');

  const options = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${DATAFORSEO_API}${endpoint}`, options);
  return response.json();
}

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/dataforseo/serp/google/organic
 * Get Google organic SERP results
 */
router.post('/serp/google/organic', async (req, res) => {
  const { keyword, locationCode = 2158, languageCode = 'zh' } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: 'keyword is required' });
  }

  try {
    const data = await dataforSeoRequest('/serp/google/organic/live/advanced', 'POST', [{
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      device: 'desktop',
      os: 'windows'
    }]);

    res.json({
      results: data.tasks?.[0]?.result || [],
      cost: data.cost,
      source: 'DataForSEO',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DataForSEO SERP error:', error);
    res.status(500).json({ error: 'Failed to fetch SERP data' });
  }
});

/**
 * POST /api/dataforseo/keywords/search-volume
 * Get keyword search volume
 */
router.post('/keywords/search-volume', async (req, res) => {
  const { keywords, locationCode = 2158, languageCode = 'zh' } = req.body;

  if (!keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'keywords array is required' });
  }

  try {
    const data = await dataforSeoRequest('/keywords_data/google_ads/search_volume/live', 'POST', [{
      keywords,
      location_code: locationCode,
      language_code: languageCode
    }]);

    res.json({
      results: data.tasks?.[0]?.result || [],
      cost: data.cost,
      source: 'DataForSEO',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DataForSEO keywords error:', error);
    res.status(500).json({ error: 'Failed to fetch keyword data' });
  }
});

/**
 * POST /api/dataforseo/domain/overview
 * Get domain overview/competitors
 */
router.post('/domain/overview', async (req, res) => {
  const { domain, locationCode = 2158, languageCode = 'zh' } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'domain is required' });
  }

  try {
    const data = await dataforSeoRequest('/dataforseo_labs/google/domain_metrics_by_categories/live', 'POST', [{
      target: domain,
      location_code: locationCode,
      language_code: languageCode
    }]);

    res.json({
      results: data.tasks?.[0]?.result || [],
      cost: data.cost,
      source: 'DataForSEO',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DataForSEO domain error:', error);
    res.status(500).json({ error: 'Failed to fetch domain data' });
  }
});

/**
 * POST /api/dataforseo/competitors
 * Get domain competitors
 */
router.post('/competitors', async (req, res) => {
  const { domain, locationCode = 2158, languageCode = 'zh', limit = 10 } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'domain is required' });
  }

  try {
    const data = await dataforSeoRequest('/dataforseo_labs/google/competitors_domain/live', 'POST', [{
      target: domain,
      location_code: locationCode,
      language_code: languageCode,
      limit
    }]);

    res.json({
      competitors: data.tasks?.[0]?.result?.[0]?.items || [],
      cost: data.cost,
      source: 'DataForSEO',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DataForSEO competitors error:', error);
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

/**
 * POST /api/dataforseo/backlinks
 * Get backlink summary
 */
router.post('/backlinks', async (req, res) => {
  const { target } = req.body;

  if (!target) {
    return res.status(400).json({ error: 'target is required' });
  }

  try {
    const data = await dataforSeoRequest('/backlinks/summary/live', 'POST', [{
      target,
      internal_list_limit: 10,
      backlinks_status_type: 'live'
    }]);

    res.json({
      summary: data.tasks?.[0]?.result?.[0] || {},
      cost: data.cost,
      source: 'DataForSEO',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DataForSEO backlinks error:', error);
    res.status(500).json({ error: 'Failed to fetch backlinks' });
  }
});

/**
 * GET /api/dataforseo/balance
 * Check DataForSEO account balance
 */
router.get('/balance', async (req, res) => {
  try {
    const data = await dataforSeoRequest('/appendix/user_data', 'GET');

    res.json({
      balance: data.tasks?.[0]?.result?.[0]?.money?.balance || 0,
      currency: 'USD',
      source: 'DataForSEO',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DataForSEO balance error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

export default router;
