console.log("Placify Background Running 🚀");

// ================= ACTIVE =================

let activeNotifications = {};

// ================= SHOW =================

function showNotification(id, title, message, link) {

    activeNotifications[id] = { link };

    chrome.notifications.create(

        id,

        {
            type: "basic",
            iconUrl: "logo.png",
            title: title,
            message: message,
            priority: 2,
            requireInteraction: true
        }
    );
}

// ================= CLEAR =================

function clearNotification(id) {

    chrome.notifications.clear(id);

    delete activeNotifications[id];
}

// ================= MESSAGE =================

chrome.runtime.onMessage.addListener(

    (message) => {

        // SHOW
        if (message.type === "show-notification") {

            showNotification(
                message.id,
                message.title,
                message.message,
                message.link
            );
        }

        // CLEAR
        if (message.type === "clear-notification") {

            clearNotification(message.id);
        }
    }
);

// ================= CLICK =================

chrome.notifications.onClicked.addListener(

    (notificationId) => {

        const data = activeNotifications[notificationId];

        if (data && data.link) {

            chrome.tabs.create({ url: data.link });
        }
    }
);
