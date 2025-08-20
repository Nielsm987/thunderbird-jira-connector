/**
 * Thunderbird Jira Connector - Background Script
 * Handles context menu integration and Jira API communication
 */

// Test if JiraAPI is loaded
console.log('Background script loading, JiraAPI available:', typeof JiraAPI);

// Initialize the extension immediately
init();

// Also listen for startup/install events
browser.runtime.onStartup.addListener(init);
browser.runtime.onInstalled.addListener(init);

function init() {
  console.log('Thunderbird Jira Connector initialized');
  setupContextMenu();
  setupMessageHandler();
  setupMessageDisplayAction();
}

/**
 * Setup context menu for emails
 */
function setupContextMenu() {
  console.log('Setting up context menu...');
  
  // Remove existing menu item if it exists
  browser.menus.removeAll().then(() => {
    browser.menus.create({
      id: "send-to-jira",
      title: "Create Jira Issue",
      contexts: ["message_list"],
      icons: {
        "16": "icons/icon-16.png"
      }
    }, () => {
      if (browser.runtime.lastError) {
        console.error('Error creating context menu:', browser.runtime.lastError);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
}

/**
 * Handle context menu clicks
 */
browser.menus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked - menuItemId:', info.menuItemId);
  if (info.menuItemId === "send-to-jira") {
    try {
      console.log('Create Jira Issue clicked', info);
      
      // Check if Jira is configured
      const isConfigured = await JiraAPI.isConfigured();
      console.log('Jira configured:', isConfigured);
      if (!isConfigured) {
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/icon-48.png",
          title: "Jira Connector",
          message: "Please configure Jira settings in the extension options first."
        });
        browser.runtime.openOptionsPage();
        return;
      }

      // Get selected messages
      const messageList = await browser.mailTabs.getSelectedMessages(tab.id);
      if (!messageList.messages || messageList.messages.length === 0) {
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/icon-48.png",
          title: "Jira Connector",
          message: "No emails selected."
        });
        return;
      }

      // Process each selected message
      for (const message of messageList.messages) {
        await processMessage(message);
      }

    } catch (error) {
      console.error('Error in context menu handler:', error);
      browser.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: "Jira Connector - Error",
        message: `Error: ${error.message}`
      });
    }
  }
});

/**
 * Process a single message and create Jira issue
 */
async function processMessage(message) {
  try {
    console.log('Processing message:', message.subject);

    // Get full message content
    const fullMessage = await browser.messages.getFull(message.id);
    const messageContent = extractMessageContent(fullMessage);

    // Get Jira projects and issue types
    const projects = await JiraAPI.getProjects();

    // Show project and issue type selection dialog
    const selectionResult = await showProjectSelectionDialog(projects, message.subject);
    
    if (!selectionResult) {
      console.log('User cancelled project selection');
      return;
    }

    // Create Jira issue
    const issueData = {
      summary: message.subject,
      description: messageContent,
      project: selectionResult.project,
      issueType: selectionResult.issueType
    };

    const createdIssue = await JiraAPI.createIssue(issueData);

    // Store the link between message and Jira issue
    await storeJiraIssueLink(message.id, createdIssue);

    // Show success notification
    browser.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Jira Issue Created",
      message: `Issue ${createdIssue.key} created successfully: ${message.subject}`
    });

    console.log('Jira issue created:', createdIssue);

  } catch (error) {
    console.error('Error processing message:', error);
    browser.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Jira Connector - Error",
      message: `Failed to create issue: ${error.message}`
    });
  }
}

/**
 * Extract clean content from email message
 */
