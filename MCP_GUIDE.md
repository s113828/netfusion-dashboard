# NetFusion MCP 工具使用手冊 (Universal Guide)

這個專案已預先配置了 **MCP (Model Context Protocol)** 服務，讓不同的 AI 編程軟體（如 Cursor, Claude Code, Cline 等）都能直接調用強大的擴展工具。

## 🛠️ 可用工具服務
1. **replicate-flux-mcp**: 用於生成高品質 AI 圖片 (Flux 模型)。
2. **nanobanana**: 用於調用 Gemini API (Google 的多模態模型能力)。
3. **google-cloud**: 用於管理 GCP 資源、部署 Cloud Run 與監控。
4. **brave-search**: 讓 AI 具備即時網頁搜尋與 SEO 趨勢分析能力。

## 🔌 各軟體綁定指南

### 1. Cursor (VS Code)
請手動將 MCP 加入到 Cursor 設定中：
*   前往 `Settings` > `Cursor Settings` > `General` > `MCP`
*   點擊 `+ Add New MCP Server`
*   **Name**: `NetFusion-Local`
*   **Type**: `command`
*   **Command**: 把以下內容貼進去：
    ```bash
    npx -y --package @lyalindotcom/nano-banana-mcp -- nano-banana-server
    ```
*   **Name**: `Brave-Search`
*   **Type**: `command`
*   **Command**: `npx -y --package @modelcontextprotocol/server-brave-search -- mcp-server-brave-search`
*   **Env**: `BRAVE_API_KEY=你的金鑰`

*貼心提醒：Google Cloud 配置較複雜，建議使用 `gcloud auth application-default login` 完成本地授權後再掛載。*

### 2. Claude Code (終端機命令行)
當你在這個目錄執行 `claude` 時，你可以透過以下指令直接掛載：
```bash
claude mcp add nanobanana npx -y @lyalindotcom/nano-banana-mcp
```

### 3. Cline (Claude Dev)
Cline 通常會自動讀取根目錄的指令。請確保 Cline 的設定指向本專案的根目錄。

---
**配置檔位置**：
*   本地：`./.mcp.json`
*   全局同步：`%APPDATA%/antigravity/mcp_config.json`
