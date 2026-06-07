"use strict";
// ===================== CONSTANTS =====================

const STORAGE_KEYS = ["name", "regNo", "neoPat", "cgpa", "degree", "branch", "specialization"];

// ===================== ELEMENTS =====================

const tabProfile  = document.getElementById("tabProfile");
const tabResults  = document.getElementById("tabResults");
const panelProfile  = document.getElementById("panelProfile");
const panelResults  = document.getElementById("panelResults");
const resultsBadge  = document.getElementById("resultsBadge");

const statusDot   = document.getElementById("statusDot");
const statusLabel = document.getElementById("statusLabel");

const statsBar    = document.getElementById("statsBar");
const statRed     = document.getElementById("statRed");
const statYellow  = document.getElementById("statYellow");
const statGray    = document.getElementById("statGray");

const saveBtn     = document.getElementById("saveBtn");
const clearBtn    = document.getElementById("clearBtn");
const toast       = document.getElementById("toast");

const scanNowBtn  = document.getElementById("scanNowBtn");
const scanTime    = document.getElementById("scanTime");

const stateScanning = document.getElementById("stateScanning");
const stateNoGmail  = document.getElementById("stateNoGmail");
const stateEmpty    = document.getElementById("stateEmpty");

const secRed    = document.getElementById("secRed");
const secYellow = document.getElementById("secYellow");
const secGray   = document.getElementById("secGray");
const listRed   = document.getElementById("listRed");
const listYellow= document.getElementById("listYellow");
const listGray  = document.getElementById("listGray");
const cntRed    = document.getElementById("cntRed");
const cntYellow = document.getElementById("cntYellow");
const cntGray   = document.getElementById("cntGray");
const toggleGray  = document.getElementById("toggleGray");
const chevronGray = document.getElementById("chevronGray");

// Profile fields
const fields = {};
STORAGE_KEYS.forEach(k => { fields[k] = document.getElementById(k); });

// ===================== TABS =====================

function showPanel(name) {
    panelProfile.classList.toggle("hidden", name !== "profile");
    panelResults.classList.toggle("hidden", name !== "results");
    tabProfile.classList.toggle("active", name === "profile");
    tabResults.classList.toggle("active", name === "results");
    if (name === "results") loadResults();
}

tabProfile.onclick  = () => showPanel("profile");
tabResults.onclick  = () => showPanel("results");

// ===================== STATUS DOT =====================

function setStatus(state) {
    // state: 'idle' | 'scanning' | 'red' | 'yellow' | 'ok'
    statusDot.className = "status-dot";
    const labels = { idle: "Idle", scanning: "Scanning…", red: "Alert!", yellow: "Eligible", ok: "All clear" };
    if (state === "scanning") { statusDot.classList.add("scanning"); }
    else if (state === "red")    { statusDot.classList.add("done-red"); }
    else if (state === "yellow") { statusDot.classList.add("done-yellow"); }
    else if (state === "ok")     { statusDot.classList.add("done-ok"); }
    statusLabel.textContent = labels[state] || "Idle";
}

// ===================== STATS BAR =====================

function updateStats(red, yellow, gray) {
    statRed.textContent    = red;
    statYellow.textContent = yellow;
    statGray.textContent   = gray;

    // Badge on Results tab
    const urgent = red + yellow;
    resultsBadge.textContent = urgent || "";
    resultsBadge.classList.toggle("visible", urgent > 0);

    // Status pill
    if (red > 0)    setStatus("red");
    else if (yellow > 0) setStatus("yellow");
    else            setStatus("ok");
}

// ===================== PROFILE — LOAD =====================

function loadProfile() {
    chrome.storage.local.get(STORAGE_KEYS, (data) => {
        STORAGE_KEYS.forEach(k => {
            if (fields[k]) fields[k].value = data[k] || "";
        });
    });
}

// ===================== PROFILE — SAVE =====================

