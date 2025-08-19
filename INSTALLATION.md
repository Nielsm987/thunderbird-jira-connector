# Installation Guide - Thunderbird Jira Connector

This guide will walk you through installing and configuring the Thunderbird Jira Connector extension.

## Prerequisites

- **Mozilla Thunderbird** 78.0 or later
- **Jira Account** with API access
- **Permissions** to create issues in your Jira projects

## Step-by-Step Installation

### 1. Prepare the Extension

Since this is a development version, you'll need to package it first:

```bash
# Navigate to the extension directory
cd thunderbird-jira-connector

# Create the extension package
npm run package
```

This creates a `thunderbird-jira-connector.xpi` file.

### 2. Install in Thunderbird

1. **Open Thunderbird**
2. **Navigate to Add-ons**:
   - Go to **Tools** → **Add-ons and Themes**
   - Or press `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (Mac)
3. **Install the Extension**:
   - Click the gear icon (⚙️) in the top-right
   - Select **"Install Add-on From File..."**
   - Browse to your `thunderbird-jira-connector.xpi` file
   - Click **Open**
4. **Confirm Installation**:
   - Click **Install** when prompted
   - Click **Install** again to confirm
   - **Restart Thunderbird** if prompted

### 3. Create Jira API Token

Before configuring the extension, you need a Jira API token:

1. **Go to Atlassian Account Security**:

   - Visit: https://id.atlassian.com/manage-profile/security/api-tokens
   - Sign in with your Atlassian account

2. **Create API Token**:

   - Click **"Create API token"**
   - Enter a label: `Thunderbird Jira Connector`
   - Click **Create**
   - **Copy the token immediately** (you won't see it again)

3. **Save the Token Securely**:
   - Store it in a password manager
   - You'll need it for the next step

### 4. Configure the Extension

1. **Open Extension Settings**:

   - Go to **Tools** → **Add-ons and Themes**
   - Find "Thunderbird Jira Connector"
   - Click **Options** or **Preferences**

2. **Enter Jira Configuration**:

   - **Jira Base URL**: Your Jira server URL
     - Format: `https://yourcompany.atlassian.net`
     - For Jira Server: `https://jira.yourcompany.com`
   - **Username/Email**: Your Jira account email address
   - **API Token**: Paste the token from step 3

3. **Test Connection**:

   - Click **"Test Connection"**
   - You should see: ✅ "Connection successful! Connected as: [Your Name]"
   - If you get an error, double-check your settings

4. **Save Settings**:
   - Click **"Save Settings"**
   - You should see: ✅ "Settings saved successfully!"

### 5. Verify Installation

1. **Check Context Menu**:

   - Right-click any email in your message list
   - You should see **"Send to Jira"** option

2. **Test Issue Creation** (Optional):
   - Select a test email
   - Right-click → **"Send to Jira"**
   - Choose a project and issue type
   - Click **"Create Issue"**
   - Check that the issue was created in Jira

## Configuration Options

### Basic Settings

| Setting            | Description             | Example                         |
| ------------------ | ----------------------- | ------------------------------- |
| **Jira Base URL**  | Your Jira server URL    | `https://company.atlassian.net` |
| **Username/Email** | Your Jira account email | `john.doe@company.com`          |
| **API Token**      | Your Jira API token     | `ATATT3xFfGF0...`               |

### Advanced Settings

| Setting                | Description                               | Default    |
| ---------------------- | ----------------------------------------- | ---------- |
| **Show Notifications** | Display success/error notifications       | ✅ Enabled |
| **Strip Signatures**   | Remove email signatures from descriptions | ✅ Enabled |

## Troubleshooting

### Common Installation Issues

#### ❌ "Extension could not be installed"

- **Cause**: Incompatible Thunderbird version
- **Solution**: Ensure you have Thunderbird 78.0 or later

#### ❌ "Package corrupt"

- **Cause**: Incomplete download or packaging issue
- **Solution**: Re-download or re-package the extension

### Configuration Issues

#### ❌ "Connection failed"

**Possible causes and solutions:**

1. **Invalid URL**:

   - Check URL format (must include `https://`)
   - Verify the URL works in your browser

2. **Wrong Credentials**:

   - Use your email address, not username
   - Verify API token is copied correctly
   - Create a new API token if needed

3. **Network Issues**:

   - Check if you're behind a corporate firewall
   - Try from a different network

4. **Permissions**:
   - Ensure your account has access to Jira
   - Contact your Jira administrator

#### ❌ "Failed to create issue"

**Possible causes:**

1. **Project Permissions**:

   - You don't have "Create Issues" permission
   - Project doesn't allow the selected issue type

2. **Required Fields**:
   - Project has required fields not handled by the extension
   - Contact your Jira administrator

### Getting Help

If you encounter issues:

1. **Check Console Logs**:

   - Press `Ctrl+Shift+J` to open Browser Console
   - Look for error messages related to the extension

2. **Verify Jira Access**:

   - Log into Jira web interface
   - Try creating an issue manually

3. **Contact Support**:
   - Open an issue on GitHub
   - Include error messages and configuration details

## Advanced Configuration

### Custom Jira Fields

If your Jira projects require custom fields, you may need to modify the extension. The issue creation payload is in `jira-api.js`:

```javascript
const payload = {
  fields: {
    project: { key: issueData.project.key },
    summary: issueData.summary,
    description: issueData.description,
    issuetype: { id: issueData.issueType.id },
    // Add custom fields here:
    // customfield_10001: "Custom value"
  },
};
```

### Corporate Networks

If you're behind a corporate firewall:

1. **Proxy Settings**: Thunderbird will use system proxy settings
2. **SSL Certificates**: Self-signed certificates may cause issues
3. **Allowlists**: Ensure Jira URLs are allowed

### Multiple Jira Instances

Currently, the extension supports one Jira instance. For multiple instances:

1. Install separate copies with different IDs
2. Or modify the extension to support multiple configurations

## Uninstallation

To remove the extension:

1. Go to **Tools** → **Add-ons and Themes**
2. Find "Thunderbird Jira Connector"
3. Click **Remove**
4. Restart Thunderbird

Your settings will be preserved unless you manually clear them from Thunderbird's storage.
