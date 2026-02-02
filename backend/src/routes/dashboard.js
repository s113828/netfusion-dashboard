import express from 'express';
import { authenticateToken } from './auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/dashboard/summary
 * Get aggregated dashboard summary
 */
router.get('/summary', async (req, res) => {
  try {
    // In production, this would fetch from all data sources
    // For now, return mock data structure
    res.json({
      overview: {
        totalQueries: 2847,
        totalClicks: 12450,
        avgPosition: 8.3,
        avgCTR: 4.2
      },
      trends: {
        clicks: { value: 12450, change: 12.5 },
        impressions: { value: 285000, change: 8.2 },
        ctr: { value: 4.2, change: -0.3 },
        position: { value: 8.3, change: 1.2 }
      },
      topQueries: [
        { query: 'SEO 工具', clicks: 450, impressions: 8500, position: 3.2 },
        { query: 'SEO 自動化', clicks: 320, impressions: 6200, position: 4.5 },
        { query: '關鍵字分析', clicks: 280, impressions: 5800, position: 5.1 }
      ],
      recommendations: [
        {
          id: 'rec-001',
          type: 'actionable',
          priority: 'high',
          title: '優化 "SEO 工具" 頁面標題',
          description: '此頁面排名穩定在前5，但CTR低於平均。建議優化標題以提升點擊率。',
          trigger: 'position < 5 AND ctr < avg_ctr',
          source: 'GSC',
          createdAt: new Date().toISOString()
        },
        {
          id: 'rec-002',
          type: 'watch',
          priority: 'medium',
          title: '監控競爭對手排名變化',
          description: '競爭對手 example.com 在目標關鍵字上排名上升。',
          trigger: 'competitor_position_change > 3',
          source: 'DataForSEO',
          createdAt: new Date().toISOString()
        },
        {
          id: 'rec-003',
          type: 'risk',
          priority: 'low',
          title: '頁面索引問題',
          description: '3 個頁面在過去 7 天內被移出索引。',
          trigger: 'indexed_pages_dropped > 0',
          source: 'GSC',
          createdAt: new Date().toISOString()
        }
      ],
      lastSync: new Date().toISOString(),
      source: 'aggregated'
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

/**
 * GET /api/dashboard/recommendations
 * Get all recommendations with filtering
 */
router.get('/recommendations', async (req, res) => {
  const { type, priority, status } = req.query;

  try {
    // Mock recommendations data
    let recommendations = [
      {
        id: 'rec-001',
        type: 'actionable',
        priority: 'high',
        status: 'pending',
        title: '優化 "SEO 工具" 頁面標題',
        description: '此頁面排名穩定在前5，但CTR低於平均。建議優化標題以提升點擊率。',
        trigger: {
          condition: 'position < 5 AND ctr < avg_ctr',
          currentValue: { position: 3.2, ctr: 2.1 },
          threshold: { avgCtr: 4.2 }
        },
        source: 'GSC',
        affectedPages: ['https://example.com/seo-tools'],
        potentialImpact: '+15% CTR',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'rec-002',
        type: 'watch',
        priority: 'medium',
        status: 'pending',
        title: '監控競爭對手排名變化',
        description: '競爭對手 competitor.com 在 "SEO 自動化" 關鍵字上從第 8 名上升至第 3 名。',
        trigger: {
          condition: 'competitor_position_change > 3',
          currentValue: { oldPosition: 8, newPosition: 3 },
          competitor: 'competitor.com'
        },
        source: 'DataForSEO',
        affectedQueries: ['SEO 自動化', 'SEO 工具推薦'],
        createdAt: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: 'rec-003',
        type: 'risk',
        priority: 'high',
        status: 'pending',
        title: '重要頁面流量下降',
        description: '/pricing 頁面流量在過去 7 天下降 25%。',
        trigger: {
          condition: 'traffic_change < -20%',
          currentValue: { change: -25 },
          threshold: -20
        },
        source: 'GA4',
        affectedPages: ['https://example.com/pricing'],
        createdAt: new Date(Date.now() - 43200000).toISOString()
      }
    ];

    // Apply filters
    if (type) {
      recommendations = recommendations.filter(r => r.type === type);
    }
    if (priority) {
      recommendations = recommendations.filter(r => r.priority === priority);
    }
    if (status) {
      recommendations = recommendations.filter(r => r.status === status);
    }

    res.json({
      recommendations,
      total: recommendations.length,
      filters: { type, priority, status },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * PATCH /api/dashboard/recommendations/:id
 * Update recommendation status
 */
router.patch('/recommendations/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  try {
    // In production, this would update the database
    res.json({
      id,
      status,
      notes,
      updatedAt: new Date().toISOString(),
      message: 'Recommendation updated successfully'
    });
  } catch (error) {
    console.error('Update recommendation error:', error);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});

/**
 * GET /api/dashboard/reports
 * Get daily/weekly reports
 */
router.get('/reports', async (req, res) => {
  const { period = 'daily', limit = 7 } = req.query;

  try {
    // Mock reports data
    const reports = Array.from({ length: parseInt(limit) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);

      return {
        id: `report-${date.toISOString().split('T')[0]}`,
        date: date.toISOString().split('T')[0],
        period,
        summary: {
          totalRecommendations: Math.floor(Math.random() * 10) + 5,
          actionable: Math.floor(Math.random() * 5) + 1,
          completed: Math.floor(Math.random() * 3),
          topChange: {
            metric: 'clicks',
            value: (Math.random() * 20 - 10).toFixed(1)
          }
        },
        status: i === 0 ? 'current' : 'archived'
      };
    });

    res.json({
      reports,
      period,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * GET /api/dashboard/sync-status
 * Get data sync status
 */
router.get('/sync-status', async (req, res) => {
  try {
    res.json({
      sources: [
        {
          name: 'Google Search Console',
          code: 'GSC',
          status: 'connected',
          lastSync: new Date(Date.now() - 3600000).toISOString(),
          nextSync: new Date(Date.now() + 82800000).toISOString()
        },
        {
          name: 'Google Analytics 4',
          code: 'GA4',
          status: 'connected',
          lastSync: new Date(Date.now() - 3600000).toISOString(),
          nextSync: new Date(Date.now() + 82800000).toISOString()
        },
        {
          name: 'DataForSEO',
          code: 'DFSO',
          status: 'connected',
          lastSync: new Date(Date.now() - 7200000).toISOString(),
          nextSync: new Date(Date.now() + 79200000).toISOString()
        }
      ],
      overallStatus: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

export default router;
