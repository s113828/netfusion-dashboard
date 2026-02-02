# NetFusion 網域與 SSL 策略指南 (Google Cloud)

在部署至 Cloud Run 後，你有以下三種方式來處理網域與 HTTPS 憑證：

## 1. 使用 Cloud Run 預設網址 (最簡單 / $0)
*   **格式**：`https://netfusion-service-xxxx-as.a.run.app`
*   **優點**：自動產生、內建 SSL 憑證、完全免費。
*   **缺點**：網址很長且不專業。
*   **適用場景**：開發階段、內部測試、API 伺服器。

## 2. Firebase Hosting 映射 (推薦 SaaS 使用 / $0)
*   **方式**：利用 Firebase Hosting 作為前端網關，將流量導入 Cloud Run。
*   **優點**：
    *   **一鍵連結自定義網域** (如 `dashboard.yourdomain.com`)。
    *   **免費版內建 SSL** 與全球 CDN 加速。
    *   整合簡單，適合小型 SaaS 產品。
*   **成本**：在一般流量下通常為 **$0**。

## 3. Google Cloud Load Balancer (企業級 / 約 $20+/月)
*   **方式**：建立全球外部負載均衡器 (GCLB)。
*   **優點**：支撐超大規模流量、支援複雜的路徑導向 (Path-based routing)。
*   **缺點**：**基本月費較高 (約 $18~25 USD/月)**，對剛起步的專案來說較貴。
*   **適用場景**：大型企業專案、多地區佈署。

---

## 🚀 專業建議：先走「方法 2 (Firebase)」

如果你已經擁有一個網域（如 Godaddy 或 Namecheap 購買的），我建議透過 Firebase Hosting 來管理：

1.  **申請網域**：確保你已擁有一個域名。
2.  **Firebase 連結**：我們在部署 Cloud Run 後，只需在 Firebase 控制台點選「Add Custom Domain」。
3.  **DNS 設定**：將 Firebase 提供的 A 紀錄 (IP) 填入你的網域後台。
4.  **SSL 佈署**：Google 會自動幫你簽發 Let's Encrypt 憑證，大約 1 小時後生效。

## ⚠️ 重要提醒：OAuth 回退網址
一旦確定了網域（例如 `https://app.netfusion.com`），我們必須回到 Google Cloud Console 修改：
*   **Authorized redirect URIs**：從 `http://localhost:3000/...` 改為 `https://app.netfusion.com/auth/google/callback`。

**你想使用哪一種方案？如果你有現成的網域，我可以幫你準備 Firebase 的設定流程！**
