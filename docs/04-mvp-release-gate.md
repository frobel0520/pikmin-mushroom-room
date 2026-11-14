# 皮克敏蘑菇戰情室（Pikmin Mushroom Room）MVP Release Gate

| 文件項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件日期 | 2026-11-14 |
| 狀態 | 功能已上線使用中；產品級 CI 測試與正式環境 Supabase 驗收尚未補齊（待補） |
| 專案級別 | 產品級 |
| 依據 | Harbor `standards/DevelopmentStandards.md`、`standards/DeploymentHandbook.md` |

## 1. Gate 檢核總覽

| 項目 | 條件／門檻 | 目前狀態 | 證據與備註 |
|---|---|---|---|
| 相依套件鎖定 | 移除浮動 CDN，改用與 npm tarball SHA-512 一致的本地 `vendor/supabase-2.118.0.js` | 通過 | `security/reports/2026-10-25-p2-remediation.md` |
| CSP 與機密隔離 | `index.html` 設定嚴格 CSP；`js/config.js` 不入庫，僅部署時由 Secrets 注入 | 通過 | `index.html`、`.github/workflows/deploy-pages.yml` |
| 發布權限控管 | `deploy-pages.yml` 強制 `refs/heads/main` 且 `GITHUB_ACTOR == GITHUB_REPOSITORY_OWNER` | 通過 | `.github/workflows/deploy-pages.yml` |
| 響應式版面 | 1280px（桌面）與 375px（手機）無水平溢出 | 通過（報告紀錄） | `security/reports/2026-10-25-p2-remediation.json` |
| 合成 I/O 延遲 | 本地 50 次暖樣本 p95 `< 100ms`（實測 1280px 0.40ms、375px 0.30ms） | 通過（合成） | `security/reports/2026-10-25-p2-remediation.json` |
| 零月費確認 | GitHub Pages + Supabase Free Tier（17 筆資料），無付費項目 | 通過 | `supabase/schema.sql`、`docs/03-system-design.md` |
| CI 自動化測試 | PR / `main` 自動執行單元測試、lint 或靜態檢查 | **未通過／待補** | 目前僅有 `deploy-pages.yml`，尚無測試檔與 CI 測試步驟 |
| 正式 Supabase 驗收 | 正式環境 PostgREST 讀寫、Realtime 同步延遲與 RLS 邊界實測 | **待驗收** | `2026-10-25-p2-remediation.md` 明記尚未於 CI 驗收真實 Supabase |
| 產品級存取邊界 | 評估是否由公開 `anon` RLS 改為受保護登入或限縮寫入機制 | **待評估** | 列於 `AGENTS.md` 產品級對齊待辦 |

## 2. 變更管理提醒

- 依 `DevelopmentStandards.md` 第 1.3 節變更風險覆寫規定，任何涉及資料庫 schema、RLS 政策、認證模式或 `deploy-pages.yml` 的修改，皆須透過分支與 PR 進行，並於 PR 說明測試結果與 rollback 方式。
