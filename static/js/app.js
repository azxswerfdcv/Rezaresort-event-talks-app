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
    
    // Modal Close Listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Textarea character count listener
    tweetTextarea.addEventListener('input', updateCharCount);
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
            <button class="btn btn-tweet select-tweet-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px;">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Select to Tweet</span>
            </button>
        </div>
    `;
    
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
