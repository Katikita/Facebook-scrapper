# Facebook Group Post Scraper

A Chrome extension that scrapes visible posts, comments, and images from Facebook Groups and sends data to n8n for storage and analysis.

## 🎯 Project Overview

This project consists of two main components:
- **Chrome Extension** (Manifest V3) - Scrapes Facebook Group data
- **n8n Workflow** - Processes and stores the scraped data

## ✨ Features

- ✅ Scrape visible post text from Facebook Groups
- ✅ Extract visible preview comments
- ✅ Capture attached photo URLs
- ✅ Send data to configurable n8n webhook
- ✅ Beautiful Chrome extension UI
- ✅ Data validation and error handling
- ✅ Optional GPT analysis integration
- ✅ Store data in Google Sheets or PostgreSQL
- ✅ Real-time progress tracking

## 🏗️ Architecture

```
Chrome Extension → n8n Webhook → Data Processing → Storage/Analysis
     ↓                    ↓              ↓              ↓
  Scrape Posts    →   Receive Data  →  Transform  →  Google Sheets
  Extract Comments →  Validate      →  Normalize  →  PostgreSQL
  Capture Images  →  Process        →  Analyze    →  GPT Analysis
```

## 📁 Project Structure

```
facebook-group-scraper/
├── chrome-extension/
│   ├── manifest.json          # Extension configuration
│   ├── popup.html            # Extension popup UI
│   ├── popup.js              # Popup functionality
│   ├── content.js            # DOM scraping logic
│   ├── background.js         # Service worker
│   └── assets/               # Icons and images
├── n8n-workflows/
│   └── facebook-scraper-workflow.json  # n8n workflow
├── docs/                     # Documentation
├── tests/                    # Test files
└── README.md                 # This file
```

## 🚀 Quick Start

### 1. Chrome Extension Setup

1. **Load the Extension**
   ```bash
   # Navigate to Chrome Extensions
   chrome://extensions/
   
   # Enable Developer Mode
   # Click "Load unpacked"
   # Select the chrome-extension/ folder
   ```

2. **Configure Webhook URL**
   - Click the extension icon
   - Enter your n8n webhook URL
   - The URL will be saved automatically

### 2. n8n Workflow Setup

1. **Import the Workflow**
   - Open your n8n instance
   - Import the `n8n-workflows/facebook-scraper-workflow.json` file

2. **Configure Credentials**
   - **Google Sheets**: Set up OAuth2 credentials
   - **PostgreSQL**: Configure database connection
   - **OpenAI**: Add API key (optional, for GPT analysis)

3. **Activate the Workflow**
   - The webhook will be available at: `https://thanakorn2542.app.n8n.cloud/webhook/webhook/fb-group-posts`

### 3. Usage

1. **Navigate to a Facebook Group**
   - Go to any Facebook Group you're a member of
   - Scroll through posts to load content

2. **Start Scraping**
   - Click the extension icon
   - Click "Scrape Posts + Comments + Images"
   - Watch the progress indicator

3. **View Results**
   - Check your Google Sheets or PostgreSQL database
   - Review the scraped data and analysis

## 🔧 Configuration

### Chrome Extension Settings

The extension stores settings in Chrome's sync storage:

```javascript
{
  webhookUrl: "https://thanakorn2542.app.n8n.cloud/webhook/webhook/fb-group-posts",
  autoInject: true,
  scrapingDelay: 1000,
  maxPosts: 50
}
```

### n8n Workflow Configuration

#### Webhook Node
- **Path**: `/webhook/fb-group-posts`
- **Method**: POST
- **CORS**: Enabled for Chrome extension
- **URL**: `https://thanakorn2542.app.n8n.cloud/webhook/webhook/fb-group-posts`

#### Data Transformation
- Validates incoming data structure
- Normalizes post data
- Handles missing fields gracefully

#### Storage Options
- **Google Sheets**: Append to specified sheet
- **PostgreSQL**: Insert into `facebook_posts` table

#### GPT Analysis (Optional)
- Analyzes first 3 posts to avoid rate limits
- Provides sentiment analysis and insights
- Requires OpenAI API key

## 📊 Data Structure

