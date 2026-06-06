<<<<<<< HEAD
console.log("Placify running");
=======
console.log("Placify AI Loaded 🚀");
>>>>>>> 503ff36 (Updated Placify AI extension)

// ================= USER =================

let userData = {};

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

        userData = data;

        console.log(
            "USER:",
            userData
        );
    }
);

// ================= TRACKED =================

let trackedMails = {};

// ================= KEYWORDS =================

const keywords = [

    "internship",
    "placement",
    "hiring",
    "career",
    "shortlist",
    "selection",
    "opportunity",
    "job"
];

// ================= FORMAT COMPANY =================

function formatCompany(name) {

    if (!name)
        return "Placify";

    name =

        name

            .replace(
                /-mail|-career|-jobs|-recruitment/gi,
                ""
            )

            .trim();

    return name

        .split(" ")

        .map(word =>

            word.charAt(0)
                .toUpperCase()

            +

            word.slice(1)
                .toLowerCase()

        )

        .join(" ");
}

// ================= GET COMPANY =================

function getCompany(mail) {

    // SENDER NAME

    const sender =

        mail.querySelector(".yP");

    if (

        sender &&

        sender.innerText.trim()

    ) {

        return formatCompany(

            sender.innerText.trim()
        );
    }

    // EMAIL DOMAIN

    const emailElement =

        mail.querySelector("[email]");

    if (emailElement) {

        const email =

            emailElement.getAttribute(
                "email"
            );

        if (email) {

            const domain =

                email.split("@")[1];

            if (domain) {

                return formatCompany(

                    domain
                        .split(".")[0]
                );
            }
        }
    }

    return "Placify";
}

// ================= GET MAIL LINK =================

function getMailLink(mail) {

    const link =

        mail.querySelector("a");

    if (

        link &&
        link.href

    ) {

        return link.href;
    }

    return "https://mail.google.com";
}

// ================= HIGHLIGHT =================

function highlightMail(mail) {

    mail.style.background =

        "linear-gradient(90deg,#001d5c,#22003d)";

    mail.style.borderLeft =

        "5px solid #00bfff";

    mail.style.boxShadow =

        "0 0 12px rgba(0,191,255,0.5)";

    mail.style.transition =
        "0.3s";
}

// ================= SCAN =================

function scanEmails() {

    const emails =
        document.querySelectorAll("tr");

    emails.forEach((mail, index) => {

        try {

            const text =
                mail.innerText.toLowerCase();

            // SUBJECT

            const subjectElement =

                mail.querySelector(".bog");

            const subject =

                subjectElement ?

                    subjectElement.innerText :

                    "Placement Alert";

            // COMPANY

            const company =
                getCompany(mail);

            // LINK

            const mailLink =
                getMailLink(mail);

            // UNREAD

            const isUnread =

                mail.classList.contains("zE");

            // USER MATCH

            const userMatch =

                (

                    userData.name &&

                    text.includes(

                        userData.name
                            .toLowerCase()

                    )

                )

                ||

                (

                    userData.regNo &&

                    text.includes(

                        userData.regNo
                            .toLowerCase()

                    )

                )

                ||

                (

                    userData.neoPat &&

                    text.includes(

                        userData.neoPat
                            .toLowerCase()

                    )

                );

            // KEYWORD

            const keywordMatch =

                keywords.some(keyword =>

                    text.includes(keyword)
                );

            // BRANCH

            let branchMatch = true;

            if (

                userData.branch &&

                text.includes("ece")

            ) {

                if (

                    !userData.branch
                        .toLowerCase()
                        .includes("ece")

                ) {

                    branchMatch = false;
                }
            }

            // DEGREE

            let degreeMatch = true;

            if (

                userData.degree &&

                text.includes("mtech")

            ) {

                if (

                    !userData.degree
                        .toLowerCase()
                        .includes("mtech")

                ) {

                    degreeMatch = false;
                }
            }

            // CGPA

            let cgpaMatch = true;

            let requiredCGPA = null;

            const cgpaText =

                text.match(

                    /cgpa[^0-9]*([0-9]+(\.[0-9]+)?)/i
                );

            if (cgpaText) {

                requiredCGPA =

                    parseFloat(
                        cgpaText[1]
                    );
            }

            if (

                requiredCGPA !== null &&

                userData.cgpa

            ) {

                cgpaMatch =

                    parseFloat(
                        userData.cgpa
                    )

                    >=

                    requiredCGPA;
            }

            // ELIGIBLE

            const eligible =

                keywordMatch &&

                branchMatch &&

                degreeMatch &&

                cgpaMatch;

            // ID

            const id =
                "placify-" + index;

            // SHOW

            if (

                isUnread &&

                (

                    eligible ||

                    userMatch

                )

            ) {

                if (
                    trackedMails[id]
                ) return;

                trackedMails[id] = true;

                // HIGHLIGHT

                highlightMail(mail);

                // NOTIFICATION

                chrome.runtime.sendMessage({

                    type:
                        "show-notification",

                    id:
                        id,

                    title:
                        `🚀 ${company}`,

                    message:
                        subject,

                    link:
                        mailLink
                });
            }

            // CLEAR

            if (

                !isUnread ||

                text.includes("applied") ||

                text.includes("submitted")

            ) {

                chrome.runtime.sendMessage({

                    type:
                        "clear-notification",

                    id:
                        id
                });
            }

        } catch (err) {

            console.log(
                "Placify Error:",
                err
            );
        }
    });
}

// ================= RUN =================

setInterval(() => {

    scanEmails();

<<<<<<< HEAD
    setInterval(filterEmails, 2500);
});
=======
}, 4000);
>>>>>>> 503ff36 (Updated Placify AI extension)
