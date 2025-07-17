/**
 * Facebook Group Scraper - Popup Script
 * Handles user interface interactions and coordinates scraping operations
 */

class PopupManager {
    constructor() {
        this.webhookUrl = '';
        this.isScraping = false;
        this.scrapedData = null; // Store scraped data
        this.init();
    }

    init() {
        this.loadWebhookUrl();
        this.bindEvents();
        this.checkCurrentTab();
    }

    bindEvents() {
        const scrapeButton = document.getElementById('scrapeButton');
        const webhookInput = document.getElementById('webhookUrl');
        const downloadJsonButton = document.getElementById('downloadJsonButton');

        scrapeButton.addEventListener('click', () => this.handleScrapeClick());
        webhookInput.addEventListener('input', (e) => this.handleWebhookInput(e));
        webhookInput.addEventListener('blur', () => this.saveWebhookUrl());
        downloadJsonButton.addEventListener('click', () => this.handleDownloadJsonScrape());
        downloadJsonButton.disabled = false; // Always enabled
    }

    async checkCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || !tab.url.includes('facebook.com/groups/')) {
                this.showError('Please navigate to a Facebook Group page');
                document.getElementById('scrapeButton').disabled = true;
            }
        } catch (error) {
            console.error('Error checking current tab:', error);
        }
    }

    loadWebhookUrl() {
        chrome.storage.sync.get(['webhookUrl'], (result) => {
            if (result.webhookUrl) {
                this.webhookUrl = result.webhookUrl;
                document.getElementById('webhookUrl').value = result.webhookUrl;
            }
        });
    }

    saveWebhookUrl() {
        const webhookInput = document.getElementById('webhookUrl');
        this.webhookUrl = webhookInput.value.trim();
        
        chrome.storage.sync.set({ webhookUrl: this.webhookUrl }, () => {
            console.log('Webhook URL saved');
        });
    }

    handleWebhookInput(event) {
        this.webhookUrl = event.target.value.trim();
    }

    async handleScrapeClick() {
        if (this.isScraping) return;

        this.startScraping();
    }

    async startScraping(downloadAfter = false) {
        this.isScraping = true;
        this.showLoading('Starting scraping...');
        
        const scrapeButton = document.getElementById('scrapeButton');
        const downloadJsonButton = document.getElementById('downloadJsonButton');
        scrapeButton.disabled = true;
        scrapeButton.textContent = '🔄 Scraping...';
        downloadJsonButton.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Sending message to tab:', tab.id, tab.url); // Debug log
            
            if (!tab.url || !tab.url.includes('facebook.com/groups/')) {
                throw new Error('Please navigate to a Facebook Group page');
            }

            // Send message to content script to start scraping
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'startScraping',
                webhookUrl: this.webhookUrl
            });

            if (response.success) {
                this.scrapedData = response.data; // Store scraped data
                this.showSuccess(`Successfully scraped ${response.data.posts.length} posts`);
                this.updateStats(response.data);
                downloadJsonButton.disabled = false; // Enable download button
                if (downloadAfter) {
                    this.handleDownloadJson();
                }
            } else {
                this.scrapedData = null;
                downloadJsonButton.disabled = false;
                throw new Error(response.error || 'Scraping failed');
            }

        } catch (error) {
            console.error('Scraping error:', error);
            this.showError(error.message || 'Failed to scrape data');
        } finally {
            this.isScraping = false;
            scrapeButton.disabled = false;
            scrapeButton.textContent = '🚀 Scrape Posts + Comments + Images';
        }
    }

    showLoading(message) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = `⏳ ${message}`;
        statusElement.className = 'status loading';
        statusElement.style.display = 'flex';
        
        // Hide stats while loading
        document.getElementById('stats').style.display = 'none';
    }

    showSuccess(message) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = `✅ ${message}`;
        statusElement.className = 'status success';
        statusElement.style.display = 'flex';
    }

    showError(message) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = `❌ ${message}`;
        statusElement.className = 'status error';
        statusElement.style.display = 'flex';
        
        // Hide stats on error
        document.getElementById('stats').style.display = 'none';
    }

    updateStats(data) {
        const statsElement = document.getElementById('stats');
        const postsCount = document.getElementById('postsCount');
        const commentsCount = document.getElementById('commentsCount');
        const imagesCount = document.getElementById('imagesCount');
        const duration = document.getElementById('duration');

        // Calculate totals
        const totalComments = data.posts.reduce((sum, post) => sum + post.comments.length, 0);
        const totalImages = data.posts.reduce((sum, post) => sum + post.images.length, 0);

        postsCount.textContent = data.posts.length;
        commentsCount.textContent = totalComments;
        imagesCount.textContent = totalImages;
        duration.textContent = `${data.metadata.scrapingDuration}ms`;

        statsElement.style.display = 'grid';
    }

    handleDownloadJson() {
        if (!this.scrapedData) return;
        const dataStr = JSON.stringify(this.scrapedData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'facebook-group-scrape.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    handleDownloadJsonScrape() {
        // Start scraping, then download as JSON when done
        if (this.isScraping) return;
        this.startScraping(true);
    }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scrapingProgress') {
        // Update progress in popup
        const statusElement = document.getElementById('status');
        statusElement.textContent = `⏳ ${message.message}`;
    }
});

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});

// Handle popup window focus to refresh status
window.addEventListener('focus', () => {
    // Check if we're still on a Facebook group page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('facebook.com/groups/')) {
            document.getElementById('scrapeButton').disabled = false;
        } else {
            document.getElementById('scrapeButton').disabled = true;
        }
    });
}); 