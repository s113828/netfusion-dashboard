# Google OAuth 2.0 設定指南

本指南說明如何在 Google Cloud Console 設定 OAuth 2.0 憑證，以連接 Google Search Console 和 Google Analytics 4。

## 步驟 1: 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊頂部的專案選擇器
3. 點擊「新增專案」
4. 輸入專案名稱（例如：NetFusion SEO）
5. 點擊「建立」

## 步驟 2: 啟用必要的 API

在 Google Cloud Console 中：

1. 前往「API 和服務」>「程式庫」
2. 搜尋並啟用以下 API：
   - **Google Search Console API**
   - **Google Analytics Data API**
   - **Google Analytics Admin API**（可選，用於列出屬性）

## 步驟 3: 設定 OAuth 同意畫面

1. 前往「API 和服務」>「OAuth 同意畫面」
2. 選擇使用者類型：
   - 「內部」：僅限組織內使用者（需要 Google Workspace）
   - 「外部」：任何 Google 帳號都可使用
3. 填寫應用程式資訊：
   - 應用程式名稱：NetFusion
   - 使用者支援電子郵件：您的電子郵件
   - 開發人員聯絡資訊：您的電子郵件
4. 點擊「儲存並繼續」

### 新增範圍（Scopes）

在「範圍」頁面，點擊「新增或移除範圍」並加入：

```
https://www.googleapis.com/auth/webmasters.readonly
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

## 步驟 4: 建立 OAuth 2.0 憑證

1. 前往「API 和服務」>「憑證」
2. 點擊「建立憑證」>「OAuth 用戶端 ID」
3. 應用程式類型選擇「網頁應用程式」
4. 名稱：NetFusion Web Client
5. 設定授權的 JavaScript 來源：
   ```
   http://localhost:3001
   http://localhost:5173
   ```
6. 設定授權的重新導向 URI：
   ```
   http://localhost:3001/api/auth/google/callback
   ```
7. 點擊「建立」
8. 記下您的 **Client ID** 和 **Client Secret**

## 步驟 5: 更新環境變數

編輯 `backend/.env` 檔案：

```env
GOOGLE_CLIENT_ID=您的_CLIENT_ID
GOOGLE_CLIENT_SECRET=您的_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

## 步驟 6: 新增測試使用者（如果是外部應用程式）

如果您的 OAuth 同意畫面設定為「外部」且處於「測試」狀態：

1. 前往「OAuth 同意畫面」
2. 在「測試使用者」區段點擊「新增使用者」
3. 輸入您要測試的 Google 帳號電子郵件
4. 點擊「儲存」

## 測試連接

1. 啟動後端伺服器：
   ```bash
   cd backend
   npm run dev
   ```

2. 開啟瀏覽器並訪問：
   ```
   http://localhost:3001/api/auth/google
   ```

3. 使用 Google 帳號登入
4. 授權應用程式存取您的資料
5. 成功後會重新導向到前端頁面

## 常見問題

### Error: redirect_uri_mismatch

確保 Google Cloud Console 中的重新導向 URI 與 `.env` 中的 `GOOGLE_REDIRECT_URI` 完全一致。

### Error: access_denied

- 確認您的 Google 帳號已加入測試使用者清單
- 確認 OAuth 同意畫面已設定完成

### Error: invalid_scope

確認所有需要的 API 已在 Google Cloud Console 中啟用。

## 正式環境部署

部署到正式環境時：

1. 在 Google Cloud Console 新增正式環境的重新導向 URI
2. 更新 `.env` 中的 `GOOGLE_REDIRECT_URI` 和 `FRONTEND_URL`
3. 提交 OAuth 同意畫面進行驗證（如果是外部應用程式）

## 相關連結

- [Google Cloud Console](https://console.cloud.google.com/)
- [Search Console API 文件](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- [GA4 Data API 文件](https://developers.google.com/analytics/devguides/reporting/data/v1)
