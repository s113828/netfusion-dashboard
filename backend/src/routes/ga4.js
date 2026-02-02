import express from 'express';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { authenticateToken, getAuthenticatedClient } from './auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/ga4/properties
 * List GA4 properties (requires Admin API access)
 */
router.get('/properties', async (req, res) => {
  try {
    // Note: This requires Google Analytics Admin API
    // For now, return a placeholder
    res.json({
      message: 'Please provide your GA4 Property ID in the request',
      hint: 'Property ID format: properties/123456789',
      source: 'GA4',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GA4 properties error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

/**
 * POST /api/ga4/report
 * Run a GA4 report
 */
router.post('/report', async (req, res) => {
  const {
    propertyId,
    startDate = '28daysAgo',
    endDate = 'yesterday',
    metrics = ['sessions', 'activeUsers', 'screenPageViews'],
    dimensions = ['date']
  } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }

  try {
    const auth = getAuthenticatedClient(req.user.googleTokens);

    // Create Analytics Data client with credentials
    const analyticsDataClient = new BetaAnalyticsDataClient({
      authClient: auth
    });

    const [response] = await analyticsDataClient.runReport({
      property: propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: metrics.map(m => ({ name: m })),
      dimensions: dimensions.map(d => ({ name: d }))
    });

    res.json({
      dimensionHeaders: response.dimensionHeaders,
      metricHeaders: response.metricHeaders,
      rows: response.rows?.map(row => ({
        dimensions: row.dimensionValues?.map(d => d.value),
        metrics: row.metricValues?.map(m => m.value)
      })) || [],
      rowCount: response.rowCount,
      source: 'GA4',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GA4 report error:', error);
    res.status(500).json({ error: 'Failed to run GA4 report', details: error.message });
  }
});

/**
 * GET /api/ga4/overview/:propertyId
 * Get GA4 overview metrics
 */
router.get('/overview/:propertyId', async (req, res) => {
  const propertyId = req.params.propertyId;

  try {
    const auth = getAuthenticatedClient(req.user.googleTokens);

    const analyticsDataClient = new BetaAnalyticsDataClient({
      authClient: auth
    });

    const property = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;

    // Current period (last 28 days)
    const [currentResponse] = await analyticsDataClient.runReport({
      property,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' }
      ]
    });

    // Previous period (28-56 days ago)
    const [previousResponse] = await analyticsDataClient.runReport({
      property,
      dateRanges: [{ startDate: '56daysAgo', endDate: '29daysAgo' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' }
      ]
    });

    const current = parseMetrics(currentResponse);
    const previous = parseMetrics(previousResponse);

    res.json({
      current,
      previous,
      change: calculateChange(current, previous),
      source: 'GA4',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GA4 overview error:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 overview', details: error.message });
  }
});

/**
 * GET /api/ga4/traffic-sources/:propertyId
 * Get traffic sources breakdown
 */
router.get('/traffic-sources/:propertyId', async (req, res) => {
  const propertyId = req.params.propertyId;

  try {
    const auth = getAuthenticatedClient(req.user.googleTokens);

    const analyticsDataClient = new BetaAnalyticsDataClient({
      authClient: auth
    });

    const property = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;

    const [response] = await analyticsDataClient.runReport({
      property,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'conversions' }
      ],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10
    });

    res.json({
      sources: response.rows?.map(row => ({
        channel: row.dimensionValues?.[0]?.value,
        sessions: parseInt(row.metricValues?.[0]?.value || 0),
        users: parseInt(row.metricValues?.[1]?.value || 0),
        conversions: parseInt(row.metricValues?.[2]?.value || 0)
      })) || [],
      source: 'GA4',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GA4 traffic sources error:', error);
    res.status(500).json({ error: 'Failed to fetch traffic sources', details: error.message });
  }
});

// Helper functions
function parseMetrics(response) {
  const row = response.rows?.[0];
  if (!row) return {};

  return {
    sessions: parseInt(row.metricValues?.[0]?.value || 0),
    activeUsers: parseInt(row.metricValues?.[1]?.value || 0),
    pageViews: parseInt(row.metricValues?.[2]?.value || 0),
    avgSessionDuration: parseFloat(row.metricValues?.[3]?.value || 0),
    bounceRate: parseFloat(row.metricValues?.[4]?.value || 0),
    conversions: parseInt(row.metricValues?.[5]?.value || 0)
  };
}

function calculateChange(current, previous) {
  const safeDiv = (a, b) => (b === 0 ? 0 : ((a - b) / b) * 100);
  return Object.keys(current).reduce((acc, key) => {
    acc[key] = safeDiv(current[key], previous[key]);
    return acc;
  }, {});
}

export default router;
