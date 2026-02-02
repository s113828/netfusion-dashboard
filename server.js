require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const supabase = require('./supabaseClient');
const { LRUCache } = require('lru-cache');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware & Security
app.use(helmet({
    contentSecurityPolicy: false, // For easier local development with external scripts/fonts
}));
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.set('trust proxy', 1); // Trust first proxy (Cloud Run Load Balancer)

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "請求次數過多，請稍後再試。"
});
app.use('/api/', apiLimiter);

// AI Insight Specific Limiter (Expensive)
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: "AI 診斷额度已達本小時上限，請稍後再試。"
});

// Cache Setup
const cache = new LRUCache({ max: 500, ttl: 1000 * 60 * 5 }); // 5 minutes cache

app.use(session({
    secret: 'netfusion-secret-key', // In production, use a secure env variable
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true for HTTPS on Cloud Run
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// OAuth2 Setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
);

// Scopes for Search Console (read-only)
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

// --- Routes ---

// 1. Redirect to Google Consent Screen
app.get('/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Critical for refresh token
        scope: SCOPES,
        prompt: 'consent'
    });
    res.redirect(url);
});

// 2. Handle Google Callback
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);

        // 將 Token 存入 Session 而非全域變數
        req.session.tokens = tokens;

        console.log('✅ 授權成功！Session ID:', req.sessionID);
        res.redirect('/dashboard-v2.html?auth=success');
    } catch (error) {
        console.error('❌ 授權失敗:', error);
        res.status(500).send('授權過程中發生錯誤。');
    }
});

// 3. API - 獲取 GSC 站點列表
app.get('/api/sites', async (req, res) => {
    if (!req.session.tokens) return res.status(401).json({ error: '未授權，請先登入' });

    try {
        oauth2Client.setCredentials(req.session.tokens);
        const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
        const response = await searchconsole.sites.list();
        res.json(response.data);
    } catch (error) {
        console.error('❌ 獲取站點失敗:', error);
        res.status(500).json({ error: '無法獲取站點列表' });
    }
});

// 4. API - 獲取特定站點的分析數據 (回傳關鍵字)
app.get('/api/analytics', async (req, res) => {
    const { siteUrl, days = 30 } = req.query;
    if (!siteUrl) return res.status(400).json({ error: '缺少 siteUrl 參數' });
    if (!req.session.tokens) return res.status(401).json({ error: '未授權' });

    try {
        oauth2Client.setCredentials(req.session.tokens);
        const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - parseInt(days));

        const formatDate = (date) => date.toISOString().split('T')[0];

        const response = await searchconsole.searchanalytics.query({
            siteUrl: siteUrl,
            requestBody: {
                startDate: formatDate(start),
                endDate: formatDate(today),
                dimensions: ['query'], // 專注於關鍵字分析
                rowLimit: 20
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('❌ 獲取分析數據失敗:', error);
        res.status(500).json({ error: '無法獲取分析數據' });
    }
});

// 4.5 API - 獲取流量趨勢數據 (按日期)
app.get('/api/trends', async (req, res) => {
    const { siteUrl, days = 30 } = req.query;
    if (!req.session.tokens) return res.status(401).json({ error: '未授權' });

    try {
        oauth2Client.setCredentials(req.session.tokens);
        const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - parseInt(days));
        const formatDate = (date) => date.toISOString().split('T')[0];

        const response = await searchconsole.searchanalytics.query({
            siteUrl: siteUrl,
            requestBody: {
                startDate: formatDate(start),
                endDate: formatDate(today),
                dimensions: ['date'],
                rowLimit: 100
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: '無法獲取趨勢數據' });
    }
});

// 4.6 API - 獲取熱門頁面數據 (按 URL)
app.get('/api/pages', async (req, res) => {
    const { siteUrl, days = 30 } = req.query;
    if (!req.session.tokens) return res.status(401).json({ error: '未授權' });

    try {
        oauth2Client.setCredentials(req.session.tokens);
        const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - parseInt(days));
        const formatDate = (date) => date.toISOString().split('T')[0];

        const response = await searchconsole.searchanalytics.query({
            siteUrl: siteUrl,
            requestBody: {
                startDate: formatDate(start),
                endDate: formatDate(today),
                dimensions: ['page'], // 專注於頁面分析
                rowLimit: 20
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: '無法獲取頁面數據' });
    }
});

// 5. API - 使用 Gemini 生成 AI 建議
app.post('/api/ai-insights', aiLimiter, async (req, res) => {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: '缺少數據參數' });
    if (!req.session.tokens) return res.status(401).json({ error: '未授權' });

    // Try Cache First
    const cacheKey = `ai-${data.totalClicks}-${data.avgPosition}-${JSON.stringify(data.topData)}`;
    if (cache.has(cacheKey)) {
        console.log('⚡ Using AI Insight Cache');
        return res.json(cache.get(cacheKey));
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            你是一位專業的 SEO 專家。請根據以下 Google Search Console 的詳細數據提供 3 個精確且具體的優化行動建議。
            
            總體指標：
            - 總點擊次數: ${data.totalClicks}
            - 總曝光次數: ${data.totalImpressions}
            - 平均排名: ${data.avgPosition}
            - 平均點擊率 (CTR): ${data.avgCtr}%

            熱門關鍵字與頁面數據 (Top 20)：
            ${JSON.stringify(data.topData)}

            請分析哪些關鍵字排名在「第二頁」(排名 11-20) 需要推一把，或是哪些頁面點擊率異常低。
            請以 JSON 格式回傳建議，格式如下：
            [
              { "title": "建議標題", "description": "包含具體數據的詳細描述", "priority": "High/Medium/Low" },
              ...
            ]
            請確保回傳的是純 JSON 物件，不要包含 markdown 標籤。
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // 清理可能包含的 markdown 標記
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const insights = JSON.parse(jsonString);

        // Save to Cache
        cache.set(cacheKey, insights);

        res.json(insights);
    } catch (error) {
        console.error('❌ AI 生成失敗:', error);
        res.status(500).json({ error: 'AI 無法產生建議' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 6. Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==========================================`);
    console.log(`🚀 NetFusion SaaS Backend 啟動成功！`);
    console.log(`🔗 模式: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 網址: http://localhost:${PORT}`);
    console.log(`==========================================`);
});
