/**
 * Facebook Group Scraper - Content Script
 * Handles DOM scraping of Facebook Group posts, comments, and images
 */

console.log('Facebook Group Scraper content script loaded');

class FacebookGroupScraper {
    constructor() {
        this.isScraping = false;
        this.selectedPostsMap = new Map(); // Persist selected post data
        this.init();
    }

    init() {
        this.bindMessageListener();
        this.injectSelectionUI(); // Add selection UI on load
        this.observeNewPosts(); // Watch for new posts loaded dynamically
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
        // Use only the most reliable selector for Facebook posts
        return Array.from(document.querySelectorAll('div[role="article"]'));
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
        // Find all comment containers inside the post
        const commentContainers = postElement.querySelectorAll('div[aria-label="Comment"], div[role="article"]');
        commentContainers.forEach(container => {
            // Find the deepest span with text (usually the comment text)
            const spans = container.querySelectorAll('span[dir="auto"]');
            spans.forEach(span => {
                const commentText = span.textContent.trim();
                if (commentText && !comments.includes(commentText)) {
                    comments.push(commentText);
                }
            });
        });
        return comments;
    }

    extractImageUrls(postElement) {
        const images = [];
        // Collect <img> tags
        const imgElements = postElement.querySelectorAll('img');
        imgElements.forEach(img => {
            if (img.src && this.isFacebookImage(img.src)) {
                images.push(img.src);
            }
        });
        // Also check for images in background-image styles
        const bgElements = postElement.querySelectorAll('[style*="background-image"]');
        bgElements.forEach(el => {
            const bg = el.style.backgroundImage;
            const match = bg && bg.match(/url\(["']?(.*?)["']?\)/);
            if (match && match[1] && this.isFacebookImage(match[1])) {
                images.push(match[1]);
            }
        });
        // Remove duplicates
        return [...new Set(images)];
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

    injectSelectionUI() {
        // Add checkboxes to each post
        const postElements = this.getPostElements();
        postElements.forEach(post => {
            if (!post.querySelector('.fb-scraper-checkbox')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'fb-scraper-checkbox';
                checkbox.style.position = 'absolute';
                checkbox.style.top = '8px';
                checkbox.style.left = '8px';
                checkbox.style.zIndex = '9999';
                // Restore checked state if already selected
                const postId = this.extractPostId(post);
                if (this.selectedPostsMap.has(postId)) {
                    checkbox.checked = true;
                    post.classList.add('fb-scraper-selected');
                }
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        post.classList.add('fb-scraper-selected');
                        // Scrape and store post data immediately
                        try {
                            const postData = this.extractPostData(post);
                            if (postData && this.hasValidContent(postData)) {
                                this.selectedPostsMap.set(postData.postId, postData);
                            }
                        } catch (err) {
                            console.error('Error scraping selected post:', err);
                        }
                    } else {
                        post.classList.remove('fb-scraper-selected');
                        // Remove from map
                        this.selectedPostsMap.delete(postId);
                    }
                });
                post.style.position = 'relative';
                post.prepend(checkbox);
            }
        });
        // Add floating scrape button if not present
        if (!document.getElementById('fb-scraper-scrape-selected')) {
            const btn = document.createElement('button');
            btn.id = 'fb-scraper-scrape-selected';
            btn.textContent = 'Scrape Selected Posts';
            btn.style.position = 'fixed';
            btn.style.bottom = '32px';
            btn.style.right = '32px';
            btn.style.zIndex = '10000';
            btn.style.padding = '12px 20px';
            btn.style.background = '#4CAF50';
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.borderRadius = '8px';
            btn.style.fontWeight = 'bold';
            btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '16px';
            btn.addEventListener('click', () => this.scrapeSelectedPosts());
            document.body.appendChild(btn);
        }
        // Add style for selected posts
        if (!document.getElementById('fb-scraper-style')) {
            const style = document.createElement('style');
            style.id = 'fb-scraper-style';
            style.textContent = `
                .fb-scraper-selected {
                    outline: 3px solid #4CAF50 !important;
                    background: rgba(76,175,80,0.08) !important;
                }
                .fb-scraper-checkbox {
                    width: 18px; height: 18px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    observeNewPosts() {
        // Observe the main feed container for new posts
        const feed = document.querySelector('[role="feed"]') || document.body;
        const observer = new MutationObserver(() => {
            this.injectSelectionUI();
        });
        observer.observe(feed, { childList: true, subtree: true });
    }

    scrapeSelectedPosts() {
        const posts = Array.from(this.selectedPostsMap.values());
        if (posts.length === 0) {
            alert('Please select at least one post to scrape.');
            return;
        }
        const groupInfo = this.extractGroupInfo();
        const scrapedData = {
            timestamp: new Date().toISOString(),
            groupUrl: window.location.href,
            groupName: groupInfo.name,
            groupId: groupInfo.id,
            posts: posts,
            metadata: {
                totalPosts: posts.length,
                totalComments: posts.reduce((sum, post) => sum + post.comments.length, 0),
                totalImages: posts.reduce((sum, post) => sum + post.images.length, 0),
                scrapingDuration: 0
            }
        };
        // Send to popup as if it was a normal scrape
        chrome.runtime.sendMessage({
            action: 'downloadScrapedData',
            data: scrapedData
        });
        alert(`Scraped ${posts.length} selected post(s). Download from the extension popup.`);
    }
}

// Initialize the scraper when the content script loads
new FacebookGroupScraper(); 