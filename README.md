# Placify – Privacy-First Campus Placement Assistant

Placify is a Chrome Extension designed to streamline the university placement process by intelligently filtering, highlighting, and prioritizing placement-related emails directly within Gmail.

Designed for campus environments, Placify acts as a personal inbox filter that instantly flags job opportunities and shortlist announcements matching your unique student profile.

---

## Architecture & Privacy Design

Placify has been engineered as a **100% local-only, privacy-first tool**. It does not make any external network requests, send data to remote servers, or use cloud databases. All processing and storage occur entirely within your browser sandbox.

### Privacy Safeguards
* **Zero Cloud Tracking:** All database logic (previously Supabase) has been completely removed.
* **Local Storage:** Your profile details and scan results are stored securely in Chrome's local storage (`chrome.storage.local`).
* **Offline Execution:** Email scanning and regex-based eligibility analysis are executed entirely on your machine.

---

## Hierarchical Gating Engine

To prevent inbox noise and false matches, Placify processes emails through a strict top-down gate architecture:

```
[ Gmail Inbox Row ]
        │
        ▼
[ GATE 0: Trusted Sender ] ──────► (Skip if not from a CDC address)
        │
        ▼
[ GATE 1: Placement Keyword ] ───► (Skip if no recruitment context found)
        │
        ▼
[ BRANCH: Announcement vs Opportunity ]
   ├── Announcement (Result List) ──► [ GATE A: Personal Match ] ──► 🔴 Shortlisted (RED)
   └── Opportunity (Job Post) ─────► [ GATE 2: Degree Gate ]
                                            │
                                            ▼
                                     [ GATE 3: Branch Gate ]
                                            │
                                            ▼
                                     [ GATE 4: CGPA Gate ] ─────► 🟡 Eligible (YELLOW)
                                            │
                                    (Any Gate Fails)
                                            │
                                            ▼
                                     ⚫ Not Eligible (GRAY)
```

### 1. Gate 0: Trusted Sender
Filter out generic newsletters, spam, and company promotional emails. Scanning is restricted to certified Career Development Centre (CDC) senders.

### 2. Gate 1: Placement Keyword
Scans for clear placement signals (e.g., `internship`, `hiring`, `PPO`, `coding test`) in the email subject or snippet before continuing.

### 3. Gate A: Personal Match (Announcements)
For result sheets or selection list emails, the engine runs a case-sensitive check on your unique **NeoPat ID**, **Register Number**, and **Full Name**. If a match is found, the email is prioritized as **RED (Shortlisted)**.

### 4. Gates 2–4: Opportunity Criteria (Opportunities)
Evaluates your eligibility across multiple dimensions. If all gates match, the email is prioritized as **YELLOW (Eligible)**. If a gate fails, the email is categorized as **GRAY (Not Eligible)**:
* **Degree Gate:** Matches against common degree formats (e.g., `B.Tech`, `M.Tech`, `MCA`).
* **Branch Gate:** Evaluates case-insensitive variants (e.g., `CSE`, `Computer Science`, `IT`). Uses case-sensitive matching for short abbreviations to prevent false matches (like matching `IT` in `"digital technology"`).
* **CGPA Gate:** Dynamically extracts the required minimum CGPA from the text and compares it to your own.

---

## User Interface & Features

### Chrome Extension Popup
* **Insightful Stats Bar:** Instantly see your counts for Shortlisted, Eligible, and Ineligible emails at a glance.
* **Collapsible GRAY Section:** Ineligible opportunity cards (GRAY) are collapsed by default in a separate section to keep the UI clean, showing you the exact reason they failed (e.g., `Branch ECE is not in the eligible list`).
* **Tabbed Navigation:** Clean, modern glassmorphism interface to switch between your **Profile** setup and your **Results** feed.
* **Direct Deep Linking:** Open individual emails directly in Gmail with a single click using secure browser navigation.

### In-Body Highlight Engine
When viewing an eligible email inside Gmail, Placify uses a secure DOM TreeWalker to overlay distinct, non-destructive highlights over key criteria:
* 🔴 **Red:** Your Name, Register Number, or NeoPat ID (confirming your selection).
* 🟡 **Yellow:** Branch & Degree requirements.
* 🟠 **Orange:** CGPA requirements (e.g., `CGPA >= 7.5`).
* 🟢 **Green:** Registration deadlines (e.g., `Last date for Registration`).

---

## Tech Stack
* **Frontend:** Vanilla HTML5, CSS3 (Custom properties, CSS variables, dark glassmorphism theme).
* **Extension Framework:** Manifest v3 (service workers, content scripts, local storage APIs).
* **Storage:** Local Chrome Storage (`chrome.storage.local`).

---

## Installation & Setup

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the `extension` directory of this project.
5. Open your profile inside the extension popup, fill out your student details (CGPA, Degree, Branch, NeoPat, Reg No), and click **Save Profile**.
6. Navigate to your Gmail tab and click **Scan Now** in the results tab of the extension to view categorized opportunities!