### Scraped Data Format

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "groupUrl": "https://facebook.com/groups/123456789",
  "groupName": "Example Group",
  "groupId": "123456789",
  "posts": [
    {
      "postId": "unique_post_id",
      "text": "Post content...",
      "comments": ["Comment 1", "Comment 2"],
      "images": ["https://scontent...", "https://scontent..."],
      "timestamp": "2024-01-01T12:00:00.000Z",
      "author": "Author Name"
    }
  ],
  "metadata": {
    "totalPosts": 10,
    "totalComments": 25,
    "totalImages": 5,
    "scrapingDuration": 1500
  }
}
```

### Database Schema

#### PostgreSQL Table
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

#### Google Sheets Structure
| Timestamp | Group URL | Group Name | Post ID | Content | Comments | Images | Author |
|-----------|-----------|------------|---------|---------|----------|--------|--------|
| 2024-01-01 | https://... | Group Name | post_123 | Content... | ["comment1"] | ["img1"] | Author |

## 🛡️ Security & Privacy

### Data Protection
- ✅ Only scrapes publicly visible content
- ✅ Respects Facebook's Terms of Service
- ✅ No personal data collection
- ✅ Secure webhook transmission
- ✅ Data validation and sanitization

### Ethical Considerations
- Only scrapes content visible to the user
- Implements reasonable delays
- Respects rate limits
- No bypassing of access controls
- Transparent data handling

## 🧪 Testing

### Chrome Extension Testing
```bash
# Run tests (if implemented)
npm test

# Manual testing checklist:
# ✅ Extension loads on Facebook group pages
# ✅ Scraping button works
# ✅ Data is sent to webhook
# ✅ Error handling works
# ✅ Progress indicators function
```

### n8n Workflow Testing
1. **Test Webhook Endpoint**
   ```bash
   curl -X POST https://your-n8n-instance.com/webhook/facebook-scraper \
     -H "Content-Type: application/json" \
     -d @test-data.json
   ```

2. **Validate Data Processing**
   - Check data transformation
   - Verify storage operations
   - Test error handling

## 📈 Monitoring & Analytics

### Success Metrics
- **Scraping Success Rate**: >90% target
- **Data Completeness**: >80% target
- **Processing Time**: <5 seconds target
- **User Satisfaction**: Positive feedback

### Logging
The extension and workflow include comprehensive logging:
- Scraping progress and errors
- Webhook transmission status
- Data processing metrics
- Performance monitoring

## 🔄 Troubleshooting

### Common Issues

#### Extension Not Working
1. **Check Permissions**
   - Ensure extension has access to Facebook
   - Verify host permissions in manifest

2. **Webhook Issues**
   - Validate webhook URL format
   - Check n8n workflow status
   - Verify CORS settings

3. **Scraping Failures**
   - Facebook may have changed DOM structure
   - Check console for error messages
   - Verify you're on a group page

#### n8n Workflow Issues
1. **Webhook Not Receiving Data**
   - Check workflow activation status
   - Verify webhook URL is correct
   - Test with sample data

2. **Storage Failures**
   - Verify database credentials
   - Check Google Sheets permissions
   - Review error logs

### Debug Mode
Enable debug logging in the extension:
```javascript
// In content.js
console.log('Debug mode enabled');
```

## 🚀 Deployment

### Chrome Extension
1. **Development**
   - Load unpacked extension
   - Test on Facebook groups
   - Debug and iterate

2. **Production** (Optional)
   - Package extension for Chrome Web Store
   - Submit for review
   - Publish to store

### n8n Workflow
1. **Development**
   - Import workflow to local n8n
   - Configure credentials
   - Test with sample data

2. **Production**
   - Deploy to production n8n instance
   - Set up monitoring and alerts
   - Configure backup strategies

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Standards
- Follow JavaScript/TypeScript best practices
- Add proper error handling
- Include documentation
- Write tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and research purposes only. Users are responsible for:
- Complying with Facebook's Terms of Service
- Respecting user privacy and data protection laws
- Using the tool ethically and responsibly
- Obtaining necessary permissions for data collection

## 🆘 Support

### Getting Help
1. **Check Documentation**: Review this README and code comments
2. **Search Issues**: Look for similar problems in the issue tracker
3. **Create Issue**: Provide detailed information about your problem
4. **Community**: Ask questions in the project discussions

### Reporting Bugs
When reporting bugs, please include:
- Chrome version and OS
- Extension version
- Steps to reproduce
- Error messages
- Screenshots if relevant

---

**Happy Scraping! 🚀**

For questions or support, please open an issue or contact the maintainers. 