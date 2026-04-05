console.log("Placify background running 🚀");

// optional: jab extension install ho
chrome.runtime.onInstalled.addListener(() => {
    console.log("Placify installed successfully ✅");
});

// optional: jab tab change ho
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        console.log("Tab loaded:", tab.url);
    }
});