saveBtn.onclick = () => {
    const data = {};
    const sanitize = (v, maxLen) => String(v || "").replace(/[<>]/g, "").trim().slice(0, maxLen);

    data.name           = sanitize(fields.name?.value,           60);
    data.regNo          = sanitize(fields.regNo?.value,          20);
    data.neoPat         = sanitize(fields.neoPat?.value,         16);
    data.cgpa           = sanitize(fields.cgpa?.value,           5);
    data.degree         = sanitize(fields.degree?.value,         20);
    data.branch         = sanitize(fields.branch?.value,         60);
    data.specialization = sanitize(fields.specialization?.value, 80);

    chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
            showToast("Save failed: " + chrome.runtime.lastError.message, true);
            return;
        }
        showToast("Profile saved");
    });
};

function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.className = isError ? "toast error" : "toast";
    setTimeout(() => { toast.textContent = ""; }, 3000);
}

// ===================== PROFILE — CLEAR =====================

clearBtn.onclick = () => {
    if (!confirm("Clear your saved profile AND all scan results from this device?")) return;
    const allKeys = [...STORAGE_KEYS, "scannedEmails", "lastScanTime"];
    chrome.storage.local.remove(allKeys, () => {
        if (chrome.runtime.lastError) { showToast("Clear failed.", true); return; }
        STORAGE_KEYS.forEach(k => { if (fields[k]) fields[k].value = ""; });
        // Reset results view
        scanTime.textContent = "Never";
        statRed.textContent = "–";
        statYellow.textContent = "–";
        statGray.textContent = "–";
        resultsBadge.classList.remove("visible");
        setStatus("idle");
        hideAllStates();
        [secRed, secYellow, secGray].forEach(s => s.classList.add("hidden"));
        stateEmpty.classList.remove("hidden");
        showToast("Cleared");
    });
};

// ===================== GRAY TOGGLE =====================

let grayExpanded = false;

toggleGray.onclick = () => {
    grayExpanded = !grayExpanded;
    listGray.classList.toggle("collapsed", !grayExpanded);
    listGray.classList.toggle("expanded", grayExpanded);
    chevronGray.classList.toggle("open", grayExpanded);
};

// ===================== SCAN NOW =====================

