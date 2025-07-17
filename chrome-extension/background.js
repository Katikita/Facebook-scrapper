/**
 * Facebook Group Scraper - Background Service Worker (Manifest V3 Safe)
 * Only includes service worker-safe code. No chrome.action.onClicked.
 */

// On extension install: set up context menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'scrapeFacebookGroup',
        title: 'Scrape this Facebook Group',
        contexts: ['page'],
        documentUrlPatterns: ['*://*.facebook.com/groups/*']
    });
});

// On browser startup (optional, can be used for future logic)
chrome.runtime.onStartup.addListener(() => {
    // Startup logic if needed
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'scrapeFacebookGroup') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'startScraping',
            webhookUrl: '' // Will need to be configured by popup
        });
    }
});

// Listen for downloadScrapedData message and trigger download
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadScrapedData') {
        console.log('Download message received', message.data); // Debug log
        const jsonString = JSON.stringify(message.data, null, 2);
        const url = 'data:application/json,' + encodeURIComponent(jsonString);
        chrome.downloads.download({
            url: url,
            filename: 'facebook-group-scrape.json',
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError);
            } else {
                console.log('Download started, ID:', downloadId);
            }
        });
        sendResponse && sendResponse({ success: true });
    }
});

// No usage of chrome.action.onClicked or any DOM/window/document code. 