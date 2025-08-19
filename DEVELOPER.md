# Developer Guide - Thunderbird Jira Connector

This guide provides technical details for developers who want to understand, modify, or contribute to the Thunderbird Jira Connector extension.

## Architecture Overview

The extension follows a typical WebExtension architecture with Thunderbird-specific APIs:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Background    │◄──►│   Content UI    │◄──►│   Jira API      │
│   Script        │    │   (Dialogs)     │    │   Integration   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Context Menu  │    │   Options Page  │    │   Local Storage │
│   Integration   │    │   Configuration │    │   Settings      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## File Structure

```
thunderbird-jira-connector/
├── manifest.json              # Extension manifest and permissions
├── background.js             # Main extension logic and message handling
├── jira-api.js              # Jira REST API communication layer
├── selection-dialog.html     # Project/issue type selection UI
├── selection-dialog.js       # Selection dialog logic and interactions
├── options/
│   ├── options.html         # Extension settings page
│   ├── options.css          # Settings page styling
│   └── options.js           # Settings page functionality
├── icons/
│   ├── icon-16.png          # Extension icon (16x16)
│   ├── icon-32.png          # Extension icon (32x32)
│   ├── icon-48.png          # Extension icon (48x48)
│   └── icon-96.png          # Extension icon (96x96)
├── package.json             # NPM package configuration
├── README.md                # User documentation
├── INSTALLATION.md          # Installation guide
└── create-icons.sh          # Icon placeholder generation script
```

## Core Components

### 1. Background Script (`background.js`)

The main orchestrator that:

- Initializes the extension
- Creates context menu items
- Handles email processing
- Manages communication between components
- Shows notifications

**Key Functions:**

- `init()`: Extension initialization
- `setupContextMenu()`: Creates right-click menu items
- `processMessage()`: Processes selected emails
- `extractMessageContent()`: Extracts and cleans email content
- `showProjectSelectionDialog()`: Opens project selection UI

### 2. Jira API Layer (`jira-api.js`)

Handles all Jira REST API communication:

- Authentication using API tokens
- Project and issue type retrieval
- Issue creation
- Connection testing

**Key Functions:**

- `makeRequest()`: Generic API request handler
- `getProjects()`: Retrieves available projects
- `getIssueTypes()`: Retrieves available issue types
- `createIssue()`: Creates a new Jira issue
- `testConnection()`: Validates connection settings

### 3. Selection Dialog (`selection-dialog.html` + `selection-dialog.js`)

Interactive UI for project and issue type selection:

- Project search functionality
- Issue type filtering
- User selection handling
- Communication with background script

### 4. Options Page (`options/`)

Configuration interface:

- Settings form
- Connection testing
- Settings persistence
- Input validation

## API Integration

### Jira REST API Endpoints

The extension uses Jira Cloud REST API v3:

| Endpoint                     | Purpose         | HTTP Method |
| ---------------------------- | --------------- | ----------- |
| `/rest/api/3/myself`         | Test connection | GET         |
| `/rest/api/3/project/search` | Get projects    | GET         |
| `/rest/api/3/issuetype`      | Get issue types | GET         |
| `/rest/api/3/issue`          | Create issue    | POST        |

### Authentication

Uses HTTP Basic Authentication with API tokens:

```javascript
const credentials = btoa(`${username}:${apiToken}`);
headers: {
  'Authorization': `Basic ${credentials}`
}
```

### Issue Creation Payload

```javascript
{
  "fields": {
    "project": { "key": "PROJ" },
    "summary": "Email Subject",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        {
          "type": "paragraph",
          "content": [
            { "type": "text", "text": "Email content..." }
          ]
        }
      ]
    },
    "issuetype": { "id": "10001" }
  }
}
```

## Thunderbird APIs Used

### Messages API

- `browser.messages.getFull()`: Get complete message content
- `browser.mailTabs.getSelectedMessages()`: Get selected emails

### Menus API

- `browser.menus.create()`: Create context menu items
- `browser.menus.onClicked`: Handle menu clicks

### Storage API

- `browser.storage.local.get()`: Retrieve settings
- `browser.storage.local.set()`: Save settings

### Notifications API

- `browser.notifications.create()`: Show user notifications

### Windows API

- `browser.windows.create()`: Open selection dialog
- `browser.windows.remove()`: Close dialog windows

## Message Processing

### Email Content Extraction

The extension processes email content in this order:

1. **Get Full Message**: `browser.messages.getFull(messageId)`
2. **Find Text Content**:
   - Prefer `text/plain` parts
   - Fallback to `text/html` with HTML stripping
   - Handle multipart messages recursively
3. **Clean Content**:
   - Remove email signatures
   - Strip HTML tags
   - Clean whitespace

### Content Cleaning Patterns

