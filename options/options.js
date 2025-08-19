/**
 * Jira Connector Options Page Script
 * Handles the settings UI and configuration storage
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Options page loaded');
    
    // Load existing settings
    await loadSettings();
    
    // Setup event listeners
    setupEventListeners();
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Save settings form
    document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);
    
    // Test connection button
    document.getElementById('testConnection').addEventListener('click', handleTestConnection);
    
    // Reset settings button
    document.getElementById('resetSettings').addEventListener('click', handleResetSettings);
    
    // Real-time validation
    const inputs = ['jiraBaseUrl', 'jiraUsername', 'jiraApiToken'];
    inputs.forEach(inputId => {
        document.getElementById(inputId).addEventListener('input', clearStatus);
    });
}

/**
 * Load existing settings from storage
 */
async function loadSettings() {
    try {
        const settings = await browser.storage.local.get([
            'jiraBaseUrl',
            'jiraUsername',
            'jiraApiToken',
            'showNotifications',
            'stripSignatures'
        ]);
        
        // Populate form fields
        if (settings.jiraBaseUrl) {
            document.getElementById('jiraBaseUrl').value = settings.jiraBaseUrl;
        }
        
        if (settings.jiraUsername) {
            document.getElementById('jiraUsername').value = settings.jiraUsername;
        }
        
        if (settings.jiraApiToken) {
            document.getElementById('jiraApiToken').value = settings.jiraApiToken;
        }
        
        // Set checkbox values (default to true if not set)
        document.getElementById('showNotifications').checked = 
            settings.showNotifications !== false;
        document.getElementById('stripSignatures').checked = 
            settings.stripSignatures !== false;
            
        console.log('Settings loaded successfully');
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('error', 'Failed to load existing settings');
    }
}

/**
 * Handle save settings form submission
 */
async function handleSaveSettings(event) {
    event.preventDefault();
    
    const saveButton = document.getElementById('saveSettings');
    const originalText = saveButton.textContent;
    
    try {
        // Show saving state
        saveButton.textContent = '💾 Saving...';
        saveButton.disabled = true;
        
        // Get form data
        const formData = new FormData(event.target);
        const settings = {
            jiraBaseUrl: formData.get('jiraBaseUrl').trim(),
            jiraUsername: formData.get('jiraUsername').trim(),
            jiraApiToken: formData.get('jiraApiToken').trim(),
            showNotifications: formData.get('showNotifications') === 'on',
            stripSignatures: formData.get('stripSignatures') === 'on'
        };
        
        // Basic validation
        if (!settings.jiraBaseUrl || !settings.jiraUsername || !settings.jiraApiToken) {
            throw new Error('All fields are required');
        }
        
        // Validate URL format
        try {
            new URL(settings.jiraBaseUrl);
        } catch (e) {
            throw new Error('Please enter a valid Jira URL');
        }
        
        // Save to storage
        await browser.storage.local.set(settings);
        
        showStatus('success', '✅ Settings saved successfully!');
        console.log('Settings saved:', settings);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('error', `❌ Error: ${error.message}`);
    } finally {
        // Restore button state
        saveButton.textContent = originalText;
        saveButton.disabled = false;
    }
}

/**
 * Handle test connection button click
 */
async function handleTestConnection() {
    const testButton = document.getElementById('testConnection');
    const originalText = testButton.textContent;
    
    try {
        // Show testing state
        testButton.textContent = '🔍 Testing...';
        testButton.disabled = true;
        testButton.classList.add('loading');
        
        // Get current form values (don't require them to be saved first)
        const jiraBaseUrl = document.getElementById('jiraBaseUrl').value.trim();
        const jiraUsername = document.getElementById('jiraUsername').value.trim();
        const jiraApiToken = document.getElementById('jiraApiToken').value.trim();
        
        // Basic validation
        if (!jiraBaseUrl || !jiraUsername || !jiraApiToken) {
            throw new Error('Please fill in all connection fields first');
        }
        
        // Validate URL format
        try {
            new URL(jiraBaseUrl);
        } catch (e) {
            throw new Error('Please enter a valid Jira URL');
        }
        
        // Temporarily save settings for testing
        const tempSettings = {
            jiraBaseUrl,
            jiraUsername,
            jiraApiToken
        };
        
        // Store current settings
        const currentSettings = await browser.storage.local.get(['jiraBaseUrl', 'jiraUsername', 'jiraApiToken']);
        
        // Send test connection request to background script
        const response = await browser.runtime.sendMessage({
            type: 'TEST_JIRA_CONNECTION',
            settings: tempSettings
        });
        
        if (response.success) {
            const userName = response.user.displayName || response.user.name || 'Unknown';
            showConnectionStatus('success', `✅ Connection successful! Connected as: ${userName}`);
        } else {
            showConnectionStatus('error', `❌ Connection failed: ${response.error}`);
        }
        
    } catch (error) {
        console.error('Error testing connection:', error);
        showConnectionStatus('error', `❌ Error: ${error.message}`);
    } finally {
        // Restore button state
        testButton.textContent = originalText;
        testButton.disabled = false;
        testButton.classList.remove('loading');
    }
}

/**
 * Handle reset settings button click
 */
async function handleResetSettings() {
    if (!confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
        return;
    }
    
    try {
        // Clear storage
        await browser.storage.local.clear();
        
        // Reset form
        document.getElementById('settingsForm').reset();
        
        // Set default checkbox values
        document.getElementById('showNotifications').checked = true;
        document.getElementById('stripSignatures').checked = true;
        
        showStatus('info', '🔄 Settings reset to defaults');
        clearConnectionStatus();
        
        console.log('Settings reset successfully');
        
    } catch (error) {
        console.error('Error resetting settings:', error);
        showStatus('error', `❌ Error resetting settings: ${error.message}`);
    }
}

/**
 * Show status message
 */
function showStatus(type, message) {
    const statusElement = document.getElementById('saveStatus');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    
    // Auto-hide success/info messages after 5 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 5000);
    }
}

/**
 * Show connection status message
 */
function showConnectionStatus(type, message) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 5000);
    }
}

/**
 * Clear status messages
 */
function clearStatus() {
    const saveStatus = document.getElementById('saveStatus');
    const connectionStatus = document.getElementById('connectionStatus');
    
    if (saveStatus) {
        saveStatus.textContent = '';
        saveStatus.className = 'status-message';
    }
    
    if (connectionStatus) {
        connectionStatus.textContent = '';
        connectionStatus.className = 'status-message';
    }
}

/**
 * Clear connection status message
 */
function clearConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = '';
    statusElement.className = 'status-message';
}
