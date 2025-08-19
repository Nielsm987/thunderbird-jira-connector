# Thunderbird Jira Connector

A powerful Thunderbird extension that seamlessly integrates with Jira, allowing you to create issues directly from your emails.

## Features

- 📧 **Email Integration**: Right-click any email to create a Jira issue
- 🎯 **Smart Content Extraction**: Automatically extracts email subject and body
- 🔍 **Project Search**: Easy project selection with search functionality
- 📋 **Issue Type Selection**: Choose from available issue types
- 🔐 **Secure Authentication**: Uses Jira API tokens for secure authentication
- 📬 **Notifications**: Get notified when issues are created successfully
- ⚙️ **Configurable**: Customizable settings for your workflow

## Installation

### Step 1: Download the Extension

1. Download the latest release from the [releases page](../../releases)
2. Or clone this repository and build the extension yourself

### Step 2: Install in Thunderbird

1. Open Thunderbird
2. Go to **Tools** → **Add-ons and Themes** (or press `Ctrl+Shift+A`)
3. Click the gear icon (⚙️) → **Install Add-on From File...**
4. Select the downloaded `.xpi` file
5. Click **Install** when prompted
6. Restart Thunderbird if required

### Step 3: Configure Jira Connection

1. After installation, go to **Tools** → **Add-ons and Themes**
2. Find "Thunderbird Jira Connector" and click **Options** or **Preferences**
3. Enter your Jira configuration:
   - **Jira Base URL**: Your Jira server URL (e.g., `https://yourcompany.atlassian.net`)
   - **Username/Email**: Your Jira account email
   - **API Token**: Your Jira API token (see below for how to create one)

### Step 4: Create Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Give it a label (e.g., "Thunderbird Connector")
4. Copy the generated token
5. Paste it into the extension settings

### Step 5: Test Connection

1. In the extension options, click **Test Connection**
2. If successful, you'll see a confirmation with your user details
3. Click **Save Settings**

## Usage

### Creating Issues from Emails

1. **Select an email** in your message list
2. **Right-click** and select **"Send to Jira"**
3. **Choose a project** from the search list
4. **Select an issue type** (Bug, Task, Story, etc.)
5. **Click "Create Issue"**
6. You'll receive a notification with the issue key (e.g., PROJ-123)

### Multiple Email Selection

- Select multiple emails using `Ctrl+Click` or `Shift+Click`
- Right-click and choose "Send to Jira"
- Each email will be processed as a separate issue

### Content Processing

The extension intelligently extracts email content:

- **Issue Title**: Uses the email subject line
- **Issue Description**: Extracts the email body content
  - Prefers plain text over HTML
  - Automatically strips common email signatures
  - Removes HTML formatting when necessary

## Configuration Options

### Basic Settings

- **Jira Base URL**: Your Jira server URL
- **Username**: Your Jira account email
- **API Token**: Your Jira API token

### Advanced Settings

- **Show Notifications**: Toggle success/error notifications
- **Strip Signatures**: Automatically remove email signatures from descriptions

## Troubleshooting

### Common Issues

#### "Jira not configured" error

- Ensure all settings are filled in the options page
- Test your connection using the "Test Connection" button

#### "Connection failed" error

- Verify your Jira URL is correct (include https://)
- Check that your email and API token are correct
- Ensure your Jira account has permission to create issues

#### "Failed to create issue" error

- Verify you have permission to create issues in the selected project
- Check that the selected issue type is available for the project
- Ensure required fields are properly configured in your Jira project

#### CORS (Cross-Origin) errors

If you see CORS-related errors like "CORS request did not succeed":

**For Jira Cloud users:**

- This is a known limitation with some Jira Cloud instances
- Try using a different Jira instance or contact your administrator
- Some corporate Jira instances have strict CORS policies

**For Jira Server users:**

- Contact your Jira administrator to configure CORS settings
- The server may need to allow cross-origin requests from extensions

**Alternative solutions:**

- Use Jira Cloud with proper API access enabled
- Ask your administrator to whitelist the extension
- Consider using a Jira instance with less restrictive CORS policies

#### CSRF (Cross-Site Request Forgery) errors

If you see CSRF-related errors like "XSRF check failed":

**This is a security feature in Jira that prevents unauthorized requests:**

Atlassian has implemented strict Origin-based CSRF protection that blocks requests when:

- The request is a POST request
- The request comes from a browser/extension
- The Content-Type is `application/json` (which REST APIs use)
- The Origin header doesn't match the Jira server's domain

**What the extension does automatically:**

- Tries multiple authentication methods (Basic Auth, Bearer Token)
- Attempts different API endpoints (v3, v2)
- Uses various request methods (fetch, XMLHttpRequest)
- Sets proper Origin headers to match your Jira domain

**If CSRF errors persist:**

- **Contact your Jira administrator** - They need to configure proxy settings
- **Check server configuration** - The issue is often related to reverse proxy setup
- **Verify Tomcat settings** - proxyName, proxyPort, and scheme must match your domain
- **Consider API access policies** - Some organizations restrict API access from extensions

**Technical details:**

This error occurs when Jira's Origin header validation fails. The extension automatically tries multiple approaches, but some Jira instances have security policies that block all external requests regardless of authentication.

### API Token Issues

If your API token isn't working:

1. Create a new token at [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Make sure you're using your email address (not username) for authentication
3. Verify the token was copied correctly (no extra spaces)

**Manual verification:** Test your credentials outside the extension:

```bash
curl -u "your-email@company.com:YOUR_API_TOKEN" \
  https://yourcompany.atlassian.net/rest/api/3/myself
```

If this returns your user details, your credentials are correct.

### Permission Issues

If you can't create issues:

1. Contact your Jira administrator
2. Ensure you have "Create Issues" permission in the target project
3. Verify the project allows the selected issue type

## Development

### Building from Source

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/thunderbird-jira-connector.git
   cd thunderbird-jira-connector
   ```

2. The extension is ready to use as-is (no build process required)

3. For development, load the extension in Thunderbird:
   - Go to **Tools** → **Developer Tools** → **Debug Add-ons**
   - Click **Load Temporary Add-on**
   - Select the `manifest.json` file

### File Structure

```
thunderbird-jira-connector/
├── manifest.json           # Extension manifest
├── background.js          # Main extension logic
├── jira-api.js           # Jira API communication
├── selection-dialog.html  # Project/issue type selection UI
├── selection-dialog.js    # Selection dialog logic
├── options/
│   ├── options.html      # Settings page
│   ├── options.css       # Settings page styles
│   └── options.js        # Settings page logic
├── icons/
│   └── *.png            # Extension icons
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Bug Reports**: [Open an issue](../../issues)
- 💡 **Feature Requests**: [Open an issue](../../issues)
- 📖 **Documentation**: Check this README
- 🔧 **Jira API Docs**: [Atlassian Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

## Changelog

### Version 1.0.0

- Initial release
- Basic email to Jira issue creation
- Project and issue type selection
- Configuration options
- Notification system
