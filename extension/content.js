console.log("Placify AI Loaded 🚀");

// ===================== KEYWORDS =====================

const PRIMARY_KEYWORDS = [
    "internship", "placement drive", "campus recruitment",
    "on-campus", "on campus", "hiring", "shortlisted", "shortlist",
    "selected", "selection list", "congratulations", "offer letter",
    "pre-placement offer", "PPO", "aptitude test", "coding test",
    "interview", "neo id", "dream internship", "regular internship",
    "summer internship", "last date for registration", "eligible branches",
    "campus drive", "placement offer", "dream company", "regular company"
];

// These mark a RESULT email (selection list), NOT an opportunity.
// Goes RED if user is personally mentioned, NONE otherwise.
const ANNOUNCEMENT_KEYWORDS = [
    "congratulations",
    "selection list",
    "selected students",
    "selected candidates",
    "shortlisted students",
    "shortlisted candidates"
];

// ===================== TRUSTED SENDERS =====================

const TRUSTED_SENDER_EMAILS = [
    "vitianscdc2027@vitstudent.ac.in",
    "23bci@vitstudent.ac.in",
    "cdc@vit.ac.in",
    "noreply+cdc@vitstudent.ac.in"
];

const TRUSTED_SENDER_KEYWORDS = [
    "cdc", "placement", "career development",
    "vitstudent", "vit.ac.in", "recruitment helpdesk"
];

// ALL-CAPS abbreviations (IT, ECE, CSE …) are matched case-sensitively as whole
// words to prevent false positives from "with", "digital", "submit", etc.
const BRANCH_VARIANTS = {
    "Computer Science & Engineering (CSE)": ["CSE", "computer science", "c.s.e"],
    "Information Technology (IT)": ["IT", "information technology"],
    "Electronics & Communication (ECE)": ["ECE", "electronics and communication", "electronics & communication"],
    "Electrical & Electronics (EEE)": ["EEE", "electrical and electronics", "electrical & electronics"],
    "Mechanical Engineering": ["MECH", "mechanical engineering", "mechanical engg"],
    "Civil Engineering": ["civil engineering"],
    "Chemical Engineering": ["chemical engineering"],
    "Biotechnology": ["biotech", "biotechnology"],
    "Electronics & Instrumentation": ["electronics & instrumentation"],
    "Embedded Systems": ["embedded systems"],
    "VLSI Design": ["VLSI", "vlsi design"],
    "Bioinformatics": ["bioinformatics"],
    "Biomedical Engineering": ["biomedical engineering", "BME"]
};

const DEGREE_VARIANTS = {
    "B.Tech": ["b.tech", "btech", "b tech", "ug", "undergraduate", "bachelor of technology"],
    "M.Tech": ["m.tech", "mtech", "m tech", "pg", "postgraduate", "master of technology"],
    "MCA": ["mca"],
    "MBA": ["mba"]
};

// ===================== IN-BODY HIGHLIGHT STYLES =====================
// Color legend (shown as tooltip on every highlighted span):
//   🔴 red    — User's personal identifier (Neo ID / Reg No / Name)
//   🟡 yellow — User's matched branch or degree in the email
//   🟠 orange — CGPA / percentage requirement the user must meet
//   🟢 green  — Registration deadline ("Last date...")

const BODY_HIGHLIGHT_STYLES = {
    red: "background:rgba(239,68,68,0.35);border-radius:3px;padding:0 2px;font-weight:bold;",
    yellow: "background:rgba(245,158,11,0.28);border-radius:3px;padding:0 2px;",
    orange: "background:rgba(249,115,22,0.28);border-radius:3px;padding:0 2px;",
    green: "background:rgba(34,197,94,0.25);border-radius:3px;padding:0 2px;"
};

const BODY_HIGHLIGHT_LABELS = {
    red: "Your ID — you are shortlisted!",
    yellow: "Your branch / degree",
    orange: "CGPA requirement",
    green: "Registration deadline"
};

// ===================== STATE =====================

let userData = {};
let trackedIds = new Set();
let scanInProgress = false;
let lastScanTime = 0;
const SCAN_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// ===================== LOAD PROFILE =====================

function loadProfile() {
    return new Promise((resolve) => {
        chrome.storage.local.get(
            ["name", "regNo", "neoPat", "cgpa", "degree", "branch", "specialization", "whitelistedSenders"],
            (data) => {
                userData = data;
                console.log("Placify USER:", userData);
                resolve(data);
            }
        );
    });
}

