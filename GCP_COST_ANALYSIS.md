# NetFusion 雲端部署成本估算 (GCP Cloud Run)

針對你目前開發的 NetFusion (Node.js + GSC API + Gemini)，以下是部署到 Google Cloud 的預估每月支出：

## 1. Google Cloud Run (主機) - $0.00 ~ $2.00 / 月
*   **特性**：Cloud Run 支援「縮減至 0 (Scale to Zero)」。
*   **預估**：
    *   如果你每月點擊 Dashboard 的次數小於 5 萬次，**GCP 的免費額度 (Free Tier) 通常可以完全覆蓋**。
    *   即便有穩定流量，每月支出通常僅約 **$1~2 美金** 足以支撐小型 SaaS。
*   **建議設定**：記憶體 1GB / CPU 1 Core，開啟「僅在處理請求時分配 CPU」以省錢。

## 2. Gemini API (AI 診斷) - $0.00 / 月
*   **模型**：`gemini-1.5-flash`
*   **預估**：
    *   在開發/測試階段，使用「Pay-as-you-go」方案的免費限制 (15 RPM) 即可。
    *   只要每分鐘請求不超過 15 次，**完全免費**。

## 3. Networking & Domain (流量與域名) - $0.00 ~ $0.50 / 月
*   **內容**：出口流量 (Egress)。
*   **預估**：SEO 報表多為文字與輕量圖表，流量消耗極低。前 1GB 免費。

---

## 🚀 部署準備：第一步 (建立 Dockerfile)

為了能將程式碼打包上雲端，我們需要在根目錄建立 `Dockerfile`：

```dockerfile
# 使用 Node.js 官方 Slim 版本以減小體積
FROM node:20-slim

# 設定工作目錄
WORKDIR /usr/src/app

# 複製 package.json 先安裝依賴 (利用 Docker Cache)
COPY package*.json ./
RUN npm install --production

# 複製其餘程式碼
COPY . .

# Cloud Run 預設監聽 8080 埠
ENV PORT=8080
EXPOSE 8080

# 啟動命令
CMD ["npm", "start"]
```

## 📅 我們的行動計畫
1.  **[ ]** 建立 `Dockerfile` 與 `.dockerignore`。
2.  **[ ]** 確保你在本地已執行過 `gcloud auth login`。
3.  **[ ]** 建立 GCP 專案並上傳映像檔。
4.  **[ ]** 在雲端設定 Secret Manager (存放 GEMINI_API_KEY)。

**你想現在開始「第一步：建立 Dockerfile」嗎？**
