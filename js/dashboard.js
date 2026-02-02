/**
 * NetFusion Dashboard UI
 * 儀表板前端邏輯
 */

class Dashboard {
  constructor() {
    this.charts = {};
    this.init();
  }

  async init() {
    // Check authentication
    if (!api.isAuthenticated()) {
      this.showLoginPrompt();
      return;
    }

    try {
      await this.loadDashboard();
    } catch (error) {
      console.error('Dashboard init error:', error);
      if (error.status === 401 || error.status === 403) {
        api.logout();
      }
    }
  }

  showLoginPrompt() {
    const container = document.getElementById('dashboard-content');
    if (container) {
      container.innerHTML = `
        <div class="login-prompt">
          <div class="prompt-card">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <h2>請先登入</h2>
            <p>連結您的 Google 帳號以存取 GSC 和 GA4 數據</p>
            <button class="btn-primary btn-large" onclick="api.loginWithGoogle()">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              </svg>
              使用 Google 登入
            </button>
          </div>
        </div>
      `;
    }
  }

  async loadDashboard() {
    this.showLoading();

    // Load all data in parallel
    const [summary, syncStatus, recommendations] = await Promise.all([
      api.getDashboardSummary(),
      api.getSyncStatus(),
      api.getRecommendations()
    ]);

    this.renderOverview(summary.overview);
    this.renderTrends(summary.trends);
    this.renderSyncStatus(syncStatus);
    this.renderRecommendations(recommendations.recommendations);
    this.renderTopQueries(summary.topQueries);

    this.hideLoading();
  }

  showLoading() {
    const loader = document.getElementById('dashboard-loader');
    if (loader) loader.style.display = 'flex';
  }

  hideLoading() {
    const loader = document.getElementById('dashboard-loader');
    if (loader) loader.style.display = 'none';
  }

  renderOverview(overview) {
    const container = document.getElementById('overview-metrics');
    if (!container) return;

    container.innerHTML = `
      <div class="metric-card">
        <div class="metric-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">${this.formatNumber(overview.totalQueries)}</span>
          <span class="metric-label">總查詢數</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon clicks">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">${this.formatNumber(overview.totalClicks)}</span>
          <span class="metric-label">總點擊數</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon position">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">${overview.avgPosition.toFixed(1)}</span>
          <span class="metric-label">平均排名</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon ctr">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">${overview.avgCTR.toFixed(1)}%</span>
          <span class="metric-label">平均 CTR</span>
        </div>
      </div>
    `;
  }

  renderTrends(trends) {
    const container = document.getElementById('trends-grid');
    if (!container) return;

    const trendItems = [
      { key: 'clicks', label: '點擊數', icon: 'click' },
      { key: 'impressions', label: '曝光數', icon: 'eye' },
      { key: 'ctr', label: 'CTR', icon: 'percent', suffix: '%' },
      { key: 'position', label: '排名', icon: 'trend', inverse: true }
    ];

    container.innerHTML = trendItems.map(item => {
      const trend = trends[item.key];
      const changeClass = item.inverse
        ? (trend.change > 0 ? 'negative' : 'positive')
        : (trend.change > 0 ? 'positive' : 'negative');

      return `
        <div class="trend-card">
          <div class="trend-header">
            <span class="trend-label">${item.label}</span>
            <span class="trend-change ${changeClass}">
              ${trend.change > 0 ? '↑' : '↓'} ${Math.abs(trend.change).toFixed(1)}%
            </span>
          </div>
          <div class="trend-value">
            ${this.formatNumber(trend.value)}${item.suffix || ''}
          </div>
          <div class="trend-bar">
            <div class="trend-fill ${changeClass}" style="width: ${Math.min(Math.abs(trend.change) * 5, 100)}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSyncStatus(status) {
    const container = document.getElementById('sync-status');
    if (!container) return;

    container.innerHTML = `
      <div class="sync-header">
        <h3>資料來源狀態</h3>
        <span class="sync-overall ${status.overallStatus}">${status.overallStatus === 'healthy' ? '正常' : '異常'}</span>
      </div>
      <div class="sync-sources">
        ${status.sources.map(source => `
          <div class="sync-source">
            <div class="source-indicator ${source.status}"></div>
            <div class="source-info">
              <span class="source-name">${source.name}</span>
              <span class="source-time">上次同步: ${this.formatTime(source.lastSync)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderRecommendations(recommendations) {
    const container = document.getElementById('recommendations-list');
    if (!container) return;

    if (!recommendations.length) {
      container.innerHTML = '<p class="no-data">目前沒有建議</p>';
      return;
    }

    container.innerHTML = recommendations.map(rec => `
      <div class="recommendation-card ${rec.type}" data-id="${rec.id}">
        <div class="rec-header">
          <span class="rec-type ${rec.type}">${this.getTypeLabel(rec.type)}</span>
          <span class="rec-priority ${rec.priority}">${this.getPriorityLabel(rec.priority)}</span>
        </div>
        <h4 class="rec-title">${rec.title}</h4>
        <p class="rec-description">${rec.description}</p>
        <div class="rec-meta">
          <span class="rec-source">${rec.source}</span>
          <span class="rec-time">${this.formatTime(rec.createdAt)}</span>
        </div>
        <div class="rec-actions">
          <button class="btn-small btn-primary" onclick="dashboard.markComplete('${rec.id}')">標記完成</button>
          <button class="btn-small btn-ghost" onclick="dashboard.dismissRec('${rec.id}')">忽略</button>
        </div>
      </div>
    `).join('');
  }

  renderTopQueries(queries) {
    const container = document.getElementById('top-queries');
    if (!container) return;

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>查詢關鍵字</th>
            <th>點擊</th>
            <th>曝光</th>
            <th>排名</th>
          </tr>
        </thead>
        <tbody>
          ${queries.map(q => `
            <tr>
              <td class="query-cell">${q.query}</td>
              <td>${this.formatNumber(q.clicks)}</td>
              <td>${this.formatNumber(q.impressions)}</td>
              <td>${q.position.toFixed(1)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async markComplete(id) {
    try {
      await api.updateRecommendation(id, { status: 'completed' });
      this.loadDashboard();
    } catch (error) {
      console.error('Failed to update recommendation:', error);
    }
  }

  async dismissRec(id) {
    try {
      await api.updateRecommendation(id, { status: 'dismissed' });
      this.loadDashboard();
    } catch (error) {
      console.error('Failed to dismiss recommendation:', error);
    }
  }

  // Utility functions
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '剛才';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分鐘前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小時前';
    return Math.floor(diff / 86400000) + ' 天前';
  }

  getTypeLabel(type) {
    const labels = {
      actionable: '可行動',
      watch: '觀察中',
      risk: '風險'
    };
    return labels[type] || type;
  }

  getPriorityLabel(priority) {
    const labels = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return labels[priority] || priority;
  }
}

// Initialize dashboard when DOM is ready
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new Dashboard();
});
