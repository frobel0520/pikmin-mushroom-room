# 蘑菇戰情室

家人共用的皮克敏蘑菇重生倒數看板。資料透過 [Supabase](https://supabase.com) 免費方案即時同步，前端部署在 **GitHub Pages**（免費）。

## 功能

- 11 個本區點位，輸入剩餘時間後自動加 **5 分鐘緩衝** 倒數
- 多人同時開啟網頁，狀態即時同步（Supabase Realtime）
- 無需登入

## 前置需求

- [GitHub](https://github.com) 帳號
- [Supabase](https://supabase.com) 免費專案

## 1. Supabase 設定

1. 建立新專案（Free tier）。
2. 開啟 **SQL Editor**，貼上並執行 [`supabase/schema.sql`](supabase/schema.sql)。
3. 開啟 **Database → Replication**，確認 `mushroom_timers` 已加入 **Realtime**（若沒有，手動加入 publication）。
4. 到 **Project Settings → API** 複製：
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

## 2. 背景圖

將你原本的 `Pikmin2.jpg` 放到：

```
assets/Pikmin2.jpg
```

（與舊版 `index.html` 同目錄的那張圖即可。）

## 3. 本機預覽

```powershell
cd C:\Users\ytwei\Projects\pikmin-mushroom-room
Copy-Item js\config.example.js js\config.js
# 編輯 js\config.js，填入 SUPABASE_URL 與 SUPABASE_ANON_KEY
python -m http.server 8080
```

瀏覽器開啟：<http://localhost:8080>

## 4. 部署到 GitHub Pages

### 4.1 建立 GitHub 倉庫

```powershell
cd C:\Users\ytwei\Projects\pikmin-mushroom-room
git add .
git commit -m "初始版本：Supabase 同步蘑菇戰情室"
git branch -M main
git remote add origin https://github.com/frobel0520/pikmin-mushroom-room.git
git push -u origin main
```

### 4.2 Repository Secrets

在 GitHub 倉庫：**Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|--------|
| `SUPABASE_URL` | **Project URL**（例如 `https://xxxxx.supabase.co`）— **不要**填 REST 網址（不可含 `/rest/v1`） |
| `SUPABASE_ANON_KEY` | anon public 或 publishable key |

### 4.3 啟用 GitHub Pages

1. **Settings → Pages**
2. **Build and deployment → Source**：選 **GitHub Actions**
3. 推送 `main` 後，Actions 會自動部署；網址約為  
   `https://frobel0520.github.io/pikmin-mushroom-room/`

把此連結傳給家人即可（勿公開張貼，因無登入保護）。

## 專案結構

```
index.html          # 頁面
js/app.js           # 倒數邏輯 + Supabase 同步
js/config.js        # 本機用（勿提交，見 .gitignore）
js/config.example.js
assets/Pikmin2.jpg  # 背景圖（自行放入）
supabase/schema.sql # 資料表與 RLS
.github/workflows/  # Pages 部署
```

## 驗證同步

1. 兩台裝置（或兩個瀏覽器分頁）開啟同一網址。
2. 在 A 對「溪洲公園」按「開始倒數」。
3. B 應在約 1 秒內看到相同倒數。

## 費用

- Supabase Free、GitHub Pages Free，家人使用量下通常 **$0**。

## 授權

個人 / 家人自用。皮克敏相關素材請自行留意版權，僅建議私下使用。