scanNowBtn.addEventListener("click", async () => {
    scanNowBtn.disabled = true;
    scanNowBtn.textContent = "Scanning…";
    setStatus("scanning");
    stateScanning.classList.remove("hidden");
    stateEmpty.classList.add("hidden");
    stateNoGmail.classList.add("hidden");

    try {
        const tabs = await new Promise(res =>
            chrome.tabs.query({ url: "https://mail.google.com/*", active: true, currentWindow: true }, res)
        );

        // Try active tab first, then any Gmail tab
        let gmailTab = tabs[0];
        if (!gmailTab) {
            const any = await new Promise(res => chrome.tabs.query({ url: "https://mail.google.com/*" }, res));
            gmailTab = any[0];
        }

        if (!gmailTab) {
            stateScanning.classList.add("hidden");
            stateNoGmail.classList.remove("hidden");
            setStatus("idle");
            return;
        }

        await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(gmailTab.id, { type: "scan-now" }, (resp) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(resp);
            });
        });

        setTimeout(loadResults, 1400);

    } catch (err) {
        console.error("Placify scan error:", err);
        stateScanning.classList.add("hidden");
        stateNoGmail.classList.remove("hidden");
        setStatus("idle");
    } finally {
        scanNowBtn.disabled = false;
        scanNowBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Scan Now`;
    }
});

// ===================== LOAD RESULTS =====================

function hideAllStates() {
    stateScanning.classList.add("hidden");
    stateNoGmail.classList.add("hidden");
    stateEmpty.classList.add("hidden");
}

function formatAge(ts) {
    if (!ts) return "Never";
    const diff = Math.round((Date.now() - ts) / 1000);
    if (diff < 60)   return "Just now";
    if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
}

function formatCardTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function makePriorityTag(priority) {
    const map = {
        RED:    { cls: "tag-red",    label: "Shortlisted" },
        YELLOW: { cls: "tag-yellow", label: "Eligible" },
        GRAY:   { cls: "tag-gray",   label: "Not eligible" }
    };
    const t = map[priority] || map.GRAY;
    return `<span class="card-priority-tag ${t.cls}">${t.label}</span>`;
}

function makeCard(email) {
    const priority = email.priority;
    const cardClass = priority === "RED" ? "card-red" : priority === "YELLOW" ? "card-yellow" : "card-gray";
    const reasonClass = priority === "RED" ? "reason-red" : priority === "YELLOW" ? "reason-yellow" : "reason-gray";

    const card = document.createElement("div");
    card.className = `result-card ${cardClass}`;
    card.innerHTML = `
        ${makePriorityTag(priority)}
        <div class="card-sender">${escHtml(email.sender)}</div>
        <div class="card-subject">${escHtml(email.subject)}</div>
        <div class="card-reason ${reasonClass}">${escHtml(email.matchReason)}</div>
        <div class="card-footer">
            <span class="card-time">${formatCardTime(email.scannedAt)}</span>
            <button class="card-link" data-url="${escHtml(email.link)}">
                Open Email →
            </button>
        </div>
    `;
    return card;
}

function loadResults() {
    chrome.storage.local.get(["scannedEmails", "lastScanTime"], (data) => {
        hideAllStates();

        const emails   = data.scannedEmails || [];
        const lastTime = data.lastScanTime || 0;

        scanTime.textContent = formatAge(lastTime);

        const reds    = emails.filter(e => e.priority === "RED");
        const yellows = emails.filter(e => e.priority === "YELLOW");
        const grays   = emails.filter(e => e.priority === "GRAY");

        updateStats(reds.length, yellows.length, grays.length);

        const total = reds.length + yellows.length + grays.length;

        if (!total) {
            stateEmpty.classList.remove("hidden");
            [secRed, secYellow, secGray].forEach(s => s.classList.add("hidden"));
            return;
        }

        // RED section
        if (reds.length) {
            secRed.classList.remove("hidden");
            listRed.innerHTML = "";
            cntRed.textContent = reds.length;
            reds.forEach(e => listRed.appendChild(makeCard(e)));
        } else {
            secRed.classList.add("hidden");
        }

        // YELLOW section
        if (yellows.length) {
            secYellow.classList.remove("hidden");
            listYellow.innerHTML = "";
            cntYellow.textContent = yellows.length;
            yellows.forEach(e => listYellow.appendChild(makeCard(e)));
        } else {
            secYellow.classList.add("hidden");
        }

        // GRAY section (collapsed by default)
        if (grays.length) {
            secGray.classList.remove("hidden");
            listGray.innerHTML = "";
            cntGray.textContent = grays.length;
            grays.forEach(e => listGray.appendChild(makeCard(e)));
        } else {
            secGray.classList.add("hidden");
        }
    });
}

// ===================== OPEN EMAIL LINKS =====================
// Use chrome.tabs.create() — more reliable than anchor tags in extension popups

document.addEventListener("click", (e) => {
    const btn = e.target.closest(".card-link");
    if (!btn) return;
    e.preventDefault();
    const url = btn.getAttribute("data-url");
    if (url && url.startsWith("http") && url !== "https://mail.google.com") {
        chrome.tabs.create({ url });
    } else {
        // Fallback: focus existing Gmail tab
        chrome.tabs.query({ url: "https://mail.google.com/*" }, (tabs) => {
            if (tabs?.length) chrome.tabs.update(tabs[0].id, { active: true });
        });
    }
});

// ===================== BADGE (inbox count) =====================

function setBadge(count) {
    if (count > 0) {
        chrome.action.setBadgeText({ text: String(count) });
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    } else {
        chrome.action.setBadgeText({ text: "" });
    }
}

// ===================== INIT =====================

loadProfile();
loadResults();     // pre-load from cache immediately
showPanel("profile");