// ===================== SENDER CHECK =====================

function isTrustedSender(senderText) {
    if (!senderText) return false;
    const s = senderText.toLowerCase();
    if (TRUSTED_SENDER_EMAILS.some(e => s.includes(e))) return true;
    if (TRUSTED_SENDER_KEYWORDS.some(k => s.includes(k))) return true;
    const whitelist = userData.whitelistedSenders || [];
    return whitelist.some(w => s.includes(w.toLowerCase()));
}

// ===================== CGPA EXTRACTION =====================

function extractCGPA(text) {
    const patterns = [
        /(\d+\.?\d*)\s*cgpa/i,
        /cgpa[^0-9]*(\d+\.?\d*)/i,
        /(\d{2})%\s*(or|\/|aggregate|above)/i
    ];
    for (const p of patterns) {
        const m = text.match(p);
        if (m) {
            let v = parseFloat(m[1]);
            if (v > 10) v = v / 10;
            if (v >= 0 && v <= 10) return v;
        }
    }
    return null;
}

// ===================== VARIANT MATCHING =====================

function variantInText(variant, originalText, lowerText) {
    // ALL-CAPS abbreviations: whole-word, case-sensitive (e.g. "IT", "ECE", "CSE")
    if (/^[A-Z]{2,8}$/.test(variant)) {
        return new RegExp(`\\b${variant}\\b`).test(originalText);
    }
    return lowerText.includes(variant.toLowerCase());
}

// ===================== BRANCH / DEGREE HELPERS =====================

function getUserBranchVariants() {
    const ub = userData.branch || "";
    const ubLow = ub.toLowerCase();
    for (const [branch, variants] of Object.entries(BRANCH_VARIANTS)) {
        if (branch.toLowerCase() === ubLow || variants.some(v => variantInText(v, ub, ubLow))) {
            return variants;
        }
    }
    return [];
}

function getUserDegreeVariants() {
    const ud = (userData.degree || "").toLowerCase();
    for (const [degree, variants] of Object.entries(DEGREE_VARIANTS)) {
        if (degree.toLowerCase() === ud || variants.some(v => ud.includes(v))) {
            return variants;
        }
    }
    return [];
}

// Returns 'MATCH' | 'FAIL' | 'NOT_MENTIONED'
// NOT_MENTIONED means the email doesn't specify a degree restriction → pass through.
function checkDegreeGate(text, t) {
    const mentionsAnyDegree = Object.values(DEGREE_VARIANTS).flat().some(v => t.includes(v));
    if (!mentionsAnyDegree) return "NOT_MENTIONED";

    const userVariants = getUserDegreeVariants();
    if (!userVariants.length) return "NOT_MENTIONED"; // user hasn't set a degree
    return userVariants.some(v => t.includes(v)) ? "MATCH" : "FAIL";
}

// Returns 'MATCH' | 'FAIL' | 'NOT_MENTIONED'
function checkBranchGate(text, t) {
    const mentionsAnyBranch = Object.values(BRANCH_VARIANTS).flat().some(v => variantInText(v, text, t));
    const isAllBranches = t.includes("all branch") || t.includes("all students") ||
        t.includes("open to all") || t.includes("all eligible");

    if (!mentionsAnyBranch && !isAllBranches) {
        // No specific branches found in snippet — don't fail, let open body scan decide.
        return "NOT_MENTIONED";
    }

    if (isAllBranches) return "MATCH";

    const userVariants = getUserBranchVariants();
    if (!userVariants.length) return "NOT_MENTIONED"; // user hasn't set a branch
    return userVariants.some(v => variantInText(v, text, t)) ? "MATCH" : "FAIL";
}

// ===================== PERSONAL MATCH =====================

// Returns { value, label } for the FIRST personal identifier found, or null.
function getPersonalMatchInfo(text) {
    const t = text.toLowerCase();
    // Neo ID is case-sensitive and alphanumeric — match as-is in original text
    if (userData.neoPat && userData.neoPat.length > 3 && text.includes(userData.neoPat))
        return { value: userData.neoPat, label: `Neo ID found: ${userData.neoPat}` };
    if (userData.regNo && userData.regNo.length > 3 && t.includes(userData.regNo.toLowerCase()))
        return { value: userData.regNo, label: `Reg. No. found: ${userData.regNo}` };
    if (userData.name && userData.name.length > 3 && t.includes(userData.name.toLowerCase()))
        return { value: userData.name, label: `Name found: "${userData.name}"` };
    return null;
}

