<<<<<<< HEAD
const SUPABASE_URL = "xxxx";
const SUPABASE_KEY = "xxxx"; 
=======
>>>>>>> 503ff36 (Updated Placify AI extension)

// ================= SUPABASE CONFIG =================

const SUPABASE_URL =
    "https://ywdyzrnpbkcuepbtarya.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_Pb1YvI6Szlzx1O_FcFbujQ_h3beD7a7";

// ================= BUTTONS =================

const saveBtn =
    document.getElementById("saveBtn");

const clearBtn =
    document.getElementById("clearBtn");

// ================= LOAD LOCAL STORAGE =================

window.onload = () => {

    chrome.storage.local.get(

        [

            "name",
            "regNo",
            "neoPat",
            "cgpa",
            "degree",
            "branch"

        ],

        (data) => {

            document.getElementById("name").value =
                data.name || "";

            document.getElementById("regNo").value =
                data.regNo || "";

            document.getElementById("neoPat").value =
                data.neoPat || "";

            document.getElementById("cgpa").value =
                data.cgpa || "";

            document.getElementById("degree").value =
                data.degree || "";

            document.getElementById("branch").value =
                data.branch || "";
        }
    );
};

// ================= SAVE =================

saveBtn.onclick = async () => {

    const name =
        document.getElementById("name")
            .value
            .trim();

    const regNo =
        document.getElementById("regNo")
            .value
            .trim();

    const neoPat =
        document.getElementById("neoPat")
            .value
            .trim();

    const cgpa =
        document.getElementById("cgpa")
            .value
            .trim();

    const degree =
        document.getElementById("degree")
            .value;

    const branch =
        document.getElementById("branch")
            .value;

    // ================= VALIDATION =================

    if (

        !name ||

        !regNo ||

        !cgpa ||

        !degree ||

        !branch

    ) {

        alert(
            "Please fill all required fields"
        );

        return;
    }

    // ================= SAVE LOCAL =================

    chrome.storage.local.set({

        name,
        regNo,
        neoPat,
        cgpa,
        degree,
        branch

    });

    const data = {

        name,
        regNo,
        neoPat,
        cgpa: parseFloat(cgpa),
        degree,
        branch
    };

    console.log("Saving started...");

    console.log(data);

    try {

        const res = await fetch(

            `${SUPABASE_URL}/rest/v1/users?on_conflict=regNo`,

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "apikey":
                        SUPABASE_KEY,

                    "Authorization":
                        `Bearer ${SUPABASE_KEY}`,

                    "Prefer":
                        "resolution=merge-duplicates"
                },

                body:
                    JSON.stringify(data)
            }
        );

        console.log(
            "STATUS:",
            res.status
        );

        const result =
            await res.text();

        console.log(
            "RESULT:",
            result
        );

        if (res.ok) {

            alert(
                "Profile Saved Successfully 🚀"
            );

        } else {

            alert(
                "SUPABASE ERROR:\n\n" +
                result
            );
        }

    } catch (err) {

        console.error(err);

        alert(
            "REAL ERROR:\n\n" +
            err.message
        );
    }
};

// ================= FETCH USER =================

async function loadUser() {

    const regNo =
        document.getElementById("regNo")
            .value
            .trim();

    if (!regNo)
        return;

    try {

        const res = await fetch(

            `${SUPABASE_URL}/rest/v1/users?regNo=eq.${regNo}`,

            {

                method: "GET",

                headers: {

                    "apikey":
                        SUPABASE_KEY,

                    "Authorization":
                        `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        const data =
            await res.json();

        if (data.length > 0) {

            const user =
                data[0];

            document.getElementById("name").value =
                user.name || "";

            document.getElementById("neoPat").value =
                user.neoPat || "";

            document.getElementById("cgpa").value =
                user.cgpa || "";

            document.getElementById("degree").value =
                user.degree || "";

            document.getElementById("branch").value =
                user.branch || "";

            chrome.storage.local.set({

                name:
                    user.name,

                regNo:
                    user.regNo,

                neoPat:
                    user.neoPat,

                cgpa:
                    user.cgpa,

                degree:
                    user.degree,

                branch:
                    user.branch
            });
        }

    } catch (err) {

        console.error(err);
    }
}

// ================= AUTO LOAD =================

document.getElementById("regNo")

    .addEventListener(

        "blur",

        loadUser
    );

// ================= CLEAR =================

clearBtn.onclick = async () => {

    const regNo =
        document.getElementById("regNo")
            .value
            .trim();

    if (!regNo) {

        alert(
            "Enter Register Number"
        );

        return;
    }

    try {

        const res = await fetch(

            `${SUPABASE_URL}/rest/v1/users?regNo=eq.${regNo}`,

            {

                method: "DELETE",

                headers: {

                    "apikey":
                        SUPABASE_KEY,

                    "Authorization":
                        `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        if (res.ok) {

            chrome.storage.local.clear();

            document.getElementById("name").value = "";

            document.getElementById("regNo").value = "";

            document.getElementById("neoPat").value = "";

            document.getElementById("cgpa").value = "";

            document.getElementById("degree").value = "";

            document.getElementById("branch").value = "";

            alert(
                "Profile Deleted ❌"
            );

        } else {

            alert(
                "Delete Failed"
            );
        }

    } catch (err) {

        console.error(err);

        alert(
            "Error:\n" + err.message
        );
    }
};
<<<<<<< HEAD
=======

>>>>>>> 503ff36 (Updated Placify AI extension)
