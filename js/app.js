/**
 * Shared mushroom rebirth timers for 本區 (Supabase sync).
 */

const BUFFER_MS = 5 * 60 * 1000;

const points = {
    col1: ["水源運動公園", "豐田甲天下", "欣岳逸境", "基督教會"],
    col2: ["無名神像嗣", "溪洲公園", "神秘維納斯", "指示牌"],
    col3: ["天地一沙鷗變電箱", "麒麟天地"],
    col4: ["溪北公園"],
};

/** @type {Map<string, number|null>} */
const timerState = new Map();

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let supabase = null;

function allPointNames() {
    return Object.values(points).flat();
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function showConfigError(message) {
    const grid = document.getElementById("mapGrid");
    grid.innerHTML = `
        <div style="grid-column: 1 / -1; background: rgba(255,255,255,0.92); padding: 20px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <p style="color: #b71c1c; font-weight: bold; margin: 0 0 8px;">無法連線</p>
            <p style="margin: 0; color: #333;">${escapeHtml(message)}</p>
            <p style="margin: 12px 0 0; font-size: 0.9rem; color: #555;">請依 README 設定 <code>js/config.js</code> 與 Supabase。</p>
        </div>
    `;
}

function initSupabase() {
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;
    if (!url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_ANON")) {
        showConfigError("尚未設定 Supabase：請複製 js/config.example.js 為 js/config.js 並填入 URL 與 anon key。");
        return false;
    }
    if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
        showConfigError("Supabase 函式庫未載入。");
        return false;
    }
    supabase = window.supabase.createClient(url, key);
    return true;
}

function applyRow(row) {
    const rebirth = row.rebirth_at == null ? null : Number(row.rebirth_at);
    timerState.set(row.point_name, rebirth);
}

async function loadAllTimers() {
    const { data, error } = await supabase.from("mushroom_timers").select("point_name, rebirth_at");
    if (error) throw error;
    allPointNames().forEach((name) => timerState.set(name, null));
    (data || []).forEach(applyRow);
}

function subscribeRealtime() {
    supabase
        .channel("mushroom_timers_room")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "mushroom_timers" },
            (payload) => {
                if (payload.eventType === "DELETE" && payload.old?.point_name) {
                    timerState.set(payload.old.point_name, null);
                } else if (payload.new?.point_name) {
                    applyRow(payload.new);
                }
                updateAllTimers();
            }
        )
        .subscribe();
}

function renderCards() {
    Object.keys(points).forEach((colId) => {
        const colEl = document.getElementById(colId);
        colEl.innerHTML = "";
        points[colId].forEach((name) => {
            const safeId = encodeURIComponent(name);
            colEl.innerHTML += `
                <div class="mush-card">
                    <span class="mush-name">${escapeHtml(name)}</span>
                    <span class="timer-display" id="timer-${safeId}">--:--:--</span>
                    <div class="input-row">
                        <input type="number" id="h-${safeId}" placeholder="時" min="0">
                        <input type="number" id="m-${safeId}" placeholder="分" min="0" max="59">
                        <input type="number" id="s-${safeId}" placeholder="秒" min="0" max="59">
                    </div>
                    <button type="button" class="set-btn" data-point="${escapeHtml(name)}">開始倒數！</button>
                    <button type="button" class="clear-btn" data-clear="${escapeHtml(name)}">清除</button>
                </div>
            `;
        });
    });

    document.querySelectorAll(".set-btn").forEach((btn) => {
        btn.addEventListener("click", () => calculateRebirth(btn.dataset.point));
    });
    document.querySelectorAll(".clear-btn").forEach((btn) => {
        btn.addEventListener("click", () => clearTimer(btn.dataset.clear));
    });
}

async function calculateRebirth(name) {
    const safeId = encodeURIComponent(name);
    const h = parseInt(document.getElementById(`h-${safeId}`).value, 10) || 0;
    const m = parseInt(document.getElementById(`m-${safeId}`).value, 10) || 0;
    const s = parseInt(document.getElementById(`s-${safeId}`).value, 10) || 0;

    const remainingMs = (h * 3600 + m * 60 + s) * 1000;
    const rebirthTime = Date.now() + remainingMs + BUFFER_MS;

    const { error } = await supabase.from("mushroom_timers").upsert(
        {
            point_name: name,
            rebirth_at: rebirthTime,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "point_name" }
    );
    if (error) {
        alert(`更新失敗：${error.message}`);
        return;
    }

    timerState.set(name, rebirthTime);
    document.getElementById(`h-${safeId}`).value = "";
    document.getElementById(`m-${safeId}`).value = "";
    document.getElementById(`s-${safeId}`).value = "";
    updateAllTimers();
}

async function clearTimer(name) {
    const { error } = await supabase.from("mushroom_timers").delete().eq("point_name", name);
    if (error) {
        alert(`清除失敗：${error.message}`);
        return;
    }
    timerState.set(name, null);
    updateAllTimers();
}

function updateAllTimers() {
    const now = Date.now();
    allPointNames().forEach((name) => {
        const safeId = encodeURIComponent(name);
        const display = document.getElementById(`timer-${safeId}`);
        if (!display) return;

        const target = timerState.get(name);
        if (target == null) {
            display.innerText = "--:--:--";
            display.style.color = "#d32f2f";
            return;
        }

        const diff = target - now;
        if (diff <= 0) {
            display.innerText = "🍄 已重生！";
            display.style.color = "#2d5a27";
        } else {
            const totalSec = Math.floor(diff / 1000);
            const hrs = Math.floor(totalSec / 3600);
            const mins = Math.floor((totalSec % 3600) / 60);
            const secs = totalSec % 60;
            display.innerText = `${hrs.toString().padStart(2, "0")}:${mins
                .toString()
                .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
            display.style.color = "#d32f2f";
        }
    });
}

async function init() {
    if (!initSupabase()) return;

    renderCards();

    try {
        await loadAllTimers();
        subscribeRealtime();
        updateAllTimers();
        setInterval(updateAllTimers, 1000);
    } catch (err) {
        showConfigError(err.message || String(err));
    }
}

init();