function extractMessageContent(fullMessage) {
  let content = '';

  // Helper function to clean text content
  function cleanTextContent(text) {
    if (!text) return '';
    
    // Remove common email signatures
    const signaturePatterns = [
      /^--[\s\S]*$/m,
      /^_{2,}[\s\S]*$/m,
      /Best regards[\s\S]*$/mi,
      /Kind regards[\s\S]*$/mi,
      /Sent from my [\s\S]*$/mi
    ];

    let cleaned = text;
    for (const pattern of signaturePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
  }

  // Helper function to strip HTML tags
  function stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Try to extract content in order of preference
  function extractFromPart(part) {
    if (!part) return '';

    // If it's a multipart, recursively check parts
    if (part.parts && part.parts.length > 0) {
      // First try to find text/plain
      for (const subPart of part.parts) {
        if (subPart.contentType === 'text/plain' && subPart.body) {
          return cleanTextContent(subPart.body);
        }
      }
      
      // Fallback to text/html
      for (const subPart of part.parts) {
        if (subPart.contentType === 'text/html' && subPart.body) {
          return cleanTextContent(stripHtml(subPart.body));
        }
      }
      
      // Recursively check nested parts
      for (const subPart of part.parts) {
        const result = extractFromPart(subPart);
        if (result) return result;
      }
    }

    // Check current part
    if (part.contentType === 'text/plain' && part.body) {
      return cleanTextContent(part.body);
    }
    
    if (part.contentType === 'text/html' && part.body) {
      return cleanTextContent(stripHtml(part.body));
    }

    return '';
  }

  content = extractFromPart(fullMessage);

  // If no content found, use a fallback message
  if (!content) {
    content = '(Email content could not be extracted)';
  }

  return content;
}

/**
 * Show dialog for project and issue type selection
 */
async function showProjectSelectionDialog(projects, emailSubject) {
  return new Promise((resolve) => {
    // Create a new window for the selection dialog
    browser.windows.create({
      url: `selection-dialog.html?subject=${encodeURIComponent(emailSubject)}`,
      type: "popup",
      width: 600,
      height: 500,
      left: 100,
      top: 100
    }).then((window) => {
      // Listen for messages from the dialog
      const messageListener = (message, sender, sendResponse) => {
        if (sender.tab && sender.tab.windowId === window.id) {
          if (message.type === 'GET_DATA') {
            console.log('Sending projects to dialog:', { projectCount: projects ? projects.length : 0 });
            try {
              const response = { projects: projects || [] };
              sendResponse(response);
              return true; // Keep the message channel open
            } catch (error) {
              console.error('Error sending projects:', error);
              sendResponse({ error: error.message });
              return true;
            }
          } else if (message.type === 'GET_PROJECT_ISSUE_TYPES') {
            // Handle project-specific issue type requests
            (async () => {
              try {
                const issueTypes = await JiraAPI.getProjectIssueTypes(message.projectKey);
                sendResponse({ success: true, issueTypes });
              } catch (error) {
                sendResponse({ success: false, error: error.message });
              }
            })();
            return true; // Keep the message channel open for async response
          } else if (message.type === 'SELECTION_RESULT') {
            browser.runtime.onMessage.removeListener(messageListener);
            browser.windows.remove(window.id);
            resolve(message.data);
          } else if (message.type === 'CANCEL_SELECTION') {
            browser.runtime.onMessage.removeListener(messageListener);
            browser.windows.remove(window.id);
            resolve(null);
          }
        }
      };

      browser.runtime.onMessage.addListener(messageListener);

      // Handle window closed by user
      const windowRemovedListener = (windowId) => {
        if (windowId === window.id) {
          browser.windows.onRemoved.removeListener(windowRemovedListener);
          browser.runtime.onMessage.removeListener(messageListener);
          resolve(null);
        }
      };

      browser.windows.onRemoved.addListener(windowRemovedListener);
    });
  });
}

/**
 * Setup message handler for communication with options page
 */
function setupMessageHandler() {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message);
    
    if (message.type === 'TEST_JIRA_CONNECTION') {
      // Handle async operation properly
      (async () => {
        try {
          // Temporarily store settings for testing
          const currentSettings = await browser.storage.local.get(['jiraBaseUrl', 'jiraUsername', 'jiraApiToken']);
          await browser.storage.local.set(message.settings);
          
          // Test connection using background script context (which has fewer CORS restrictions)
          const result = await JiraAPI.testConnection();
          
          // Restore original settings
          await browser.storage.local.set(currentSettings);
          
          sendResponse(result);
        } catch (error) {
          console.error('Error in background test connection:', error);
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      
      // Return true to indicate we will send a response asynchronously
      return true;
    }
    
    return false;
  });
}

/**
 * Setup message display action (toolbar button)
 */
function setupMessageDisplayAction() {
  // Handle message display action clicks
  browser.messageDisplayAction.onClicked.addListener(async (tab, info) => {
    try {
      console.log('Message display action clicked', tab, info);
      
      // Get the current tab's messages using mailTabs API
      let message = null;
      try {
        const messageList = await browser.mailTabs.getSelectedMessages(tab.id);
        if (messageList.messages && messageList.messages.length > 0) {
          message = messageList.messages[0]; // Use the first selected message
        }
      } catch (error) {
        console.error('Error getting selected messages:', error);
        return;
      }

      if (!message) {
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/icon-48.png",
          title: "Jira Connector",
          message: "No email selected or displayed."
        });
        return;
      }

      // Check if this message already has a Jira issue linked
      const linkedIssue = await getLinkedJiraIssue(message.id);
      
      if (linkedIssue) {
        // Open the existing Jira issue
        await openJiraIssue(linkedIssue);
      } else {
        // Check if Jira is configured
        const isConfigured = await JiraAPI.isConfigured();
        if (!isConfigured) {
          browser.notifications.create({
            type: "basic",
            iconUrl: "icons/icon-48.png",
            title: "Jira Connector",
            message: "Please configure Jira settings in the extension options first."
          });
          browser.runtime.openOptionsPage();
          return;
        }

        // Create a new Jira issue from this message
        await processMessage(message);
      }

    } catch (error) {
      console.error('Error in message display action handler:', error);
      browser.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: "Jira Connector - Error",
        message: `Error: ${error.message}`
      });
    }
  });

  console.log('Message display action setup complete');
}

