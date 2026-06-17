// Application State
let updates = [];
let activeCategory = 'All';
let searchQuery = '';

// DOM Elements
const notesGrid = document.getElementById('notes-grid');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterTabsContainer = document.getElementById('filter-tabs-container');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIconDark = document.getElementById('theme-icon-dark');
const themeIconLight = document.getElementById('theme-icon-light');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Stats Elements
const lastUpdatedVal = document.getElementById('last-updated-val');
const totalCountVal = document.getElementById('total-count-val');
const featureCountVal = document.getElementById('feature-count-val');
const announcementCountVal = document.getElementById('announcement-count-val');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const tweetWarning = document.getElementById('tweet-warning');
const postTweetBtn = document.getElementById('post-tweet-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// Initialize the Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        toggleClearButton();
        filterAndRenderUpdates();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        toggleClearButton();
        filterAndRenderUpdates();
        searchInput.focus();
    });
    
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        activeCategory = 'All';
        toggleClearButton();
        filterAndRenderUpdates();
    });
    
    exportCsvBtn.addEventListener('click', exportToCSV);
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Modal Close Listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Textarea character count listener
    tweetTextarea.addEventListener('input', updateCharCount);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        // Focus search bar on pressing '/' if not already inside an input/textarea
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            searchInput.focus();
            showToast('Search focused. Type to filter updates.', 'info');
        }
        // Clear search on pressing 'Esc' if search input is focused
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            searchQuery = '';
            toggleClearButton();
            filterAndRenderUpdates();
            searchInput.blur();
            showToast('Search cleared', 'info');
        }
    });
}

// Show/Hide search clear button
function toggleClearButton() {
    if (searchInput.value.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
}

// Fetch Release Notes from backend
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading();
    
    const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not OK');
        
        const data = await response.json();
        if (data.status === 'success') {
            updates = data.updates;
            updateStats(data.last_updated);
            renderCategoryTabs();
            filterAndRenderUpdates();
        } else {
            console.error('API Error:', data.message);
            alert(`Failed to load release notes: ${data.message}`);
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        alert('Could not fetch release notes. Please check if the Flask server is running.');
    } finally {
        hideLoading();
    }
}

// Manage UI Loading States
function showLoading() {
    refreshIcon.classList.add('spinning');
    refreshBtn.disabled = true;
    notesGrid.style.display = 'none';
    emptyState.style.display = 'none';
    skeletonLoader.style.display = 'grid';
}

function hideLoading() {
    refreshIcon.classList.remove('spinning');
    refreshBtn.disabled = false;
    skeletonLoader.style.display = 'none';
}

// Compute and Update Dashboard Stats
function updateStats(lastUpdatedTime) {
    lastUpdatedVal.textContent = lastUpdatedTime || 'Never';
    totalCountVal.textContent = updates.length;
    
    const featureCount = updates.filter(u => u.category.toLowerCase() === 'feature').length;
    const announcementCount = updates.filter(u => u.category.toLowerCase() === 'announcement').length;
    
    featureCountVal.textContent = featureCount;
    announcementCountVal.textContent = announcementCount;
}

// Categorize and Render Tabs
function renderCategoryTabs() {
    // Count occurrences of each category
    const counts = { 'All': updates.length };
    updates.forEach(u => {
        counts[u.category] = (counts[u.category] || 0) + 1;
    });
    
    // Sort categories (keep 'All' first, then sort alphabetically)
    const sortedCategories = Object.keys(counts).sort((a, b) => {
        if (a === 'All') return -1;
        if (b === 'All') return 1;
        return a.localeCompare(b);
    });
    
    filterTabsContainer.innerHTML = '';
    
    sortedCategories.forEach(category => {
        // Only show tabs that have items
        if (counts[category] === 0) return;
        
        const tab = document.createElement('button');
        tab.className = `filter-tab ${activeCategory === category ? 'active' : ''}`;
        
        // Custom labels for tabs if needed
        const displayLabel = category === 'All' ? 'All Updates' : category;
        
        tab.innerHTML = `
            <span>${displayLabel}</span>
            <span class="tab-badge">${counts[category]}</span>
        `;
        
        tab.addEventListener('click', () => {
            activeCategory = category;
            
            // Update active states on DOM
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            filterAndRenderUpdates();
        });
        
        filterTabsContainer.appendChild(tab);
    });
}

// Filter and Render updates grid
function filterAndRenderUpdates() {
    // Apply Filters
    const filtered = updates.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        
        const matchesSearch = searchQuery === '' || 
            item.category.toLowerCase().includes(searchQuery) ||
            item.date.toLowerCase().includes(searchQuery) ||
            item.tweet_text.toLowerCase().includes(searchQuery) ||
            item.html_content.toLowerCase().includes(searchQuery);
            
        return matchesCategory && matchesSearch;
    });
    
    // Render Results
    if (filtered.length === 0) {
        notesGrid.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
        notesGrid.innerHTML = '';
        
        filtered.forEach(item => {
            const card = createCardElement(item);
            notesGrid.appendChild(card);
        });
        
        notesGrid.style.display = 'grid';
    }
}

// Get proper CSS badge class based on category
function getBadgeClass(category) {
    const cat = category.toLowerCase();
    if (cat.includes('feature')) return 'badge-feature';
    if (cat.includes('announcement')) return 'badge-announcement';
    if (cat.includes('issue')) return 'badge-issue';
    if (cat.includes('breaking')) return 'badge-breaking';
    if (cat.includes('change')) return 'badge-change';
    return 'badge-general';
}

