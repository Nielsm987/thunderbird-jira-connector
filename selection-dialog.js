/**
 * Jira Project & Issue Type Selection Dialog
 * Handles the UI for selecting project and issue type when creating issues
 */

let projects = [];
let selectedProject = null;
let selectedIssueType = null;
let projectIssueTypes = []; // Store issue types for selected project

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Selection dialog loaded');
    
    // Get email subject from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const emailSubject = urlParams.get('subject') || 'No subject';
    document.getElementById('emailSubject').textContent = emailSubject;
    
    // Setup event listeners
    setupEventListeners();
    
    // Load data from background script
    await loadData();
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Project search
    document.getElementById('projectSearch').addEventListener('input', handleProjectSearch);
    
    // Buttons
    document.getElementById('cancelBtn').addEventListener('click', handleCancel);
    document.getElementById('createBtn').addEventListener('click', handleCreate);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeydown);
}

/**
 * Load projects and issue types from background script
 */
async function loadData() {
    try {
        // Request data from background script
        const response = await browser.runtime.sendMessage({ type: 'GET_DATA' });
        
        if (response && response.projects) {
            projects = response.projects;
            
            console.log('Loaded data:', { 
                projectCount: projects.length
            });
            
            renderProjects();
        } else {
            throw new Error('Failed to load projects');
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError(`Failed to load data: ${error.message}`);
    }
}

/**
 * Handle project search input
 */
function handleProjectSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    let filteredProjects;
    if (searchTerm === '') {
        filteredProjects = [...projects];
    } else {
        filteredProjects = projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm) ||
            project.key.toLowerCase().includes(searchTerm)
        );
    }
    
    renderProjects(filteredProjects);
}

/**
 * Render the projects list
 */
function renderProjects(filteredProjects = projects) {
    const container = document.getElementById('projectList');
    
    if (filteredProjects.length === 0) {
        container.innerHTML = '<div class="no-results">No projects found matching your search</div>';
        return;
    }
    
    container.innerHTML = '';
    
    filteredProjects.forEach(project => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.dataset.projectId = project.id;
        
        projectItem.innerHTML = `
            <span class="project-name">${escapeHtml(project.name)}</span>
            <span class="project-key">[${escapeHtml(project.key)}]</span>
        `;
        
        projectItem.addEventListener('click', () => selectProject(project));
        
        container.appendChild(projectItem);
    });
}

/**
 * Select a project and load its issue types
 */
async function selectProject(project) {
    try {
        selectedProject = project;
        selectedIssueType = null; // Reset issue type selection
        projectIssueTypes = []; // Clear previous issue types
        
        // Update UI
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        document.querySelector(`[data-project-id="${project.id}"]`).classList.add('selected');
        
        // Show loading state for issue types
        const issueTypeContainer = document.getElementById('issueTypeList');
        issueTypeContainer.innerHTML = '<div class="loading">Loading issue types...</div>';
        
        // Load project-specific issue types
        const response = await browser.runtime.sendMessage({ 
            type: 'GET_PROJECT_ISSUE_TYPES', 
            projectKey: project.key 
        });
        
        if (response.success) {
            projectIssueTypes = response.issueTypes;
            renderIssueTypes();
        } else {
            throw new Error(response.error || 'Failed to load issue types');
        }
        
        updateCreateButton();
        
        console.log('Selected project:', project, 'Issue types:', projectIssueTypes.length);
        
    } catch (error) {
        console.error('Error selecting project:', error);
        showError(`Error loading issue types: ${error.message}`);
    }
}

/**
 * Render the issue types list
 */
function renderIssueTypes() {
    const container = document.getElementById('issueTypeList');
    
    if (!selectedProject) {
        container.innerHTML = '<div class="loading">Select a project first...</div>';
        return;
    }
    
    if (projectIssueTypes.length === 0) {
        container.innerHTML = '<div class="no-results">No issue types available for this project</div>';
        return;
    }
    
    container.innerHTML = '';
    
    // Filter out subtasks
    const availableIssueTypes = projectIssueTypes.filter(type => !type.subtask);
    
    if (availableIssueTypes.length === 0) {
        container.innerHTML = '<div class="no-results">No standard issue types available for this project</div>';
        return;
    }
    
    availableIssueTypes.forEach(issueType => {
        const issueTypeItem = document.createElement('div');
        issueTypeItem.className = 'issuetype-item';
        issueTypeItem.dataset.issueTypeId = issueType.id;
        
        issueTypeItem.innerHTML = `
            <div class="issuetype-name">${escapeHtml(issueType.name)}</div>
            ${issueType.description ? `<div class="issuetype-description">${escapeHtml(issueType.description)}</div>` : ''}
        `;
        
        issueTypeItem.addEventListener('click', () => selectIssueType(issueType));
        
        container.appendChild(issueTypeItem);
    });
}

/**
 * Select an issue type
 */
function selectIssueType(issueType) {
    selectedIssueType = issueType;
    
    // Update UI
    document.querySelectorAll('.issuetype-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    document.querySelector(`[data-issue-type-id="${issueType.id}"]`).classList.add('selected');
    
    updateCreateButton();
    
    console.log('Selected issue type:', issueType);
}

/**
 * Update the create button state
 */
function updateCreateButton() {
    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = !(selectedProject && selectedIssueType);
}

/**
 * Handle cancel button click
 */
function handleCancel() {
    browser.runtime.sendMessage({ 
        type: 'CANCEL_SELECTION' 
    });
    window.close();
}

/**
 * Handle create button click
 */
function handleCreate() {
    if (!selectedProject || !selectedIssueType) {
        showError('Please select both a project and an issue type');
        return;
    }
    
    const result = {
        project: selectedProject,
        issueType: selectedIssueType
    };
    
    console.log('Sending selection result:', result);
    
    browser.runtime.sendMessage({ 
        type: 'SELECTION_RESULT',
        data: result
    });
    
    // Dialog will be closed by the background script
}

/**
 * Handle keyboard shortcuts
 */
function handleKeydown(event) {
    if (event.key === 'Escape') {
        handleCancel();
    } else if (event.key === 'Enter' && !document.getElementById('createBtn').disabled) {
        handleCreate();
    }
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.getElementById('errorContainer');
    container.innerHTML = `<div class="error">❌ ${escapeHtml(message)}</div>`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
