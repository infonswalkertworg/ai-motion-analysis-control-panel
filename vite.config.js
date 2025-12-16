name: Deploy Vite App to GitHub Pages

on:
  push:
    branches:
      - main # 只有當推送到 main 分支時才觸發部署

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout 
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20' # 使用最新的 LTS 版本

      - name: Install dependencies
        run: npm install

      - name: Build project
        run: npm run build # 執行 package.json 中的 build 腳本，產生 dist 資料夾

      # 部署到 GitHub Pages
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }} # GitHub 提供的自動化 token
          publish_dir: ./dist # 將 build 產生的 dist 資料夾內容推送到 gh-pages 分支
          cname: '' # 如果沒有自訂網域，則留空