/**
 * Force refresh all button texts across all mail tabs
 */
async function forceRefreshAllButtonTexts() {
  try {
    console.log('Force refreshing all button texts...');
    const allTabs = await browser.tabs.query({});
    
    for (const tab of allTabs) {
      try {
        await updateButtonTextForCurrentMessage(tab.id);
        // Small delay between tab updates
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        // Ignore errors for non-mail tabs
      }
    }
    
    console.log('Force refresh completed');
  } catch (error) {
    console.error('Error in force refresh:', error);
  }
}

/**
 * Get linked Jira issue for a message
 */
async function getLinkedJiraIssue(messageId) {
  try {
    const storageKey = `jira_link_${messageId}`;
    console.log(`Looking for linked issue with key: ${storageKey}`);
    
    const result = await browser.storage.local.get(storageKey);
    const linkedIssue = result[storageKey] || null;
    
    if (linkedIssue) {
      console.log(`Found linked issue for message ${messageId}:`, linkedIssue);
    } else {
      console.log(`No linked issue found for message ${messageId}`);
    }
    
    return linkedIssue;
  } catch (error) {
    console.error('Error getting linked Jira issue:', error);
    return null;
  }
}

/**
 * Get linked Jira issue for a message
 */
async function getLinkedJiraIssue(messageId) {
  try {
    const storageKey = `jira_link_${messageId}`;
    console.log(`Looking for linked issue with key: ${storageKey}`);
    
    const result = await browser.storage.local.get(storageKey);
    const linkedIssue = result[storageKey] || null;
    
    if (linkedIssue) {
      console.log(`Found linked issue for message ${messageId}:`, linkedIssue);
    } else {
      console.log(`No linked issue found for message ${messageId}`);
    }
    
    return linkedIssue;
  } catch (error) {
    console.error('Error getting linked Jira issue:', error);
    return null;
  }
}

/**
 * Store link between message and Jira issue
 */
async function storeJiraIssueLink(messageId, issueData) {
  try {
    const storageKey = `jira_link_${messageId}`;
    await browser.storage.local.set({
      [storageKey]: {
        key: issueData.key,
        url: issueData.self || `${await getJiraBaseUrl()}/browse/${issueData.key}`,
        createdAt: new Date().toISOString()
      }
    });
    console.log(`Stored Jira issue link: ${messageId} -> ${issueData.key}`);
  } catch (error) {
    console.error('Error storing Jira issue link:', error);
  }
}

/**
 * Open Jira issue in browser
 */
async function openJiraIssue(linkedIssue) {
  try {
    let issueUrl = linkedIssue.url;
    
    // If URL is not stored or is the API URL, construct the browse URL
    if (!issueUrl || issueUrl.includes('/rest/api/')) {
      const baseUrl = await getJiraBaseUrl();
      issueUrl = `${baseUrl}/browse/${linkedIssue.key}`;
    }

    // Open the issue in default browser
    await browser.windows.openDefaultBrowser(issueUrl);
    
    browser.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Jira Connector",
      message: `Opening Jira issue: ${linkedIssue.key}`
    });

  } catch (error) {
    console.error('Error opening Jira issue:', error);
    browser.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Jira Connector - Error",
      message: `Failed to open issue: ${error.message}`
    });
  }
}

/**
 * Get Jira base URL from settings
 */
async function getJiraBaseUrl() {
  try {
    const settings = await browser.storage.local.get('jiraBaseUrl');
    return settings.jiraBaseUrl || '';
  } catch (error) {
    console.error('Error getting Jira base URL:', error);
    return '';
  }
}
