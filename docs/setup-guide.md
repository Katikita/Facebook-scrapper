# Setup Guide - Facebook Group Post Scraper

This guide will walk you through setting up the complete Facebook Group Post Scraper system.

## Prerequisites

Before you begin, ensure you have:

- ✅ Chrome browser installed
- ✅ Access to an n8n instance (local or cloud)
- ✅ Facebook account with access to groups
- ✅ Google account (for Google Sheets integration)
- ✅ PostgreSQL database (optional, for advanced storage)

## Step 1: Chrome Extension Setup

### 1.1 Load the Extension

1. **Open Chrome Extensions**
   ```
   Navigate to: chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right
   - This enables loading unpacked extensions

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `chrome-extension/` folder from this project
   - The extension should appear in your extensions list

4. **Verify Installation**
   - Look for "Facebook Group Post Scraper" in your extensions
   - The extension icon should appear in your Chrome toolbar

### 1.2 Configure Icons (Optional)

If you want custom icons:

1. **Create Icons**
   - Create 16x16, 48x48, and 128x128 pixel PNG images
   - Replace the placeholder files in `chrome-extension/assets/`

2. **Reload Extension**
   - Go back to `chrome://extensions/`
   - Click the refresh icon on the Facebook Group Scraper extension

### 1.3 Test Basic Functionality

1. **Navigate to a Facebook Group**
   - Go to any Facebook Group you're a member of
   - Ensure you can see posts and comments

2. **Check Extension**
   - Click the extension icon
   - You should see the popup interface
   - The "Scrape" button should be enabled

## Step 2: n8n Workflow Setup

### 2.1 Import the Workflow

1. **Open n8n**
   - Navigate to your n8n instance
   - Log in with your credentials

2. **Import Workflow**
   - Click "Import from file" or "Import from URL"
   - Select the `n8n-workflows/facebook-scraper-workflow.json` file
   - The workflow should appear in your workspace

3. **Review the Workflow**
   - The workflow contains 7 nodes:
     - Facebook Scraper Webhook
     - Transform & Validate Data
     - Store in Google Sheets
     - Store in PostgreSQL
     - GPT Analysis (Optional)
     - Success Response
     - Error Response

### 2.2 Configure Credentials

#### Google Sheets Credentials

1. **Create Google Sheets Credential**
   - Click on the "Store in Google Sheets" node
   - Click "Create New Credential"
   - Select "Google Sheets OAuth2 API"
   - Follow the OAuth2 setup process

2. **Configure Google Sheets**
   - Create a new Google Sheet or use existing one
   - Note the Sheet ID from the URL
   - Update the "Document ID" field in the node

#### PostgreSQL Credentials (Optional)

1. **Create PostgreSQL Credential**
   - Click on the "Store in PostgreSQL" node
   - Click "Create New Credential"
   - Enter your database connection details:
     - Host: Your database host
     - Database: Your database name
     - User: Database username
     - Password: Database password
     - Port: 5432 (default)

2. **Create Database Table**
   ```sql
   CREATE TABLE facebook_posts (
     id SERIAL PRIMARY KEY,
     scraping_timestamp TIMESTAMP,
     group_url TEXT,
     group_name TEXT,
     group_id TEXT,
     post_id TEXT,
     content TEXT,
     comments JSONB,
     images JSONB,
     post_timestamp TIMESTAMP,
     author TEXT,
     comments_count INTEGER,
     images_count INTEGER,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

#### OpenAI Credentials (Optional)

1. **Create OpenAI Credential**
   - Click on the "GPT Analysis" node
   - Click "Create New Credential"
   - Enter your OpenAI API key
   - Test the connection

### 2.3 Configure Webhook

1. **Get Webhook URL**
   - Click on the "Facebook Scraper Webhook" node
   - Note the webhook URL: `https://thanakorn2542.app.n8n.cloud/webhook/webhook/fb-group-posts`
   - Copy this URL for the Chrome extension

2. **Test Webhook**
   ```bash
   curl -X POST https://thanakorn2542.app.n8n.cloud/webhook/webhook/fb-group-posts \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

### 2.4 Activate the Workflow

1. **Save the Workflow**
   - Click "Save" to save your configuration
   - Give it a meaningful name

2. **Activate the Workflow**
   - Toggle the "Active" switch
   - The webhook should now be live

## Step 3: Connect Extension to n8n

### 3.1 Configure Webhook URL

1. **Open Extension Popup**
   - Click the Facebook Group Scraper extension icon
   - You should see the popup interface

2. **Enter Webhook URL**
   - In the "n8n Webhook URL" field, enter your webhook URL
   - Example: `https://thanakorn2542.app.n8n.cloud/webhook/webhook/fb-group-posts`
   - The URL will be saved automatically

