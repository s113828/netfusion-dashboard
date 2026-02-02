/**
 * Supabase Client Configuration
 * NetFusion SEO Automation Platform
 */

// Supabase Configuration
const SUPABASE_URL = 'https://jbghzyrnatowczzhklrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiZ2h6eXJuYXRvd2N6emhrbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDcyMDIsImV4cCI6MjA4NTU4MzIwMn0.vtRTvUZqKzDSn1GUh_eVjoJf2_aYCbxDHte6xcPhR2Y';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Auth Helper Functions
 */
const auth = {
  // Sign in with Google OAuth
  async signInWithGoogle() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly',
        redirectTo: window.location.origin + '/app.html'
      }
    });
    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = '/index.html';
  },

  // Get current user
  async getUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  // Get session (includes access token for Google APIs)
  async getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
  },

  // Listen for auth changes
  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};

/**
 * Database Helper Functions
 */
const db = {
  // Save user's connected sites (GSC properties)
  async saveSites(sites) {
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabaseClient
      .from('user_sites')
      .upsert(
        sites.map(site => ({
          user_id: user.id,
          site_url: site.siteUrl,
          permission_level: site.permissionLevel
        })),
        { onConflict: 'user_id,site_url' }
      );

    if (error) throw error;
    return data;
  },

  // Get user's saved sites
  async getSites() {
    const user = await auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
      .from('user_sites')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return data;
  },

  // Save SEO metrics snapshot
  async saveMetrics(siteUrl, metrics) {
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabaseClient
      .from('seo_metrics')
      .insert({
        user_id: user.id,
        site_url: siteUrl,
        clicks: metrics.clicks,
        impressions: metrics.impressions,
        ctr: metrics.ctr,
        position: metrics.position,
        date: new Date().toISOString().split('T')[0]
      });

    if (error) throw error;
    return data;
  },

  // Get historical metrics
  async getMetricsHistory(siteUrl, days = 30) {
    const user = await auth.getUser();
    if (!user) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseClient
      .from('seo_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('site_url', siteUrl)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Save AI recommendations
  async saveRecommendations(siteUrl, recommendations) {
    const user = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabaseClient
      .from('recommendations')
      .insert(
        recommendations.map(rec => ({
          user_id: user.id,
          site_url: siteUrl,
          type: rec.type,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          status: 'pending'
        }))
      );

    if (error) throw error;
    return data;
  },

  // Get pending recommendations
  async getRecommendations(siteUrl) {
    const user = await auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
      .from('recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('site_url', siteUrl)
      .eq('status', 'pending')
      .order('priority', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Update recommendation status
  async updateRecommendationStatus(id, status) {
    const { data, error } = await supabaseClient
      .from('recommendations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return data;
  }
};

/**
 * Google API Helper (using Supabase session token)
 */
const googleApi = {
  // Get Google Search Console data
  async getSearchAnalytics(siteUrl, options = {}) {
    const session = await auth.getSession();
    if (!session?.provider_token) {
      throw new Error('No Google access token available');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (options.days || 28));

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.provider_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: options.dimensions || ['query'],
          rowLimit: options.limit || 100
        })
      }
    );

    if (!response.ok) {
      throw new Error(`GSC API error: ${response.status}`);
    }

    return response.json();
  },

  // Get list of GSC sites
  async getSitesList() {
    const session = await auth.getSession();
    if (!session?.provider_token) {
      throw new Error('No Google access token available');
    }

    const response = await fetch(
      'https://www.googleapis.com/webmasters/v3/sites',
      {
        headers: {
          'Authorization': `Bearer ${session.provider_token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GSC API error: ${response.status}`);
    }

    return response.json();
  }
};

// Export for use in other scripts
window.NetFusion = {
  supabase: supabaseClient,
  auth,
  db,
  googleApi
};

console.log('🚀 NetFusion Supabase client initialized');