// ===================== HIERARCHICAL EMAIL EVALUATION =====================
//
// Every email goes through a strict top-down gate sequence.
// The first gate to FAIL short-circuits the chain and determines final priority.
//
//  GATE 0 │ Trusted sender (CDC)?
//         │  NO  → NONE  (completely ignore)
//         │  YES → continue
//  GATE 1 │ Contains a placement keyword?
//         │  NO  → NONE  (CDC newsletter / event invite / spam)
//         │  YES → continue
//         │
//         ├─ Is it an ANNOUNCEMENT (selection list / congratulations)?
//         │     YES → RED PATH
//         │       GATE A │ User's ID / Reg No / Name in email body?
//         │               YES → RED   (you are shortlisted)
//         │               NO  → NONE  (result list, but not for you)
//         │
//         └─ Is it an OPPORTUNITY (drive / internship registration)?
//               GATE 2 │ Degree match?
//                       FAIL → GRAY  (from CDC, but wrong degree level)
//                       MATCH / NOT_MENTIONED → continue
//               GATE 3 │ Branch match?
//                       FAIL → GRAY  (right degree, wrong branch)
//                       MATCH / NOT_MENTIONED → continue
//               GATE 4 │ CGPA meets requirement?
//                       FAIL → GRAY  (right degree/branch, CGPA too low)
//                       PASS / NOT_STATED → YELLOW (eligible!)
//
// Returns: { priority, gateTrail, highlightTerms }
//   priority:       'RED' | 'YELLOW' | 'GRAY' | 'NONE'
//   gateTrail:      string[] — human-readable pass/fail log per gate
//   highlightTerms: [{ text, color, caseSensitive, wholeWord }]
//                   — terms to highlight when the email is opened

