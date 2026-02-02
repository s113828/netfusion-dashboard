/**
 * NetFusion API Client
 * 前端 API 連接模組
 */

const API_BASE = 'http://localhost:3001/api';

class NetFusionAPI {
  constructor() {
    this.token = localStorage.getItem('nf_token');
  }

  // ==================== Auth ====================

  /**
   * 開始 Google OAuth 流程
   */
  loginWithGoogle() {
    window.location.href = `${API_BASE}/auth/google`;
  }

  /**
   * 處理 OAuth 回調
   */
  handleAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      this.token = token;
      localStorage.setItem('nf_token', token);
      window.history.replaceState({}, '', window.location.pathname);
      return true;
    }
    return false;
  }

  /**
   * 檢查是否已登入
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * 登出
   */
  logout() {
    this.token = null;
    localStorage.removeItem('nf_token');
    window.location.href = '/login.html';
  }

  /**
   * 取得當前用戶資訊
   */
  async getCurrentUser() {
    return this._request('/auth/me');
  }

  // ==================== GSC ====================

  /**
   * 取得所有 GSC 網站
   */
  async getGSCSites() {
    return this._request('/gsc/sites');
  }

  /**
   * 查詢 GSC 搜尋分析
   */
  async queryGSC(siteUrl, options = {}) {
    return this._request('/gsc/query', 'POST', {
      siteUrl,
      ...options
    });
  }

  /**
   * 取得網站效能摘要
   */
  async getGSCPerformance(siteUrl) {
    return this._request(`/gsc/performance/${encodeURIComponent(siteUrl)}`);
  }

  /**
   * 取得熱門查詢
   */
  async getTopQueries(siteUrl, limit = 50) {
    return this._request(`/gsc/top-queries/${encodeURIComponent(siteUrl)}?limit=${limit}`);
  }

  // ==================== GA4 ====================

  /**
   * 執行 GA4 報表
   */
  async runGA4Report(propertyId, options = {}) {
    return this._request('/ga4/report', 'POST', {
      propertyId,
      ...options
    });
  }

  /**
   * 取得 GA4 概覽
   */
  async getGA4Overview(propertyId) {
    return this._request(`/ga4/overview/${propertyId}`);
  }

  /**
   * 取得流量來源
   */
  async getTrafficSources(propertyId) {
    return this._request(`/ga4/traffic-sources/${propertyId}`);
  }

  // ==================== DataForSEO ====================

  /**
   * 取得 SERP 結果
   */
  async getSERP(keyword, options = {}) {
    return this._request('/dataforseo/serp/google/organic', 'POST', {
      keyword,
      ...options
    });
  }

  /**
   * 取得關鍵字搜尋量
   */
  async getKeywordVolume(keywords, options = {}) {
    return this._request('/dataforseo/keywords/search-volume', 'POST', {
      keywords,
      ...options
    });
  }

  /**
   * 取得競爭對手
   */
  async getCompetitors(domain, options = {}) {
    return this._request('/dataforseo/competitors', 'POST', {
      domain,
      ...options
    });
  }

  /**
   * 取得反向連結
   */
  async getBacklinks(target) {
    return this._request('/dataforseo/backlinks', 'POST', { target });
  }

  // ==================== Dashboard ====================

  /**
   * 取得儀表板摘要
   */
  async getDashboardSummary() {
    return this._request('/dashboard/summary');
  }

  /**
   * 取得建議列表
   */
  async getRecommendations(filters = {}) {
    const params = new URLSearchParams(filters);
    return this._request(`/dashboard/recommendations?${params}`);
  }

  /**
   * 更新建議狀態
   */
  async updateRecommendation(id, data) {
    return this._request(`/dashboard/recommendations/${id}`, 'PATCH', data);
  }

  /**
   * 取得報告列表
   */
  async getReports(period = 'daily', limit = 7) {
    return this._request(`/dashboard/reports?period=${period}&limit=${limit}`);
  }

  /**
   * 取得同步狀態
   */
  async getSyncStatus() {
    return this._request('/dashboard/sync-status');
  }

  // ==================== Internal ====================

  async _request(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.error?.message || 'Request failed', response.status, data.error?.code);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(error.message, 0, 'NETWORK_ERROR');
    }
  }
}

class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'APIError';
  }
}

// Export singleton instance
const api = new NetFusionAPI();

// Check for auth callback on page load
if (window.location.search.includes('token=')) {
  api.handleAuthCallback();
}
