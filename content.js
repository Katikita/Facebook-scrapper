/**
 * Facebook Group Scraper - Content Script
 * Handles DOM scraping of Facebook Group posts, comments, and images
 */

console.log('Facebook Group Scraper content script loaded');

class FacebookGroupScraper {
    constructor() {
        this.isScraping = false;
        this.init();
    }

    init() {
        this.bindMessageListener();
        console.log('Facebook Group Scraper: Content script loaded');
    }

    bindMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content script received message:', message); // Debug log
            if (message.action === 'startScraping') {
                this.handleScrapeRequest(message.webhookUrl, sendResponse)
                    .catch(error => {
                        // Ensure sendResponse is always called on error
                        sendResponse({
                            success: false,
                            error: error.message || 'Unknown error'
                        });
                    });
                return true; // Keep channel open for async sendResponse
            }
        });
    }

    async handleScrapeRequest(webhookUrl, sendResponse) {
        if (this.isScraping) {
            sendResponse({ success: false, error: 'Scraping already in progress' });
            return;
        }

        this.isScraping = true;
        const startTime = Date.now();

        try {
            if (!this.isFacebookGroupPage()) {
                sendResponse({ success: false, error: 'Not on a Facebook Group page' });
                this.isScraping = false;
                return;
            }

            const scrapedData = await this.scrapeVisiblePosts();
            const validationErrors = this.validateScrapedData(scrapedData);
            if (validationErrors.length > 0) {
                sendResponse({ success: false, error: `Data validation failed: ${validationErrors.join(', ')}` });
                this.isScraping = false;
                return;
            }

            // If webhookUrl is blank, skip sending to webhook and only download
            if (!webhookUrl) {
                chrome.runtime.sendMessage({
                    action: 'downloadScrapedData',
                    data: scrapedData
                });
                sendResponse({
                    success: true,
                    data: scrapedData
                });
                this.isScraping = false;
                return;
            }

            // If webhookUrl is valid, send to webhook as before
            const isValidWebhook = webhookUrl.startsWith('http://') || webhookUrl.startsWith('https://');
            let webhookResult = { success: true };
            if (isValidWebhook) {
                webhookResult = await this.sendToWebhook(scrapedData, webhookUrl);
            }

            chrome.runtime.sendMessage({
                action: 'downloadScrapedData',
                data: scrapedData
            });

            if (webhookResult.success) {
                const duration = Date.now() - startTime;
                scrapedData.metadata.scrapingDuration = duration;
                sendResponse({
                    success: true,
                    data: scrapedData,
                    webhookResponse: webhookResult.data
                });
            } else {
                sendResponse({
                    success: false,
                    error: `Webhook failed: ${webhookResult.error}`
                });
            }
        } catch (error) {
            console.error('Scraping error:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        } finally {
            this.isScraping = false;
        }
    }

    isFacebookGroupPage() {
        return window.location.href.includes('facebook.com/groups/');
    }

    async scrapeVisiblePosts() {
        const startTime = Date.now();
        
        // Wait for any dynamic content to load
        await this.waitForContent();

        const posts = [];
        const postElements = this.getPostElements();

        console.log(`Found ${postElements.length} post elements`);

        for (let i = 0; i < postElements.length; i++) {
            try {
                const postData = this.extractPostData(postElements[i]);
                if (postData && this.hasValidContent(postData)) {
                    posts.push(postData);
                }
                
                // Update progress
                this.updateProgress(`Scraping post ${i + 1}/${postElements.length}`);
                
            } catch (error) {
                console.error(`Error scraping post ${i}:`, error);
            }
        }

        const groupInfo = this.extractGroupInfo();
        
        return {
            timestamp: new Date().toISOString(),
            groupUrl: window.location.href,
            groupName: groupInfo.name,
            groupId: groupInfo.id,
            posts: posts,
            metadata: {
                totalPosts: posts.length,
                totalComments: posts.reduce((sum, post) => sum + post.comments.length, 0),
                totalImages: posts.reduce((sum, post) => sum + post.images.length, 0),
                scrapingDuration: Date.now() - startTime
            }
        };
    }

    async waitForContent() {
        // Wait for posts to be visible
        return new Promise((resolve) => {
            const checkContent = () => {
                const posts = this.getPostElements();
                if (posts.length > 0) {
                    resolve();
                } else {
                    setTimeout(checkContent, 500);
                }
            };
            checkContent();
        });
    }

    getPostElements() {
        // Multiple selectors to catch different Facebook layouts
        const selectors = [
            '[data-testid="post_container"]',
            '[data-ad-preview="message"]',
            'div[role="article"]',
            '.userContent'
        ];

        let elements = [];
        for (const selector of selectors) {
            elements = document.querySelectorAll(selector);
            if (elements.length > 0) break;
        }

        return Array.from(elements);
    }

    extractPostData(postElement) {
        try {
            const postId = this.extractPostId(postElement);
            const text = this.extractPostText(postElement);
            const comments = this.extractVisibleComments(postElement);
            const images = this.extractImageUrls(postElement);
            const timestamp = this.extractTimestamp(postElement);
            const author = this.extractAuthor(postElement);

            return {
                postId: postId,
                text: text,
                comments: comments,
                images: images,
                timestamp: timestamp,
                author: author
            };
        } catch (error) {
            console.error('Error extracting post data:', error);
            return null;
        }
    }

    extractPostId(postElement) {
        // Try multiple methods to extract post ID
        const selectors = [
            '[data-testid="post_id"]',
            'a[href*="/permalink/"]',
            'a[href*="/posts/"]'
        ];

        for (const selector of selectors) {
            const element = postElement.querySelector(selector);
            if (element) {
                const href = element.href;
                const match = href.match(/\/(\d+)/);
                if (match) return match[1];
            }
        }

        // Fallback: generate ID from content hash
        const content = postElement.textContent || '';
        return this.hashCode(content).toString();
    }

    extractPostText(postElement) {
        const selectors = [
            '[data-ad-preview="message"]',
            '[data-testid="post_message"]',
            '.userContent',
            '[dir="auto"]'
        ];

        for (const selector of selectors) {
            const element = postElement.querySelector(selector);
            if (element) {
                const text = element.textContent.trim();
                if (text && text.length > 0) {
                    return text;
                }
            }
        }

        return '';
    }

    extractVisibleComments(postElement) {
        const comments = [];
        const commentSelectors = [
            '[aria-label="Comment"]',
            '[data-testid="comment"]',
            '.UFIReplyLink'
        ];

        for (const selector of commentSelectors) {
            const commentElements = postElement.querySelectorAll(selector);
            commentElements.forEach(comment => {
                const commentText = comment.textContent.trim();
                if (commentText && commentText.length > 0) {
                    comments.push(commentText);
                }
            });
        }

        return comments;
    }

    extractImageUrls(postElement) {
        const images = [];
        const imgElements = postElement.querySelectorAll('img');

        imgElements.forEach(img => {
            if (img.src && this.isFacebookImage(img.src)) {
                images.push(img.src);
            }
        });

        return images;
    }

    isFacebookImage(src) {
        return src.includes('scontent') || 
               src.includes('fbcdn.net') || 
               src.includes('facebook.com');
    }

    extractTimestamp(postElement) {
        const timeSelectors = [
            'time',
            '[data-testid="post_timestamp"]',
            'abbr[title]'
        ];

        for (const selector of timeSelectors) {
            const element = postElement.querySelector(selector);
            if (element) {
                const timestamp = element.getAttribute('datetime') || 
                                 element.getAttribute('title') ||
                                 element.textContent;
                if (timestamp) {
                    return new Date(timestamp).toISOString();
                }
            }
        }

        return new Date().toISOString();
    }

    extractAuthor(postElement) {
        const authorSelectors = [
            'a[data-testid="post_author"]',
            'a[href*="/profile.php"]',
            'a[href*="/profile/"]'
        ];

        for (const selector of authorSelectors) {
            const element = postElement.querySelector(selector);
            if (element) {
                return element.textContent.trim();
            }
        }

        return 'Unknown';
    }

    extractGroupInfo() {
        // Try to extract group name and ID from the page
        const groupNameSelectors = [
            'h1',
            '[data-testid="group_name"]',
            '.groupHeaderName'
        ];

        let groupName = 'Unknown Group';
        for (const selector of groupNameSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                groupName = element.textContent.trim();
                break;
            }
        }

        // Extract group ID from URL
        const urlMatch = window.location.href.match(/groups\/(\d+)/);
        const groupId = urlMatch ? urlMatch[1] : 'unknown';

        return { name: groupName, id: groupId };
    }

    hasValidContent(postData) {
        return postData.text.length > 0 || 
               postData.comments.length > 0 || 
               postData.images.length > 0;
    }

    validateScrapedData(data) {
        const errors = [];

        if (!data.posts || !Array.isArray(data.posts)) {
            errors.push('Posts array is missing or invalid');
        }

        if (!data.groupUrl || !data.groupUrl.includes('facebook.com/groups/')) {
            errors.push('Invalid group URL');
        }

        if (data.posts.length === 0) {
            errors.push('No posts found to scrape');
        }

        return errors;
    }

    async sendToWebhook(data, webhookUrl) {
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Facebook-Group-Scraper-Extension/1.0'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return { success: true, data: result };
        } catch (error) {
            console.error('Webhook error:', error);
            return { success: false, error: error.message };
        }
    }

    updateProgress(message) {
        chrome.runtime.sendMessage({
            action: 'scrapingProgress',
            message: message
        });
    }

    hashCode(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
}

// Initialize the scraper when the content script loads
new FacebookGroupScraper(); 