function evaluateEmail(sender, subject, snippet) {
    const text = `${subject} ${snippet}`;
    const t = text.toLowerCase();

    // ── GATE 0: Trusted Sender ─────────────────────────────────────────────────
    // Non-CDC emails are silently skipped. No matter how many placement keywords
    // they contain, we don't highlight them (avoids LinkedIn, company spam, etc.)
    if (!isTrustedSender(sender)) {
        return { priority: "NONE", gateTrail: [], highlightTerms: [] };
    }

    // ── GATE 1: Placement Keyword ──────────────────────────────────────────────
    // CDC sends newsletters, event invites, notices. We only continue if there's
    // a clear placement signal word in the subject or snippet.
    const matchedKeyword = PRIMARY_KEYWORDS.find(k => t.includes(k.toLowerCase()));
    if (!matchedKeyword) {
        return { priority: "NONE", gateTrail: ["CDC sender"], highlightTerms: [] };
    }

    const trail = ["CDC sender", `Keyword: "${matchedKeyword}"`];

    // ── BRANCH POINT: Announcement vs Opportunity ──────────────────────────────
    const isAnnouncement = ANNOUNCEMENT_KEYWORDS.some(k => t.includes(k));

    if (isAnnouncement) {
        // ── RED PATH ────────────────────────────────────────────────────────────
        // This is a result/selection email. Only relevant if user is named in it.
        const personal = getPersonalMatchInfo(text);
        if (personal) {
            trail.push(`${personal.label}`);
            return {
                priority: "RED",
                gateTrail: trail,
                highlightTerms: [{ text: personal.value, color: "red", caseSensitive: true }]
            };
        }
        // Announcement found but user not mentioned → not relevant
        trail.push("Your ID/Name not found in list");
        return { priority: "NONE", gateTrail: trail, highlightTerms: [] };
    }

    // ── OPPORTUNITY PATH (YELLOW / GRAY) ───────────────────────────────────────
    // Gates narrow from widest (degree) to most specific (CGPA).
    // GRAY means "from CDC, placement-related, but not for you".

    const highlightTerms = [];

    // ── GATE 2: Degree ─────────────────────────────────────────────────────────
    const degreeGate = checkDegreeGate(text, t);
    if (degreeGate === "FAIL") {
        return {
            priority: "GRAY",
            gateTrail: [...trail, `❌ Degree: email targets a different level (you are ${userData.degree || "unset"})`],
            highlightTerms: []
        };
    }
    if (degreeGate === "MATCH") {
        trail.push(`Degree: ${userData.degree}`);
        getUserDegreeVariants().forEach(v => {
            if (t.includes(v.toLowerCase()))
                highlightTerms.push({ text: v, color: "yellow", caseSensitive: false });
        });
    }
    // NOT_MENTIONED → no degree filter in this email, pass through silently

    // ── GATE 3: Branch ─────────────────────────────────────────────────────────
    const branchGate = checkBranchGate(text, t);
    if (branchGate === "FAIL") {
        return {
            priority: "GRAY",
            gateTrail: [...trail, `❌ Branch: ${userData.branch || "unset"} is not in the eligible list`],
            highlightTerms: []
        };
    }
    if (branchGate === "MATCH") {
        trail.push(`Branch: ${userData.branch}`);
        getUserBranchVariants().forEach(v => {
            const isCaps = /^[A-Z]{2,8}$/.test(v);
            if (variantInText(v, text, t))
                highlightTerms.push({ text: v, color: "yellow", caseSensitive: isCaps, wholeWord: isCaps });
        });
    }

    // ── GATE 4: CGPA ────────────────────────────────────────────────────────────
    const requiredCGPA = extractCGPA(t);
    const userCGPA = parseFloat(userData.cgpa) || 0;
    if (requiredCGPA !== null && userCGPA > 0 && userCGPA < requiredCGPA) {
        return {
            priority: "GRAY",
            gateTrail: [...trail, `❌ CGPA: required ≥ ${requiredCGPA}, yours is ${userCGPA}`],
            highlightTerms: []
        };
    }
    if (requiredCGPA !== null) {
        trail.push(`CGPA ≥ ${requiredCGPA} (yours: ${userCGPA})`);
        // Highlight the CGPA phrase in the email body (orange)
        highlightTerms.push({ text: `${requiredCGPA}`, color: "orange", caseSensitive: false });
    }

    // ── ALL GATES PASSED → YELLOW ───────────────────────────────────────────────
    // Add the registration deadline to in-body highlights (green).
    const deadlineMatch = text.match(/last date[^.\n]*/i);
    if (deadlineMatch)
        highlightTerms.push({ text: deadlineMatch[0].trim(), color: "green", caseSensitive: false });

    return { priority: "YELLOW", gateTrail: trail, highlightTerms };
}

// ===================== MATCH REASON (for popup display) =====================

function buildReason(gateTrail, priority) {
    if (priority === "RED") {
        const hit = gateTrail.find(g => g.includes("Neo ID") || g.includes("Reg.") || g.includes("Name"));
        return `🎯 ${hit || "Personal match found"}`;
    }
    if (priority === "YELLOW") {
        const passed = gateTrail.filter(g => g.startsWith("✅")).slice(1); // skip "CDC sender"
        return passed.length ? `✅ ${passed.join(" · ")}` : "Matches placement criteria";
    }
    if (priority === "GRAY") {
        const failed = gateTrail.find(g => g.startsWith("❌"));
        return `⚠️ ${failed || "Not eligible for you"}`;
    }
    return "";
}

// ===================== DOM HELPERS =====================

function getSender(row) {
    const el = row.querySelector(".yP, .zF");
    if (el) return (el.getAttribute("name") || el.getAttribute("email") || el.innerText || "").trim();
    const emailEl = row.querySelector("[email]");
    return emailEl ? (emailEl.getAttribute("email") || "").trim() : "";
}

function getSubject(row) {
    const el = row.querySelector(".bog, .bqe");
    return el ? el.innerText.trim() : "";
}

function getSnippet(row) {
    const el = row.querySelector(".y2");
    return el ? el.innerText.trim() : "";
}

function getMailLink(row) {
    const links = Array.from(row.querySelectorAll("a[href*='#']"));
    const threadLink = links.find(a => {
        const hashPart = (a.href.split("#")[1] || "");
        const segments = hashPart.split("/");
        return segments.length >= 2 && (segments[segments.length - 1] || "").length > 10;
    });
    if (threadLink) return threadLink.href;
    if (links.length > 0)
        return links.reduce((best, a) => a.href.length > best.href.length ? a : best).href;
    return "https://mail.google.com";
}

// ===================== HIGHLIGHT ROW =====================

