# NetFusion 快速部署：Pre-flight 自檢清單

為了實現「一鍵部署」與「快速更新」，請確保以下設定已準備就緒。當你拿到這些資訊後，可以直接填入 `.env` 或透過我來設定。

## 🔑 1. API 金鑰與認證 (Essential)
請在你的 `.env` 中補充以下 Supabase 資訊（或者直接貼給我，我幫你填入）：

```env
# Supabase 設定 (你的新數據庫)
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# 現有的 Google 設定 (已就緒)
GOOGLE_CLIENT_ID=337214933996-ejkc4jt35lc10uv5s57tg3a799tdupl9...
GOOGLE_CLIENT_SECRET=GOCSPX-Zde...
GEMINI_API_KEY=AIzaSyCcO80iP...
```

## 🌐 2. 網域與回退網址 (Networking)
當我們部署到 Cloud Run 後，你的 `GOOGLE_REDIRECT_URL` **必須** 修改。
*   **本地開發**：`http://localhost:3000/auth/google/callback`
*   **雲端正式**：`https://[你的網域]/auth/google/callback`
> [!IMPORTANT]
> 你需要在 Google Cloud Console 的 Credentials 頁面手動新增這個「正式版」網址。

## 🧠 3. 未來擴展的 MCP/Skill 疊加
我們已經準備好了：
*   ✅ **GCP Deployment Skill** (自動化部署手冊)
*   ✅ **Brave Search MCP** (聯網分析能力)
*   ✅ **Supabase Integration Skill** (數據庫對接手冊)

## 📅 下一步驟：自動化任務
一旦你提供 Supabase Key，我將執行：
1.  **自動初始化 Supabase Client**。
2.  **建立 `gcloud` 部署腳本 (`deploy.sh`)**。
3.  **設定 Secret Manager 防護**。

**只要你準備好 Key，隨時告訴我！**
