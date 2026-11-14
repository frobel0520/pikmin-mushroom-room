# 皮克敏蘑菇戰情室（Pikmin Mushroom Room）系統設計（SD）

| 文件項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件日期 | 2026-11-14 |
| 狀態 | 依現況盤點補齊（含現況與標準間之待辦缺口） |
| 專案級別 | 產品級 |
| 依據 | Harbor `standards/DevelopmentStandards.md`、`standards/DeploymentHandbook.md` |

## 1. 設計限制與權衡

- **零月費**：前端純靜態託管於 GitHub Pages，後端資料同步完全使用 Supabase 免費方案，不架設自建 API 伺服器。
- **無建置工具鏈**：採用原生 HTML5 / CSS3 / ES6+ JavaScript 與本地 vendored UMD 套件（`vendor/supabase-2.118.0.js`），不依賴 Node 打包流程。
- **依賴完整性鎖定**：於 SEC-P2-20261025 修補中將原本浮動版本的 CDN 引用替換為經 npm tarball SHA-512 驗核的本地 `vendor/supabase-2.118.0.js`。
- **已知架構缺口**：依 Harbor `DeploymentHandbook.md`，具資料寫入能力的產品級應用原則上應有正式認證與獨立網域邊界；本專案目前維持家庭私用免登入與 GitHub Pages 託管現況，相關缺口已列於 `AGENTS.md` 與 `04-mvp-release-gate.md` 待評估。

## 2. 架構總覽

```text
GitHub repo（main）
  └─ GitHub Actions（deploy-pages.yml）
       ├─ 驗證 refs/heads/main 與 GITHUB_ACTOR == GITHUB_REPOSITORY_OWNER
       ├─ 由 Secrets 產生 js/config.js（SUPABASE_URL、SUPABASE_ANON_KEY）
       └─ 部署靜態根目錄至 GitHub Pages
            └─ 瀏覽器客戶端（index.html + js/app.js + vendor/supabase-2.118.0.js）
                 ├─ PostgREST（HTTPS）：讀寫 public.mushroom_timers
                 └─ Supabase Realtime（WSS）：mushroom_timers_room 即時廣播
```

## 3. 目錄結構

```text
.github/workflows/
  deploy-pages.yml            GitHub Pages 部署與 Secret 注入（目前無獨立測試 workflow）
assets/                       favicon.svg、Pikmin2.jpg
js/
  app.js                      17 點位渲染、5 分鐘緩衝計算、每秒倒數與 Supabase 同步
  config.example.js           SUPABASE_URL 與 SUPABASE_ANON_KEY 範本
supabase/
  schema.sql                  public.mushroom_timers 資料表與 anon RLS 政策
vendor/
  supabase-2.118.0.js         本地鎖定版 Supabase JS Client UMD
  supabase-LICENSE.txt        MIT 授權文件
security/reports/             2026-10-25 P2 安全修補與效能基線報告
index.html                    主頁面、響應式 CSS、CSP 標頭與 Harbor 維護腳本
```

## 4. 部署與 Rollback 方式

- **部署（`.github/workflows/deploy-pages.yml`）**：僅於 `refs/heads/main` 且 actor 為 repo 擁有者時觸發，注入 Secrets 產生 `js/config.js` 後直接發布至 GitHub Pages。
- **Rollback 方式**：於 GitHub `main` 分支 revert 問題 commit 後重新觸發 `deploy-pages.yml`；若為資料庫 schema 異動則於 Supabase SQL Editor 手動回退。

## 5. 零月費與效能設計

| 項目 | 免費額度與現況邊界 |
|---|---|
| 託管平台 | GitHub Pages 免費靜態託管 |
| Supabase Free Tier | 500 MB 資料庫容量、200 同時 Realtime 連線、200 萬次/月 Realtime 訊息；本專案僅存 17 筆資料且為單一家庭使用，遠低於免費上限 |
| 客戶端效能 | 本地 1280px 與 375px 無水平溢出；合成 I/O handler 50 次暖樣本 p95 `< 1ms`（見 `security/reports/2026-10-25-p2-remediation.json`） |
| 效能與整合缺口 | 正式環境 Supabase 讀寫、Realtime 延遲與 RLS 行為尚未納入 CI 自動化驗收（待補） |