function highlightRow(row, priority, unread) {
    row.style.transition = "all 0.3s ease";

    if (priority === "RED") {
        row.style.background = "linear-gradient(90deg, #2d0000, #1a0a0a)";
        row.style.borderLeft = "5px solid #ef4444";
        row.style.boxShadow = "0 0 14px rgba(239,68,68,0.35)";
        row.style.opacity = "1";
        row.style.filter = "none";

    } else if (priority === "YELLOW") {
        if (unread) {
            row.style.background = "linear-gradient(90deg, #1c1500, #100f00)";
            row.style.borderLeft = "5px solid #f59e0b";
            row.style.boxShadow = "0 0 10px rgba(245,158,11,0.25)";
        } else {
            row.style.borderLeft = "3px solid rgba(245,158,11,0.45)";
            row.style.opacity = "0.8";
        }
        row.style.filter = "none";

    } else if (priority === "GRAY") {
        // From CDC, placement-related, but this student is not eligible.
        // Visible but clearly dimmed so it doesn't compete with real opportunities.
        row.style.borderLeft = "3px solid rgba(148,163,184,0.5)";
        row.style.opacity = "0.48";
        row.style.filter = "grayscale(0.35)";
    }
}

// ===================== IN-BODY HIGHLIGHTING =====================
//
// Called every time the user opens (clicks) an email in Gmail.
// Scans the rendered email body for placement-relevant terms and wraps
// each match in a <mark> span with a colored background and tooltip.
//
// What gets highlighted:
//   🔴 red    — User's own identifiers (Neo ID, Reg No, Name)
//   🟡 yellow — User's branch and degree as they appear in the email
//   🟠 orange — CGPA / percentage requirement
//   🟢 green  — Registration deadline ("Last date for registration: …")
//
// The function is idempotent: a second call on the same body element is a no-op
// (guarded by data-placify-highlighted attribute).

function buildBodyHighlightTerms(text) {
    const t = text.toLowerCase();
    const terms = [];

    // 1. RED — Personal identifiers (highest priority, rendered most prominently)
    if (userData.neoPat && userData.neoPat.length > 3 && text.includes(userData.neoPat))
        terms.push({ text: userData.neoPat, color: "red", caseSensitive: true, wholeWord: false });

    if (userData.regNo && userData.regNo.length > 3 && t.includes(userData.regNo.toLowerCase()))
        terms.push({ text: userData.regNo, color: "red", caseSensitive: false, wholeWord: false });

    if (userData.name && userData.name.length > 3 && t.includes(userData.name.toLowerCase()))
        terms.push({ text: userData.name, color: "red", caseSensitive: false, wholeWord: false });

    // 2. YELLOW — User's branch variants as they appear in the email
    getUserBranchVariants().forEach(v => {
        const isCaps = /^[A-Z]{2,8}$/.test(v);
        if (variantInText(v, text, t))
            terms.push({ text: v, color: "yellow", caseSensitive: isCaps, wholeWord: isCaps });
    });

    // 3. YELLOW — User's degree variants (e.g. "M.Tech", "B.Tech")
    getUserDegreeVariants().forEach(v => {
        if (t.includes(v.toLowerCase()))
            terms.push({ text: v, color: "yellow", caseSensitive: false, wholeWord: false });
    });

    // 4. ORANGE — CGPA / percentage requirement phrase (e.g. "7.5 CGPA", "75%")
    const cgpaPhrase = text.match(/\d+\.?\d*\s*(cgpa|%)[^\n,]*/i);
    if (cgpaPhrase)
        terms.push({ text: cgpaPhrase[0].trim(), color: "orange", caseSensitive: false, wholeWord: false });

    // 5. GREEN — Registration deadline line (e.g. "Last date for registration: 04th June …")
    const deadlineLine = text.match(/last date[^.\n]*/i);
    if (deadlineLine)
        terms.push({ text: deadlineLine[0].trim(), color: "green", caseSensitive: false, wholeWord: false });

    return terms;
}