// Create Card DOM Element
function createCardElement(item) {
    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('data-id', item.id);
    
    const badgeClass = getBadgeClass(item.category);
    
    card.innerHTML = `
        <div class="card-header">
            <span class="card-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                ${item.date}
            </span>
            <span class="badge ${badgeClass}">${item.category}</span>
        </div>
        <div class="card-body">
            ${item.html_content}
        </div>
        <div class="card-footer">
            <button class="btn btn-secondary copy-btn" title="Copy plain text to clipboard">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span class="copy-text">Copy</span>
            </button>
            <button class="btn btn-tweet select-tweet-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px;">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Select to Tweet</span>
            </button>
        </div>
    `;
    
    // Wire up Copy trigger
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
        const textToCopy = `[BigQuery Release - ${item.date}] ${item.category}:\n${item.tweet_text}`;
        try {
            await navigator.clipboard.writeText(textToCopy);
            
            // Show feedback state
            copyBtn.classList.add('copied');
            const copyText = copyBtn.querySelector('.copy-text');
            copyText.textContent = 'Copied!';
            
            // Switch copy icon to a checkmark
            const originalIcon = copyBtn.querySelector('svg').innerHTML;
            copyBtn.querySelector('svg').innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`;
            
            // Show toast message
            showToast('Copied update text to clipboard!', 'success');
            
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyText.textContent = 'Copy';
                copyBtn.querySelector('svg').innerHTML = originalIcon;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard.');
        }
    });

    // Wire up Tweet Composer trigger
    card.querySelector('.select-tweet-btn').addEventListener('click', () => {
        openTweetModal(item);
    });
    
    return card;
}

// Open Tweet Composer Modal
function openTweetModal(item) {
    // Construct tweet text with [Date] [Category] prefix and hashtags
    const headerPrefix = `[BigQuery Release - ${item.date}] ${item.category}:\n`;
    const hashtags = `\n\n#GoogleCloud #BigQuery`;
    
    // Limit body content to fit within 280 characters with prefix & hashtags
    const currentLength = headerPrefix.length + hashtags.length;
    const availableLength = 280 - currentLength;
    
    let tweetBody = item.tweet_text;
    if (tweetBody.length > availableLength) {
        tweetBody = tweetBody.substring(0, availableLength - 4) + '...';
    }
    
    const initialText = `${headerPrefix}${tweetBody}${hashtags}`;
    
    tweetTextarea.value = initialText;
    updateCharCount();
    
    // Open the modal
    tweetModal.style.display = 'flex';
    tweetTextarea.focus();
    
    // Wire up post action
    postTweetBtn.onclick = () => {
        const text = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
        closeTweetModal();
    };
}

// Close Tweet Modal
function closeTweetModal() {
    tweetModal.style.display = 'none';
}

// Live Character Counting
function updateCharCount() {
    const textLength = tweetTextarea.value.length;
    charCounter.textContent = `${textLength} / 280`;
    
    if (textLength > 280) {
        charCounter.classList.add('warning');
        tweetWarning.style.display = 'block';
        postTweetBtn.disabled = true;
        postTweetBtn.style.opacity = 0.5;
        postTweetBtn.style.cursor = 'not-allowed';
    } else {
        charCounter.classList.remove('warning');
        tweetWarning.style.display = 'none';
        postTweetBtn.disabled = false;
        postTweetBtn.style.opacity = 1;
        postTweetBtn.style.cursor = 'pointer';
    }
}

// Theme Management Functions
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIconDark.style.display = 'none';
        themeIconLight.style.display = 'block';
    } else {
        document.body.classList.remove('light-theme');
        themeIconDark.style.display = 'block';
        themeIconLight.style.display = 'none';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if (isLight) {
        themeIconDark.style.display = 'none';
        themeIconLight.style.display = 'block';
        showToast('Switched to Light Mode', 'info');
    } else {
        themeIconDark.style.display = 'block';
        themeIconLight.style.display = 'none';
        showToast('Switched to Dark Mode', 'info');
    }
}

// Export current filtered updates to CSV
function exportToCSV() {
    const filtered = updates.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = searchQuery === '' || 
            item.category.toLowerCase().includes(searchQuery) ||
            item.date.toLowerCase().includes(searchQuery) ||
            item.tweet_text.toLowerCase().includes(searchQuery) ||
            item.html_content.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });
    
    if (filtered.length === 0) {
        alert('No data to export.');
        return;
    }
    
    const csvRows = [];
    csvRows.push(['Date', 'Category', 'Update Content', 'Plain Text'].map(escapeCSVField).join(','));
    
    filtered.forEach(item => {
        const row = [
            item.date,
            item.category,
            item.html_content,
            item.tweet_text
        ];
        csvRows.push(row.map(escapeCSVField).join(','));
    });
    
    const csvContent = "\ufeff" + csvRows.join('\n'); // Add BOM for Excel compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bigquery_release_notes_${activeCategory.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Successfully exported ${filtered.length} release notes to CSV.`, 'success');
}

function escapeCSVField(val) {
    if (val === undefined || val === null) return '""';
    let str = String(val);
    str = str.replace(/"/g, '""');
    return `"${str}"`;
}

// Toast Notification System Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = `<svg class="btn-icon" style="color: #10b981; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
    } else if (type === 'info') {
        icon = `<svg class="btn-icon" style="color: #3b82f6; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else {
        icon = `<svg class="btn-icon" style="color: #ef4444; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
    }
    
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}
