# 使用 Node.js 20 官方輕量鏡像
FROM node:20-slim

# 設定工作目錄
WORKDIR /usr/src/app

# 複製依賴描述文件並安裝
# 這樣做可以利用 Docker 的層級快取 (Cache)
COPY package*.json ./
RUN npm install --production

# 複製專案其餘檔案
COPY . .

# 設定 Cloud Run 要求的連接埠
ENV PORT=8080
EXPOSE 8080

# 啟動伺服器
CMD ["npm", "start"]
