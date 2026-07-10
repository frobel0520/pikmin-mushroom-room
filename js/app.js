/**
 * Shared mushroom rebirth timers for 本區 (Supabase sync).
 */

const BUFFER_MS = 5 * 60 * 1000;
const URGENT_THRESHOLD_MS = 5 * 60 * 1000;

const points = {
    col1: ["水源運動公園", "豐田甲天下石碑", "欣岳逸境", "基督教會"],
    col2: ["涼亭", "溪洲公園", "神秘維納斯", "指示牌"],
    col3: ["無名神像祠", "天地一沙鷗變電箱", "長頸鹿佈告欄", "麒麟天地"],
    col4: ["好山好水真快樂", "溪北公園"],
};

/** @type {Map<string, number|null>} */
const timerState = new Map();

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let supabaseClient = null;

function allPointNames() {
    return Object.values(points).flat();
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function normalizeSupabaseUrl(url) {
    return url
        .trim()
        .replace(/\/+$/, "")
        .replace(/\/rest\/v1\/?$/i, "");
}

function showStatusError(message) {
    const hint = document.querySelector(".sync-hint");
    if (!hint) return;
    hint.textContent = `連線失敗：${message}`;
    hint.style.color = "#ffcdd2";
    hint.style.fontWeight = "bold";
}

function showConfigError(message) {
    const grid = document.getElementById("mapGrid");
    grid.innerHTML = `
        <div style="grid-column: 1 / -1; background: rgba(255,255,255,0.92); padding: 20px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <p style="color: #b71c1c; font-weight: bold; margin: 0 0 8px;">無法連線</p>
            <p style="margin: 0; color: #333;">${escapeHtml(message)}</p>
            <p style="margin: 12px 0 0; font-size: 0.9rem; color: #555;">請檢查 GitHub Secret <code>SUPABASE_URL</code>（只要專案網址，不要含 /rest/v1）。</p>
        </div>
    `;
}

function initSupabase() {
    const rawUrl = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;
    if (!rawUrl || !key || rawUrl.includes("YOUR_PROJECT") || key.includes("YOUR_ANON")) {
        showStatusError("尚未設定 Supabase URL 或 API key。");
        return false;
    }
    if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
        showStatusError("Supabase 函式庫未載入，請檢查網路或稍後再試。");
        return false;
    }
    const url = normalizeSupabaseUrl(rawUrl);
    if (url !== rawUrl.trim().replace(/\/+$/, "")) {
        console.warn("SUPABASE_URL 已自動移除 /rest/v1，建議改為專案根網址。");
    }
    supabaseClient = window.supabase.createClient(url, key);
    return true;
}

function applyRow(row) {
    const rebirth = row.rebirth_at == null ? null : Number(row.rebirth_at);
    timerState.set(row.point_name, rebirth);
}

async function loadAllTimers() {
    const { data, error } = await supabaseClient.from("mushroom_timers").select("point_name, rebirth_at");
    if (error) throw error;
    allPointNames().forEach((name) => timerState.set(name, null));
    (data || []).forEach(applyRow);
}

function subscribeRealtime() {
    supabaseClient
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
                </div>
            `;
        });
    });

    document.querySelectorAll(".set-btn").forEach((btn) => {
        btn.addEventListener("click", () => calculateRebirth(btn.dataset.point));
    });
}

async function calculateRebirth(name) {
    const safeId = encodeURIComponent(name);
    const h = parseInt(document.getElementById(`h-${safeId}`).value, 10) || 0;
    const m = parseInt(document.getElementById(`m-${safeId}`).value, 10) || 0;
    const s = parseInt(document.getElementById(`s-${safeId}`).value, 10) || 0;

    const remainingMs = (h * 3600 + m * 60 + s) * 1000;
    const rebirthTime = Date.now() + remainingMs + BUFFER_MS;

    const { error } = await supabaseClient.from("mushroom_timers").upsert(
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

function updateAllTimers() {
    const now = Date.now();
    allPointNames().forEach((name) => {
        const safeId = encodeURIComponent(name);
        const display = document.getElementById(`timer-${safeId}`);
        if (!display) return;

        const target = timerState.get(name);
        if (target == null) {
            display.innerText = "--:--:--";
            display.classList.remove("active", "done", "counting");
            return;
        }

        const diff = target - now;
        if (diff <= 0) {
            display.innerText = "🍄 已重生！";
            display.classList.remove("active", "counting");
            display.classList.add("done");
        } else {
            const totalSec = Math.floor(diff / 1000);
            const hrs = Math.floor(totalSec / 3600);
            const mins = Math.floor((totalSec % 3600) / 60);
            const secs = totalSec % 60;
            display.innerText = `${hrs.toString().padStart(2, "0")}:${mins
                .toString()
                .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
            display.classList.remove("done");
            if (diff <= URGENT_THRESHOLD_MS) {
                display.classList.remove("counting");
                display.classList.add("active");
            } else {
                display.classList.remove("active");
                display.classList.add("counting");
            }
        }
    });
}

async function init() {
    renderCards();

    if (!initSupabase()) return;

    try {
        await loadAllTimers();
        subscribeRealtime();
        updateAllTimers();
        setInterval(updateAllTimers, 1000);
    } catch (err) {
        showStatusError(err.message || String(err));
    }
}

init();
