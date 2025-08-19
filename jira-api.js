/**
 * Jira API Helper Module
 * Handles all communication with Jira REST API
 */

const JiraAPI = {
  
  /**
   * Check if Jira is properly configured
   */
  async isConfigured() {
    try {
      const settings = await browser.storage.local.get([
        'jiraBaseUrl',
        'jiraUsername',
        'jiraApiToken'
      ]);
      
      return !!(settings.jiraBaseUrl && settings.jiraUsername && settings.jiraApiToken);
    } catch (error) {
      console.error('Error checking Jira configuration:', error);
      return false;
    }
  },

  /**
   * Get Jira settings from storage
   */
  async getSettings() {
    try {
      const settings = await browser.storage.local.get([
        'jiraBaseUrl',
        'jiraUsername', 
        'jiraApiToken'
      ]);
      
      if (!settings.jiraBaseUrl || !settings.jiraUsername || !settings.jiraApiToken) {
        throw new Error('Jira not configured. Please check your settings.');
      }
      
      return settings;
    } catch (error) {
      console.error('Error getting Jira settings:', error);
      throw error;
    }
  },

  /**
   * Get CSRF token from Jira
   * @returns {Promise<string>} - CSRF token
   */
  async getCSRFToken() {
    try {
      const settings = await this.getSettings();
      const baseUrl = settings.jiraBaseUrl.replace(/\/$/, '');
      const url = `${baseUrl}/rest/api/3/myself`;
      
      const credentials = btoa(`${settings.jiraUsername}:${settings.jiraApiToken}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      });
      
      // Try to get CSRF token from response headers
      const csrfToken = response.headers.get('X-ATLASSIAN-TOKEN') || 
                       response.headers.get('X-CSRF-TOKEN') ||
                       response.headers.get('CSRF-Token');
      
      return csrfToken;
    } catch (error) {
      console.log('Could not get CSRF token:', error);
      return null;
    }
  },

  /**
   * Alternative method to create issue using a different approach
   */
  async createIssueAlternative(issueData) {
    try {
      const settings = await this.getSettings();
      const baseUrl = settings.jiraBaseUrl.replace(/\/$/, '');
      
      // First, try to establish a session
      const sessionUrl = `${baseUrl}/rest/auth/1/session`;
      const credentials = btoa(`${settings.jiraUsername}:${settings.jiraApiToken}`);
      
      // Try the standard approach first
      return await this.makeRequest('issue', 'POST', issueData);
      
    } catch (error) {
      console.log('Standard approach failed, trying alternative...');
      
      try {
        // Try Bearer token authentication
        console.log('Trying Bearer token authentication...');
        return await this.createIssueWithBearerAuth(issueData);
      } catch (bearerError) {
        console.log('Bearer auth failed, trying API v2...');
        try {
          // Try API v2 endpoint
          console.log('Trying API v2 endpoint...');
          return await this.createIssueWithV2API(issueData);
        } catch (v2Error) {
          console.log('V2 API failed, trying XMLHttpRequest...');
          // If v2 also fails, try with XMLHttpRequest
          return await this.createIssueWithXHR(issueData);
        }
      }
    }
  },

  /**
   * Create issue using XMLHttpRequest (fallback method)
   */
  async createIssueWithXHR(issueData) {
    return new Promise(async (resolve, reject) => {
      try {
        const settings = await this.getSettings();
        const baseUrl = settings.jiraBaseUrl.replace(/\/$/, '');
        const url = `${baseUrl}/rest/api/3/issue`;
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        
        // Set headers
        const credentials = btoa(`${settings.jiraUsername}:${settings.jiraApiToken}`);
        xhr.setRequestHeader('Authorization', `Basic ${credentials}`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-Atlassian-Token', 'no-check');
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                resolve(xhr.responseText);
              }
            } else {
              let errorMessage = `HTTP ${xhr.status}: ${xhr.statusText}`;
              if (xhr.responseText) {
                try {
                  const errorData = JSON.parse(xhr.responseText);
                  if (errorData.errorMessages && errorData.errorMessages.length > 0) {
                    errorMessage = errorData.errorMessages.join(', ');
                  }
                } catch (e) {
                  errorMessage = xhr.responseText;
                }
              }
              reject(new Error(errorMessage));
            }
          }
        };
        
        xhr.send(JSON.stringify(issueData));
        
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Create issue using Bearer token (alternative auth method)
   */
  async createIssueWithBearerAuth(issueData) {
    try {
      const settings = await this.getSettings();
      const baseUrl = settings.jiraBaseUrl.replace(/\/$/, '');
      const url = `${baseUrl}/rest/api/3/issue`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.jiraApiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Atlassian-Token': 'no-check',
          'User-Agent': 'ThunderbirdJiraConnector/1.0'
        },
        body: JSON.stringify(issueData)
      });
      
      console.log('Bearer auth response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bearer auth failed: ${errorText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.log('Bearer auth failed:', error.message);
      throw error;
    }
  },

  /**
   * Create issue using API v2 (alternative endpoint)
   */
  async createIssueWithV2API(issueData) {
    try {
      const settings = await this.getSettings();
      const baseUrl = settings.jiraBaseUrl.replace(/\/$/, '');
      const url = `${baseUrl}/rest/api/2/issue`;
      
      // Convert v3 payload to v2 format
      const v2Payload = {
        fields: {
          project: issueData.fields.project,
          summary: issueData.fields.summary,
          description: issueData.fields.description.content[0].content[0].text, // Convert doc format to plain text
          issuetype: issueData.fields.issuetype
        }
      };
      
      const credentials = btoa(`${settings.jiraUsername}:${settings.jiraApiToken}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Atlassian-Token': 'no-check',
          'User-Agent': 'ThunderbirdJiraConnector/1.0'
        },
        body: JSON.stringify(v2Payload)
      });
      
      console.log('V2 API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      return await response.json();
      
    } catch (error) {
      console.log('V2 API also failed:', error.message);
      throw error;
    }
  },

  /**
   * Make authenticated request to Jira API
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const settings = await this.getSettings();
      
      // Ensure baseUrl doesn't end with slash
      const baseUrl = settings.jiraBaseUrl.replace(/\/$/, '');
      const url = `${baseUrl}/rest/api/3/${endpoint}`;
      
      // Create basic auth header
      const credentials = btoa(`${settings.jiraUsername}:${settings.jiraApiToken}`);
      
      // Get CSRF token for POST/PUT requests
      let csrfToken = null;
      if (method === 'POST' || method === 'PUT') {
        csrfToken = await this.getCSRFToken();
      }
      
      const options = {
        method: method,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Atlassian-Token': 'no-check',
          'Origin': baseUrl
        }
      };
      
      // Add CSRF token if we have one
      if (csrfToken) {
        options.headers['X-CSRF-TOKEN'] = csrfToken;
      }
      
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }
      
      console.log(`Making ${method} request to:`, url);
      console.log('Request options:', { ...options, headers: { ...options.headers, Authorization: '[REDACTED]' } });
      
      // Use fetch API
      const response = await fetch(url, options);
      
      console.log('Response status:', response.status, response.statusText);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorText = await response.text();
          console.log('Error response text:', errorText);
          
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.errorMessages && errorData.errorMessages.length > 0) {
                errorMessage = errorData.errorMessages.join(', ');
              } else if (errorData.message) {
                errorMessage = errorData.message;
              }
            } catch (e) {
              // Not JSON, use text as-is
              errorMessage = `${errorMessage} - ${errorText}`;
            }
          }
        } catch (e) {
          console.log('Could not read error response:', e);
        }
        
        // Provide specific error messages based on status codes
        if (response.status === 401) {
          throw new Error('Authentication failed: Please check your email and API token.');
        } else if (response.status === 403) {
          if (errorMessage.includes('XSRF') || errorMessage.includes('CSRF')) {
            throw new Error('CSRF protection error: This may be due to Jira security settings. Contact your administrator.');
          }
          throw new Error('Access denied: Your account may not have permission to access Jira API.');
        } else if (response.status === 404) {
          throw new Error('API endpoint not found: Please verify your Jira URL is correct.');
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log(`${method} ${endpoint} response:`, result);
      return result;
      
    } catch (error) {
      console.error(`Error making Jira API request to ${endpoint}:`, error);
      
      // Provide more specific error messages
      if (error.name === 'TypeError' && (error.message.includes('NetworkError') || error.message.includes('Failed to fetch'))) {
        throw new Error('Network error: Unable to connect to Jira. This may be due to CORS policy, network issues, or an invalid URL. Please verify your Jira URL and check if your Jira instance allows API access.');
      } else if (error.message.includes('CORS')) {
        throw new Error('CORS error: Your Jira instance may not allow cross-origin requests. Contact your Jira administrator or try using a Jira instance that supports API access from extensions.');
      }
      
      throw error;
    }
  },

  /**
   * Test connection to Jira
   */
  async testConnection() {
    try {
      const result = await this.makeRequest('myself');
      return {
        success: true,
        user: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get list of Jira projects
   */
  async getProjects() {
    try {
      const response = await this.makeRequest('project/search?maxResults=100');
      return response.values || [];
    } catch (error) {
      console.error('Error fetching Jira projects:', error);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  },

  /**
   * Get list of issue types
   */
  async getIssueTypes() {
    try {
      const response = await this.makeRequest('issuetype');
      return response || [];
    } catch (error) {
      console.error('Error fetching Jira issue types:', error);
      throw new Error(`Failed to fetch issue types: ${error.message}`);
    }
  },

  /**
   * Get issue types for a specific project
   */
  async getProjectIssueTypes(projectKey) {
    try {
      const response = await this.makeRequest(`project/${projectKey}`);
      return response.issueTypes || [];
    } catch (error) {
      console.error('Error fetching project issue types:', error);
      throw new Error(`Failed to fetch issue types for project: ${error.message}`);
    }
  },

  /**
   * Create a new Jira issue
   */
  async createIssue(issueData) {
    try {
      const payload = {
        fields: {
          project: {
            key: issueData.project.key
          },
          summary: issueData.summary,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: issueData.description
                  }
                ]
              }
            ]
          },
          issuetype: {
            id: issueData.issueType.id
          }
        }
      };

      console.log('Creating Jira issue with payload:', payload);
      
      // Try the alternative approach first
      const response = await this.createIssueAlternative(payload);
      
      return {
        id: response.id,
        key: response.key,
        self: response.self
      };
    } catch (error) {
      console.error('Error creating Jira issue:', error);
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  },

  /**
   * Search for projects by name
   */
  async searchProjects(query) {
    try {
      const response = await this.makeRequest(`project/search?query=${encodeURIComponent(query)}&maxResults=50`);
      return response.values || [];
    } catch (error) {
      console.error('Error searching Jira projects:', error);
      throw new Error(`Failed to search projects: ${error.message}`);
    }
  }
};

// Make JiraAPI available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JiraAPI;
} else {
  window.JiraAPI = JiraAPI;
}