// Walks text nodes inside `container` and wraps matched strings with <mark> spans.
// Sorts by descending length first so longer phrases take priority over substrings.
function injectHighlights(container, terms) {
    if (!terms.length) return;

    // Longest match first prevents a short term from breaking a longer one
    const sorted = [...terms].sort((a, b) => b.text.length - a.text.length);

    // Collect all text nodes up-front (walker is invalidated once we mutate DOM)
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
        // Skip nodes already inside a Placify <mark>
        if (!node.parentElement.closest("mark[data-placify]")) textNodes.push(node);
    }

    textNodes.forEach(textNode => {
        let html = escapeHtml(textNode.textContent);
        let modified = false;

        sorted.forEach(({ text, color, caseSensitive, wholeWord }) => {
            const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
            const flags = caseSensitive ? "g" : "gi";
            const regex = new RegExp(`(${pattern})`, flags);

            if (regex.test(html)) {
                html = html.replace(
                    regex,
                    `<mark data-placify="${color}" ` +
                    `title="Placify: ${BODY_HIGHLIGHT_LABELS[color]}" ` +
                    `style="${BODY_HIGHLIGHT_STYLES[color]}">$1</mark>`
                );
                modified = true;
            }
        });

        if (modified) {
            const wrapper = document.createElement("span");
            wrapper.innerHTML = html;
            textNode.parentNode.replaceChild(wrapper, textNode);
        }
    });
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// Main entry point for in-body highlights. Safe to call speculatively —
// returns early if body isn't rendered yet or was already processed.
function highlightEmailBody() {
    const bodyEl = document.querySelector(".a3s.aiL, .ii.gt");
    if (!bodyEl) return;
    if (bodyEl.dataset.placifyHighlighted === "true") return; // idempotent

    const fullText = bodyEl.innerText || "";
    if (!fullText.trim()) return;

    const terms = buildBodyHighlightTerms(fullText);
    if (!terms.length) return;

    injectHighlights(bodyEl, terms);
    bodyEl.dataset.placifyHighlighted = "true";
    console.log(`Placify: highlighted ${terms.length} term(s) in email body.`);
}

// ===================== SCAN LIST VIEW =====================

function scanListView() {
    const results = [];

    let rows = document.querySelectorAll("tr.zA");
    if (!rows.length) rows = document.querySelectorAll("tr[jsmodel], tr[data-thread-id]");
    if (!rows.length) rows = document.querySelectorAll("tr");

    console.log(`Placify: found ${rows.length} candidate rows`);

    rows.forEach((row, idx) => {
        try {
            const sender = getSender(row);
            const subject = getSubject(row);
            const snippet = getSnippet(row);

            if (!subject) return; // skip UI chrome rows

            if (idx < 8) console.log(`Placify row[${idx}] sender="${sender}" subject="${subject.slice(0, 60)}"`);

            const { priority, gateTrail, highlightTerms } = evaluateEmail(sender, subject, snippet);

            if (idx < 8) console.log(`  → priority=${priority}`, gateTrail);
            if (priority === "NONE") return;

            const unread = row.classList.contains("zE");
            highlightRow(row, priority, unread);

            const id = `placify-${idx}-${subject.slice(0, 20)}`;
            results.push({
                id,
                sender: sender.slice(0, 60),
                subject: subject.slice(0, 100),
                snippet: snippet.slice(0, 150),
                priority,
                unread,
                link: getMailLink(row),
                matchReason: buildReason(gateTrail, priority),
                gateTrail,          // full gate audit trail for debugging
                highlightTerms,     // stored so body highlighter can reuse them
                scannedAt: Date.now()
            });

            if (priority === "RED" && !trackedIds.has(id)) {
                trackedIds.add(id);
                chrome.runtime.sendMessage({
                    type: "show-notification",
                    id,
                    title: `🎉 You may be shortlisted! — ${sender.slice(0, 40)}`,
                    message: subject,
                    link: getMailLink(row)
                });
            }

        } catch (err) {
            console.log("Placify row error:", err);
        }
    });

    return results;
}

// ===================== SCAN OPEN EMAIL BODY =====================
// Runs whenever an email is opened. Does two things:
//   1. Injects in-body highlights (for ALL placement emails, not just personal)
//   2. Checks for personal match in full body text (subject/snippet may be truncated)