3. **Test Connection**
   - Navigate to a Facebook Group
   - Click "Scrape Posts + Comments + Images"
   - Check if data appears in your n8n workflow

## Step 4: Testing the Complete System

### 4.1 End-to-End Test

1. **Prepare Test Environment**
   - Navigate to a Facebook Group with recent posts
   - Ensure you can see posts, comments, and images
   - Have your n8n workflow active

2. **Run Test Scrape**
   - Click the extension icon
   - Click "Scrape Posts + Comments + Images"
   - Watch the progress indicator

3. **Verify Results**
   - Check n8n workflow execution
   - Verify data in Google Sheets or PostgreSQL
   - Review any GPT analysis results

### 4.2 Troubleshooting

#### Extension Issues
- **Extension not loading**: Check manifest.json syntax
- **Scraping not working**: Verify you're on a Facebook group page
- **Webhook errors**: Check URL format and n8n workflow status

#### n8n Issues
- **Webhook not receiving data**: Check workflow activation
- **Credential errors**: Verify API keys and permissions
- **Storage failures**: Check database/Google Sheets access

## Step 5: Production Deployment

### 5.1 Chrome Extension (Optional)

For production use, you can publish to Chrome Web Store:

1. **Package Extension**
   - Zip the `chrome-extension/` folder
   - Include all necessary files

2. **Submit to Chrome Web Store**
   - Create developer account
   - Submit for review
   - Wait for approval

### 5.2 n8n Production Setup

1. **Deploy to Production Server**
   - Use Docker or direct installation
   - Configure SSL certificates
   - Set up monitoring and backups

2. **Configure Environment Variables**
   ```bash
   N8N_BASIC_AUTH_ACTIVE=true
   N8N_BASIC_AUTH_USER=your_username
   N8N_BASIC_AUTH_PASSWORD=your_password
   ```

3. **Set Up Monitoring**
   - Configure health checks
   - Set up alerting for workflow failures
   - Monitor webhook performance

## Step 6: Advanced Configuration

### 6.1 Customize Scraping

You can modify the scraping behavior in `content.js`:

```javascript
// Adjust scraping selectors
const selectors = [
  '[data-testid="post_container"]',
  '[data-ad-preview="message"]',
  // Add your custom selectors
];

// Modify data extraction
function extractPostData(postElement) {
  // Customize what data to extract
}
```

### 6.2 Customize n8n Workflow

1. **Add Custom Nodes**
   - Add additional processing steps
   - Integrate with other services
   - Add custom data transformations

2. **Modify Data Flow**
   - Change storage destinations
   - Add data filtering
   - Implement custom analytics

### 6.3 Security Enhancements

1. **Add Authentication**
   - Implement API key validation
   - Add rate limiting
   - Set up IP whitelisting

2. **Data Protection**
   - Encrypt sensitive data
   - Implement data retention policies
   - Add audit logging

## Troubleshooting Common Issues

### Extension Won't Load
```
Error: Manifest file is missing or unreadable
```
**Solution**: Check manifest.json syntax and file structure

### Webhook Not Working
```
Error: Failed to fetch
```
**Solution**: Verify webhook URL and n8n workflow status

### No Data Scraped
```
Error: No posts found to scrape
```
**Solution**: Check Facebook page structure and selectors

### Database Connection Failed
```
Error: Connection refused
```
**Solution**: Verify database credentials and network access

## Next Steps

After successful setup:

1. **Monitor Performance**
   - Track scraping success rates
   - Monitor data quality
   - Optimize for your use case

2. **Scale Up**
   - Add more Facebook groups
   - Implement batch processing
   - Add advanced analytics

3. **Maintain**
   - Keep dependencies updated
   - Monitor for Facebook changes
   - Backup data regularly

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the main README.md
3. Check n8n and Chrome extension documentation
4. Open an issue in the project repository

---

**Setup Complete! 🎉**

Your Facebook Group Post Scraper should now be fully functional. Happy scraping! 