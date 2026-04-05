// 🔥 SUPABASE CONFIG (IMPORTANT)
const SUPABASE_URL = "https://ywdyzrnpbkcuepbtarya.supabase.co";
const SUPABASE_KEY = "sb_publishable_Pb1YvI6Szlzx1O_FcFbujQ_h3beD7a7"; // 👈 yaha apni key daal

// Buttons
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");

// ================= SAVE =================
saveBtn.onclick = async () => {

    const name = document.getElementById("name").value.trim();
    const regNo = document.getElementById("regNo").value.trim();
    const neoPat = document.getElementById("neoPat").value.trim();
    const cgpa = document.getElementById("cgpa").value.trim();
    const degree = document.getElementById("degree").value;

    if (!name || !regNo || !cgpa || !degree) {
        alert("Please fill all required fields");
        return;
    }

    const data = {
        name,
        regNo,
        neoPat,
        cgpa: parseFloat(cgpa),
        degree
    };

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?on_conflict=regNo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify(data)
        });

        let result = {};
        try {
            result = await res.json();
        } catch { }

        if (res.ok) {
            alert("Data saved successfully!");
        } else {
            alert("Error: " + JSON.stringify(result));
        }

    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
    }
};

// ================= FETCH (AUTO-FILL) =================
async function loadUser() {

    const regNo = document.getElementById("regNo").value.trim();
    if (!regNo) return;

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?regNo=eq.${regNo}`, {
            method: "GET",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });

        const data = await res.json();

        if (data.length > 0) {
            const user = data[0];

            document.getElementById("name").value = user.name || "";
            document.getElementById("neoPat").value = user.neoPat || "";
            document.getElementById("cgpa").value = user.cgpa || "";
            document.getElementById("degree").value = user.degree || "";
        }

    } catch (err) {
        console.error(err);
    }
}

// AUTO trigger
document.getElementById("regNo").addEventListener("blur", loadUser);

// ================= DELETE =================
clearBtn.onclick = async () => {

    const regNo = document.getElementById("regNo").value.trim();

    if (!regNo) {
        alert("Enter Register Number to delete");
        return;
    }

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?regNo=eq.${regNo}`, {
            method: "DELETE",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });

        if (res.ok) {
            alert("Data deleted successfully!");

            // clear UI
            document.getElementById("name").value = "";
            document.getElementById("regNo").value = "";
            document.getElementById("neoPat").value = "";
            document.getElementById("cgpa").value = "";
            document.getElementById("degree").value = "";

        } else {
            alert("Delete failed");
        }

    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
    }
};