console.log("Placify running 🚀");

let activeFilter = "all";

let name = "", reg = "", neo = "", cgpa = 0, degree = "";

function getCategory(text) {
    if (text.includes("cdc") || text.includes("placement")) return "cdc";
    if (text.includes("unstop")) return "unstop";
    return "general";
}

function filterEmails() {

    const emails = document.querySelectorAll("tr.zA");

    emails.forEach(email => {

        const text = email.innerText.toLowerCase();
        const category = getCategory(text);

        email.style.background = "";
        email.style.display = "";
        email.style.color = "";

        if (activeFilter !== "all" && category !== activeFilter) {
            email.style.display = "none";
            return;
        }

        if (
            (name && text.includes(name)) ||
            (reg && text.includes(reg)) ||
            (neo && text.includes(neo))
        ) {
            email.style.background = "#1e3a8a";
            email.style.color = "white";
            return;
        }

        if (degree === "btech") {
            if (text.includes("mtech") || text.includes("pg")) {
                email.style.display = "none";
                return;
            }
        }

        if (!(
            text.includes("apply") ||
            text.includes("form") ||
            text.includes("link")
        )) return;

        let match = text.match(/(\d+(\.\d+)?)/);
        if (match) {
            let required = parseFloat(match[1]);
            if (required >= 5 && required <= 10) {
                if (cgpa < required) return;
            }
        }

        email.style.background = "linear-gradient(135deg, #1e3a8a, #1d4ed8)";
        email.style.color = "#e0f2fe";
    });
}

// FILTER BAR
function createFilterBar() {

    if (document.getElementById("placify-bar")) return;

    const bar = document.createElement("div");
    bar.id = "placify-bar";

    bar.style.position = "sticky";
    bar.style.top = "0";
    bar.style.zIndex = "9999";
    bar.style.display = "flex";
    bar.style.gap = "10px";
    bar.style.padding = "10px";
    bar.style.background = "#0f172a";

    const filters = ["all", "cdc", "unstop"];

    filters.forEach(f => {

        const btn = document.createElement("button");
        btn.innerText = f.toUpperCase();
        btn.dataset.type = f;

        btn.style.padding = "6px 14px";
        btn.style.border = "none";
        btn.style.borderRadius = "20px";
        btn.style.cursor = "pointer";

        btn.onclick = () => {
            activeFilter = f;
            updateButtons();
            filterEmails();
        };

        bar.appendChild(btn);
    });

    document.body.prepend(bar);
}

function updateButtons() {
    document.querySelectorAll("#placify-bar button").forEach(btn => {
        if (btn.dataset.type === activeFilter) {
            btn.style.background = "#1d4ed8";
            btn.style.color = "white";
        } else {
            btn.style.background = "#1f2937";
            btn.style.color = "#9ca3af";
        }
    });
}

chrome.storage.local.get(null, (data) => {

    name = (data.name || "").toLowerCase();
    reg = (data.regNo || "").toLowerCase();
    neo = (data.neoPat || "").toLowerCase();
    cgpa = parseFloat(data.cgpa || 0);
    degree = (data.degree || "").toLowerCase();

    createFilterBar();
    updateButtons();

    setInterval(filterEmails, 2500);
});