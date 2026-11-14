# 皮克敏蘑菇戰情室（Pikmin Mushroom Room）系統分析（SA）

| 文件項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件日期 | 2026-11-14 |
| 狀態 | 依現況盤點補齊 |
| 專案級別 | 產品級 |

## 1. 使用者與存取邊界（現況）

- **存取模式**：免登入（Direct Link Access）。所有取得網頁網址的家庭成員皆以 Supabase 匿名金鑰（`SUPABASE_ANON_KEY`）連線。
- **資料寫入風險認知**：雖然沒有登入畫面，但前端具備對共用資料庫 `public.mushroom_timers` 的寫入／更新能力，因此依 Harbor `DevelopmentStandards.md` 第 1.3 節分類為**產品級**專案。
- **既有安全邊界**：
  - `index.html` 以 `<meta http-equiv="Content-Security-Policy">` 限制僅能連線 `'self'`、`harbor-1wk.pages.dev` 與 `https://*.supabase.co`／`wss://*.supabase.co`。
  - `js/config.js` 不提交進 Git，僅於部署時由 GitHub Actions Secrets 注入；repo 僅保留 `js/config.example.js`。

## 2. 核心業務流程

### 2.1 初始化與即時訂閱

1. 瀏覽器載入 `index.html`、`vendor/supabase-2.118.0.js`、`js/config.js` 與 `js/app.js`。
2. `renderCards()` 依固定 4 欄清單建立 17 張點位卡片，並啟動每秒執行一次的 `setInterval(updateAllTimers, 1000)`。
3. 透過 PostgREST `GET /rest/v1/mushroom_timers?select=point_name,rebirth_at` 載入現有重生時間戳記。
4. 訂閱 Supabase Realtime 頻道 `mushroom_timers_room`，監聽 `public.mushroom_timers` 的變更事件並即時更新本地狀態。

### 2.2 設定重生倒數與 5 分鐘緩衝

1. 使用者於特定點位卡片輸入遊戲內顯示的剩餘「時、分、秒」並送出。
2. 前端計算目標時間戳記：`rebirth_at = Date.now() + remainingMs + BUFFER_MS`（其中 `BUFFER_MS = 5 * 60 * 1000`，即自動多加 5 分鐘緩衝）。
3. 呼叫 Supabase Upsert（`on_conflict=point_name`）寫入 `public.mushroom_timers`。
4. Supabase Realtime 將異動推播至所有連線中的家庭成員裝置，各裝置依 `rebirth_at - Date.now()` 切換狀態：
   - 無計時或 `null`：`--:--:--`（待機）
   - 剩餘 `> 5 分鐘`：白色倒數 `hh:mm:ss`
   - 剩餘 `≤ 5 分鐘`：粉紅警示發光（`--timer-active`）
   - 剩餘 `≤ 0`：黃色高亮顯示 `🍄 已重生！`（`--timer-done`）

## 3. 資料模型與 RLS（`supabase/schema.sql`）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `point_name` | `text`（Primary Key） | 蘑菇點位名稱（固定 17 個點位） |
| `rebirth_at` | `bigint`（Nullable） | 目標重生時間（Unix 毫秒時間戳記）；`null` 代表無作用中倒數 |
| `updated_at` | `timestamptz` | 最後更新時間，預設 `now()` |

- **RLS 政策現況**：已啟用 Row Level Security，目前針對 `anon` 角色開放 `SELECT`、`INSERT`、`UPDATE`、`DELETE`（`using (true)` / `with check (true)`）。此設計仰賴私人網址保密，屬於已知的產品級安全強化待辦項目。