```javascript
const signaturePatterns = [
  /^--[\s\S]*$/m, // Standard signature delimiter
  /^_{2,}[\s\S]*$/m, // Underscore separators
  /Best regards[\s\S]*$/im, // Common sign-offs
  /Kind regards[\s\S]*$/im,
  /Sent from my [\s\S]*$/im, // Mobile signatures
];
```

## Extension Communication

### Background ↔ Dialog Communication

```javascript
// Background script sends data to dialog
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_DATA") {
    sendResponse({ projects, issueTypes });
  }
});

// Dialog sends selection back to background
browser.runtime.sendMessage({
  type: "SELECTION_RESULT",
  data: { project, issueType },
});
```

## Development Setup

### Prerequisites

- Node.js (for packaging)
- Thunderbird (for testing)
- Code editor with JavaScript support

### Development Workflow

1. **Clone Repository**:

   ```bash
   git clone https://github.com/yourusername/thunderbird-jira-connector.git
   cd thunderbird-jira-connector
   ```

2. **Load in Thunderbird**:

   - Open Thunderbird
   - Go to **Tools** → **Developer Tools** → **Debug Add-ons**
   - Click **Load Temporary Add-on**
   - Select `manifest.json`

3. **Make Changes**:

   - Edit source files
   - Use browser console for debugging (`Ctrl+Shift+J`)
   - Reload extension after changes

4. **Package for Distribution**:
   ```bash
   npm run package
   ```

### Debugging

#### Console Logging

```javascript
console.log("Debug message:", data);
console.error("Error occurred:", error);
```

#### Browser Console

- Press `Ctrl+Shift+J` to open
- Filter by extension name
- Check for errors and warnings

#### Network Monitoring

Use browser dev tools to monitor API requests:

- Open dev tools (`F12`)
- Go to Network tab
- Look for Jira API calls

## Testing

### Manual Testing Checklist

#### Installation

- [ ] Extension installs without errors
- [ ] Options page opens correctly
- [ ] Context menu appears on emails

#### Configuration

- [ ] Settings save properly
- [ ] Connection test works
- [ ] Invalid settings show errors

#### Email Processing

- [ ] Single email creates issue
- [ ] Multiple emails create multiple issues
- [ ] Content extraction works correctly
- [ ] HTML emails are processed properly

#### Error Handling

- [ ] Network errors show user-friendly messages
- [ ] Invalid Jira responses are handled
- [ ] Missing permissions are detected

### API Testing

Test Jira API endpoints manually:

```bash
# Test authentication
curl -u "email@example.com:API_TOKEN" \
  https://yourcompany.atlassian.net/rest/api/3/myself

# Test project access
curl -u "email@example.com:API_TOKEN" \
  https://yourcompany.atlassian.net/rest/api/3/project/search
```

## Performance Considerations

### Email Content Processing

- Process content asynchronously
- Limit signature detection to reasonable patterns
- Handle large emails gracefully

### API Requests

- Cache project and issue type data
- Implement request timeouts
- Handle rate limiting

### UI Responsiveness

- Show loading states during API calls
- Debounce search inputs
- Limit displayed results

## Security Considerations

### API Token Storage

- Store in Thunderbird's secure storage
- Never log tokens in console
- Clear tokens on uninstall

### XSS Prevention

- Escape HTML in dynamic content
- Validate all user inputs
- Use textContent over innerHTML

### CSRF Protection

- Jira API tokens provide CSRF protection
- Validate API responses

## Extension Permissions

```json
{
  "permissions": [
    "messagesRead", // Read email content
    "accountsRead", // Access email accounts
    "storage", // Store settings
    "menus", // Create context menus
    "notifications", // Show notifications
    "activeTab", // Access active tab
    "https://*/*", // HTTPS requests
    "http://*/*" // HTTP requests (for on-premise)
  ]
}
```

## Common Issues and Solutions

### Issue: Context menu not appearing

**Solution**: Check permissions and menu creation code

### Issue: API requests failing

**Solution**: Verify CORS settings and authentication

### Issue: Content extraction problems

**Solution**: Test with different email formats

### Issue: Dialog not opening

**Solution**: Check popup blocker and window creation code

## Contributing

### Code Style

- Use ES6+ features
- Add JSDoc comments for functions
- Follow consistent naming conventions
- Handle errors gracefully

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request

### Reporting Issues

Include:

- Thunderbird version
- Extension version
- Error messages
- Steps to reproduce

## Future Enhancements

### Planned Features

- Multiple Jira instance support
- Custom field mapping
- Email attachment handling
- Bulk operations
- Template system

### Architecture Improvements

- TypeScript conversion
- Unit testing framework
- CI/CD pipeline
- Automated testing

## Resources

- [Thunderbird Extension Development](https://developer.thunderbird.net/)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Extension Examples](https://github.com/thundernest/sample-extensions)
