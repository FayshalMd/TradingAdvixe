// Initialize the dashboard when page loads and connect all modules
document.addEventListener('DOMContentLoaded', () => {
    // Add data-label attributes for responsive tables
    setupMobileTableAttributes();
    
    // Initialize the dashboard
    const dashboard = new CompleteCryptoDashboard();
    
    // Optionally attach to window object for debugging
    window.dashboard = dashboard;
    
    // Add listener to save data when closing to prevent data loss
    window.addEventListener('beforeunload', () => {
        if (dashboard && dashboard.cleanup) {
            dashboard.cleanup();
        }
    });
    
    // Handle visibility changes to pause/resume when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page hidden - reducing update frequency');
        } else {
            console.log('Page visible - resuming normal updates');
            dashboard.updateStats();
        }
    });
    
    // Handle window resize to reapply mobile attributes
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            setupMobileTableAttributes();
        }, 250);
    });
});

// Add function to reapply data-labels after table updates
function setupMobileTableAttributes() {
    // Don't run this on larger screens
    if (window.innerWidth > 768) return;
    
    console.log("Setting up mobile table attributes");
    
    // Get table headers
    const headers = Array.from(document.querySelectorAll('#signalsTable th')).map(th => {
        // Clean the header text by removing the sort arrow
        return th.textContent.replace('↕', '').trim();
    });
    
    // Apply attributes to existing rows
    updateTableRowAttributes(headers);
    
    // Set up a mutation observer to handle dynamically added rows
    setupTableObserver(headers);
}

// Update data-label attributes on all rows
function updateTableRowAttributes(headers) {
    const rows = document.querySelectorAll('#signalsTableBody tr');
    
    rows.forEach(row => {
        // Skip rows that might be placeholders or special messages
        if (row.children.length <= 1 && row.querySelector('.loading')) {
            return;
        }
        
        // Add data-label to each cell based on the corresponding header
        Array.from(row.cells).forEach((cell, index) => {
            if (headers[index]) {
                cell.setAttribute('data-label', headers[index]);
            }
        });
    });
}

// Setup mutation observer for dynamic table updates
function setupTableObserver(headers) {
    // If we already have an observer, disconnect it
    if (window.tableObserver) {
        window.tableObserver.disconnect();
    }
    
    // Create new observer
    window.tableObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // If rows were added
                mutation.addedNodes.forEach(node => {
                    // Check if the added node is a table row
                    if (node.nodeName === 'TR') {
                        // Add data-label to each cell
                        Array.from(node.cells || []).forEach((cell, index) => {
                            if (headers[index]) {
                                cell.setAttribute('data-label', headers[index]);
                            }
                        });
                    }
                });
                
                // Also check for full table refreshes
                if (mutation.target && mutation.target.id === 'signalsTableBody') {
                    updateTableRowAttributes(headers);
                }
            }
        });
    });
    
    // Start observing the tbody for changes
    const tableBody = document.getElementById('signalsTableBody');
    if (tableBody) {
        window.tableObserver.observe(tableBody, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize the current dashboard
(() => {
    // If the dashboard constructor already exists, don't initialize again
    if (typeof CompleteCryptoDashboard !== 'undefined') {
        window.dashboard = new CompleteCryptoDashboard();
    }
})();