function checkOpenEmailBody() {
    highlightEmailBody(); // always attempt highlights when email is open

    const bodyEl = document.querySelector(".a3s.aiL, .ii.gt");
    if (!bodyEl) return null;

    const text = bodyEl.innerText || "";
    if (!text.trim()) return null;

    const personal = getPersonalMatchInfo(text);
    if (!personal) return null;

    const subjectEl = document.querySelector(".hP");
    const subject = subjectEl ? subjectEl.innerText.trim() : "Placement Email";
    const id = "placify-open-body";

    if (!trackedIds.has(id)) {
        trackedIds.add(id);
        chrome.runtime.sendMessage({
            type: "show-notification",
            id,
            title: "🎉 You're Shortlisted!",
            message: subject,
            link: window.location.href
        });
    }

    return {
        id,
        subject,
        priority: "RED",
        sender: "Email Body Match",
        snippet: text.slice(0, 150),
        unread: false,
        link: window.location.href,
        matchReason: `🎯 ${personal.label}`,
        gateTrail: ["✅ Full body scan", `✅ ${personal.label}`],
        highlightTerms: [{ text: personal.value, color: "red", caseSensitive: true }],
        scannedAt: Date.now()
    };
}

// ===================== SAVE RESULTS =====================

function saveResults(results) {
    chrome.storage.local.set({ scannedEmails: results, lastScanTime: Date.now() }, () => {
        console.log(`Placify: saved ${results.length} results.`);
    });
}

// ===================== MAIN SCAN =====================

async function runScan() {
    if (scanInProgress) return;
    const now = Date.now();
    if (now - lastScanTime < SCAN_COOLDOWN) {
        console.log("Placify: scan skipped (cooldown).");
        return;
    }

    scanInProgress = true;
    lastScanTime = now;
    console.log("Placify: scanning...");

    await loadProfile();

    if (!userData.name && !userData.regNo && !userData.neoPat) {
        console.log("Placify: no profile saved — please fill in your profile first.");
        scanInProgress = false;
        return;
    }

    const listResults = scanListView();
    const bodyResult = checkOpenEmailBody();
    const all = bodyResult ? [bodyResult, ...listResults] : listResults;

    saveResults(all);
    scanInProgress = false;
}

async function forceScan() {
    lastScanTime = 0;
    await runScan();
}

// ===================== MESSAGE LISTENER =====================

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "scan-now") {
        forceScan().then(() => sendResponse({ ok: true }));
        return true;
    }
});

// ===================== URL CHANGE WATCHER =====================
// Gmail is a SPA: opening an email changes the URL hash from
// #inbox → #inbox/FMfcgzQbfzC... without a page reload.
// We watch for this transition to trigger in-body highlights
// without needing a full inbox re-scan.

let lastUrl = location.href;

function onUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;

    // Email open URLs look like: #inbox/FMfcg... or #sent/FMfcg...
    const isEmailOpen = /#[a-z]+\/[A-Za-z0-9]{10,}/.test(location.href);
    if (isEmailOpen) {
        // Small delay — Gmail needs ~500ms to finish rendering the email body DOM
        setTimeout(() => {
            highlightEmailBody();
            checkOpenEmailBody();
        }, 650);
    }
}

// ===================== MUTATION OBSERVER =====================

let observerDebounce = null;
let observerScanCount = 0;
const OBSERVER_MAX_SCANS = 5;

const observer = new MutationObserver(() => {
    onUrlChange(); // check URL on every DOM mutation (cheap)

    clearTimeout(observerDebounce);
    observerDebounce = setTimeout(() => {

        // Re-apply cached row highlights (fast — no storage write)
        chrome.storage.local.get(["scannedEmails"], (data) => {
            const cached = data.scannedEmails || [];
            if (cached.length) {
                document.querySelectorAll("tr.zA, tr[jsmodel]").forEach(row => {
                    const subject = getSubject(row);
                    const match = cached.find(e => e.subject === subject);
                    if (match) highlightRow(row, match.priority, row.classList.contains("zE"));
                });
            }
        });

        // Full re-scan if still under the observer limit
        if (observerScanCount < OBSERVER_MAX_SCANS) {
            const rowCount = document.querySelectorAll("tr.zA").length;
            if (rowCount > 0) {
                observerScanCount++;
                console.log(`Placify: MutationObserver scan #${observerScanCount} (${rowCount} rows)`);
                forceScan();
            }
        }

    }, 800);
});

// ===================== INIT =====================

async function init() {
    await loadProfile();
    const mainEl = document.querySelector("div[role='main']") || document.body;
    observer.observe(mainEl, { childList: true, subtree: true });

    chrome.storage.local.get(["lastScanTime"], (data) => {
        lastScanTime = data.lastScanTime || 0;
        runScan();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
