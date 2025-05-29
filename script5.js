// Event Handling, Updates and Initialization
CompleteCryptoDashboard.prototype.startUpdateLoop = function() {
    // Update timestamps every 10 seconds (increased from 5)
    this.timestampInterval = setInterval(() => {
        document.querySelectorAll('.timestamp').forEach(cell => {
            const row = cell.parentElement;
            const symbol = row.children[0].textContent;
            const data = this.priceData.get(symbol);
            if (data) {
                cell.textContent = this.formatTimestamp(data.lastUpdated);
            }
        });
    }, 10000);

    // Periodic signal recalculation for symbols without real-time updates
    this.signalRecalculationInterval = setInterval(() => {
        console.log('Performing periodic signal recalculation...');
        this.calculateAllSignals();
        this.updateStats();
        
        // Refresh table if needed
        if (this.shouldRefreshTable()) {
            this.renderTable();
        }
    }, 60000); // Increased from 30 seconds to 60 seconds

    // Memory cleanup every 2 minutes (reduced from 5)
    this.memoryCleanupInterval = setInterval(() => {
        this.performMemoryCleanup();
    }, 120000);

    // Connection health check every 2 minutes (increased from 1)
    this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
    }, 120000);

    // Performance monitoring every 30 seconds
    this.performanceInterval = setInterval(() => {
        this.monitorPerformance();
    }, 30000);
};

CompleteCryptoDashboard.prototype.startSentimentUpdates = function() {
    this.updateSentiment(); // Initial update
    
    // Update sentiment every 5 minutes
    this.sentimentInterval = setInterval(() => {
        this.updateSentiment();
    }, 300000); // 5 minutes
};

CompleteCryptoDashboard.prototype.updateSentiment = async function() {
    try {
        if (!this.isOnline) {
            console.log('Offline, skipping sentiment update');
            return;
        }
        
        // Use a reliable proxy for alternative.me API to avoid CORS issues
        const response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://api.alternative.me/fng/?limit=1&format=json'));
        const result = await response.json();
        const data = JSON.parse(result.contents);

        if (data && data.data && data.data.length > 0) {
            const sentiment = data.data[0];
            this.greedFearIndex = parseInt(sentiment.value);
            const classification = sentiment.value_classification;
            const timestamp = parseInt(sentiment.timestamp) * 1000;

            this.displaySentiment(this.greedFearIndex, classification, timestamp);
            this.lastSentimentUpdate = Date.now();
            
            // Optionally, fetch other market indicators if needed
            // await this.fetchAdditionalMarketData(); 
        } else {
            console.warn('No data from sentiment API');
            this.displaySentiment(this.greedFearIndex, this.getSentimentLabel(this.greedFearIndex), this.lastSentimentUpdate, true);
        }
    } catch (error) {
        console.error('Error fetching sentiment data:', error);
        this.displaySentiment(this.greedFearIndex, this.getSentimentLabel(this.greedFearIndex), this.lastSentimentUpdate, true);
    }
};

CompleteCryptoDashboard.prototype.displaySentiment = function(value, label, timestamp, isError = false) {
    const needle = document.getElementById('greedNeedle');
    const valueEl = document.getElementById('greedValue');
    const labelEl = document.getElementById('greedLabel');
    const descriptionEl = document.getElementById('greedDescription');
    const updatedEl = document.getElementById('sentimentUpdated');

    // Calculate rotation (0 = Extreme Fear, 180 = Extreme Greed)
    // Meter range is -90 (left) to +90 (right)
    const rotation = (value / 100) * 180 - 90;
    
    needle.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    valueEl.textContent = value;
    labelEl.textContent = label;
    labelEl.style.color = this.getSentimentColor(value);
    
    descriptionEl.textContent = this.getSentimentDescription(value);

    if (isError) {
        updatedEl.textContent = 'Last updated: Error (Using cached value)';
        updatedEl.style.color = '#ff6b6b';
    } else if (timestamp > 0) {
        updatedEl.textContent = `Last updated: ${new Date(timestamp).toLocaleString()}`;
        updatedEl.style.color = '#666';
    } else {
        updatedEl.textContent = 'Last updated: Loading...';
        updatedEl.style.color = '#666';
    }
    
    // Update market indicators (dummy data for now, replace with actual API calls)
    document.getElementById('volatilityValue').textContent = 'Medium';
    document.getElementById('volumeValue').textContent = this.formatVolume(this.getTotalMarketVolume());
    document.getElementById('dominanceValue').textContent = '45.2%'; // Example
};

CompleteCryptoDashboard.prototype.getSentimentColor = function(value) {
    if (value <= 25) return '#ff4444'; // Extreme Fear
    if (value <= 45) return '#ff8800'; // Fear
    if (value <= 55) return '#ffdd00'; // Neutral
    if (value <= 75) return '#88dd00'; // Greed
    return '#00dd00'; // Extreme Greed
};

CompleteCryptoDashboard.prototype.getSentimentLabel = function(value) {
    if (value <= 25) return 'Extreme Fear';
    if (value <= 45) return 'Fear';
    if (value <= 55) return 'Neutral';
    if (value <= 75) return 'Greed';
    return 'Extreme Greed';
};

CompleteCryptoDashboard.prototype.getSentimentDescription = function(value) {
    if (value <= 25) return 'Investors are extremely fearful, indicating potential buying opportunities.';
    if (value <= 45) return 'Market sentiment is fearful, suggesting caution.';
    if (value <= 55) return 'Market sentiment is neutral, balanced between greed and fear.';
    if (value <= 75) return 'Investors are becoming greedy, possibly overbuying.';
    return 'Market is in extreme greed, be cautious of potential corrections.';
};

CompleteCryptoDashboard.prototype.getTotalMarketVolume = function() {
    let totalVolume = 0;
    for (const data of this.priceData.values()) {
        totalVolume += data.quoteVolume || 0;
    }
    return totalVolume;
};

CompleteCryptoDashboard.prototype.setupEventListeners = function() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        clearSearch.style.display = this.searchTerm ? 'block' : 'none';
        this.currentPage = 1;
        this.renderTable();
    });

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        this.searchTerm = '';
        clearSearch.style.display = 'none';
        this.renderTable();
    });

    // Filter functionality
    document.getElementById('symbolFilter').addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.currentPage = 1;
        this.renderTable();
    });

    // Sort functionality
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.renderTable();
    });

    // Table header sorting with touch support
    document.querySelectorAll('th[data-sort]').forEach(th => {
        const handleSort = () => {
            const newSort = th.dataset.sort;
            if (this.currentSort === newSort) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.currentSort = newSort;
                this.sortDirection = 'desc';
            }
            
            // Update sort arrows
            document.querySelectorAll('.sort-arrow').forEach(arrow => arrow.textContent = '↕');
            th.querySelector('.sort-arrow').textContent = this.sortDirection === 'asc' ? '↑' : '↓';
            
            this.renderTable();
        };

        // Support both click and touch events
        th.addEventListener('click', handleSort);
        th.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleSort();
        });
    });

    // Quick filters with touch support
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        const handleFilter = () => {
            document.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.quickFilter = btn.dataset.filter;
            this.currentPage = 1;
            this.renderTable();
        };

        btn.addEventListener('click', handleFilter);
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleFilter();
        });
    });

    // Pagination with touch support
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    const handlePrev = () => {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    };

    const handleNext = () => {
        this.currentPage++;
        this.renderTable();
    };

    prevBtn.addEventListener('click', handlePrev);
    prevBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handlePrev();
    });

    nextBtn.addEventListener('click', handleNext);
    nextBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleNext();
    });

    document.getElementById('pageSize').addEventListener('change', (e) => {
        this.pageSize = parseInt(e.target.value);
        this.currentPage = 1;
        this.renderTable();
    });

    // Enhanced tooltip functionality for mobile
    let tooltipTimeout;
    
    document.addEventListener('mouseover', (e) => {
        if (e.target.title && !this.isMobile()) {
            this.showTooltip(e);
        }
    });

    // Touch and hold for tooltips on mobile
    document.addEventListener('touchstart', (e) => {
        if (e.target.title && this.isMobile()) {
            tooltipTimeout = setTimeout(() => {
                this.showTooltip(e);
            }, 500); // Show after 500ms touch
        }
    });

    document.addEventListener('touchend', () => {
        clearTimeout(tooltipTimeout);
        this.hideTooltip();
    });

    document.addEventListener('mouseout', () => {
        this.hideTooltip();
    });

    // Handle viewport changes for mobile optimization
    this.handleViewportChanges();

    // Add swipe gesture support for mobile pagination
    this.addSwipeSupport();
};

CompleteCryptoDashboard.prototype.startClock = function() {
    const currentTimeElement = document.getElementById('currentTime');
    if (!currentTimeElement) return;
    
    // Function to update the clock
    const updateClock = () => {
        const now = new Date();
        
        // Format date
        const options = { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            timeZoneName: 'short'
        };
        const dateStr = now.toLocaleDateString('en-US', options);
        
        // Format time
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}:${seconds}`;
        
        // Combine date and time
        currentTimeElement.textContent = `${dateStr} • ${timeStr}`;
    };
    
    // Update immediately and then every second
    updateClock();
    setInterval(updateClock, 1000);
};

CompleteCryptoDashboard.prototype.isMobile = function() {
    return window.innerWidth <= 768 || ('ontouchstart' in window);
};

CompleteCryptoDashboard.prototype.showTooltip = function(e) {
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = e.target.title;
    tooltip.style.display = 'block';
    
    // Position tooltip properly for mobile
    const rect = e.target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = e.pageX + 10;
    let top = e.pageY - 30;
    
    // Adjust position if tooltip would go off screen
    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    
    if (top < 0) {
        top = e.pageY + 20;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
};

CompleteCryptoDashboard.prototype.hideTooltip = function() {
    document.getElementById('tooltip').style.display = 'none';
};

CompleteCryptoDashboard.prototype.handleViewportChanges = function() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Recalculate table dimensions on resize
            this.optimizeTableForViewport();
        }, 250);
    });

    // Handle orientation change on mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            this.optimizeTableForViewport();
        }, 500);
    });
};

CompleteCryptoDashboard.prototype.optimizeTableForViewport = function() {
    const table = document.querySelector('table');
    if (!table) return;

    if (this.isMobile()) {
        // Optimize for mobile viewing
        table.style.fontSize = window.innerWidth < 480 ? '0.75rem' : '0.85rem';
    } else {
        // Reset to desktop styles
        table.style.fontSize = '';
    }
};

CompleteCryptoDashboard.prototype.addSwipeSupport = function() {
    if (!this.isMobile()) return;

    let touchStartX = 0;
    let touchEndX = 0;
    
    const tableContainer = document.querySelector('.table-container');
    
    tableContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    tableContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        this.handleSwipeGesture();
    });

    // Only handle horizontal swipes for pagination, not table scrolling
    this.handleSwipeGesture = () => {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        // Only trigger pagination swipes if table is not horizontally scrolled
        if (tableContainer.scrollLeft === 0 || 
            tableContainer.scrollLeft === (tableContainer.scrollWidth - tableContainer.clientWidth)) {
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0 && this.currentPage > 1) {
                    // Swipe left - previous page
                    this.currentPage--;
                    this.renderTable();
                } else if (diff < 0) {
                    // Swipe right - next page
                    const totalPages = Math.ceil(this.getFilteredAndSortedData().length / this.pageSize);
                    if (this.currentPage < totalPages) {
                        this.currentPage++;
                        this.renderTable();
                    }
                }
            }
        }
    };
};

CompleteCryptoDashboard.prototype.monitorPerformance = function() {
    const now = Date.now();
    
    // Monitor update frequency
    const updateCount = this.messageThrottle || 0;
    const timeSinceStart = now - (this.startTime || now);
    const updatesPerSecond = updateCount / (timeSinceStart / 1000);
    
    // Log performance stats
    if (updatesPerSecond > 100) {
        console.log(`High update frequency detected: ${updatesPerSecond.toFixed(2)} updates/sec`);
        console.log(`UI throttle entries: ${this.uiUpdateThrottle?.size || 0}`);
        console.log(`Pending signal updates: ${this.pendingSignalUpdates?.size || 0}`);
    }
    
    // Auto-adjust throttling if performance is poor
    if (updatesPerSecond > 200) {
        console.log('Auto-adjusting throttle settings for better performance');
        // Could implement dynamic throttling here
    }
};

CompleteCryptoDashboard.prototype.shouldRefreshTable = function() {
    // Refresh if there are significant changes in signals
    const currentTime = Date.now();
    const lastRefresh = this.lastTableRefresh || 0;
    return (currentTime - lastRefresh) > 60000; // Refresh every minute max
};

CompleteCryptoDashboard.prototype.performMemoryCleanup = function() {
    console.log('Performing memory cleanup...');
    
    // Clean up old price change data
    for (const [symbol, data] of this.priceData.entries()) {
        if (data.priceChange !== undefined) {
            delete data.priceChange; // Remove temporary data
        }
    }

    // Clean up old UI update throttle data
    if (this.uiUpdateThrottle) {
        const now = Date.now();
        for (const [symbol, lastUpdate] of this.uiUpdateThrottle.entries()) {
            if (now - lastUpdate > 30000) { // Remove entries older than 30 seconds
                this.uiUpdateThrottle.delete(symbol);
            }
        }
    }

    // Limit historical data storage for inactive symbols
    if (this.historicalData.size > 600) {
        const symbolsByVolume = Array.from(this.priceData.entries())
            .sort((a, b) => b[1].quoteVolume - a[1].quoteVolume)
            .slice(600) // Keep only top 600
            .map(entry => entry[0]);
        
        symbolsByVolume.forEach(symbol => {
            this.historicalData.delete(symbol);
        });
        
        console.log(`Cleaned up historical data, now tracking ${this.historicalData.size} symbols`);
    }

    // Reset volume accumulators periodically to prevent overflow
    for (const [symbol, data] of this.priceData.entries()) {
        if (data.buyVolume > 1e12 || data.sellVolume > 1e12) {
            data.buyVolume = data.buyVolume * 0.1; // Scale down by 90%
            data.sellVolume = data.sellVolume * 0.1;
        }
    }

    // Force garbage collection if available
    if (window.gc) {
        window.gc();
    }
};

CompleteCryptoDashboard.prototype.performHealthCheck = function() {
    const activeConnections = this.webSockets ? this.webSockets.filter(ws => 
        ws && ws.readyState === WebSocket.OPEN
    ).length : 0;

    const totalConnections = this.webSockets ? this.webSockets.length : 0;
    
    console.log(`Health Check: ${activeConnections}/${totalConnections} WebSocket connections active`);
    
    if (activeConnections < totalConnections * 0.5) {
        console.log('Too many disconnected WebSockets, reinitializing...');
        this.setupWebSocket();
    }

    // Update connection status
    if (activeConnections > 0) {
        this.updateConnectionStatus(true, 
            `Real-time active (${activeConnections}/${totalConnections} connections, ${this.priceData.size} pairs)`
        );
    } else {
        this.updateConnectionStatus(false, 'No active connections - reconnecting...');
        this.handleReconnection();
    }
    
    // Auto-save data periodically
    if (Date.now() - this.lastSaveTime > 300000) { // 5 minutes
        this.saveData();
        this.lastSaveTime = Date.now();
    }
};

CompleteCryptoDashboard.prototype.handleReconnection = function() {
    if (!this.isOnline) {
        console.log('Cannot reconnect - offline');
        return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
        this.updateConnectionStatus(false, 'Max reconnection attempts reached. Please refresh the page.');
        return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(5000 * this.reconnectAttempts, 30000); // Max 30 seconds
    
    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay/1000}s`);
    this.updateConnectionStatus(false, `Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
        this.setupWebSocket();
    }, delay);
};

// Clean up method for when page is closed
CompleteCryptoDashboard.prototype.cleanup = function() {
    // Save data before cleanup
    this.saveData();
    
    // Clear all intervals
    if (this.timestampInterval) clearInterval(this.timestampInterval);
    if (this.signalRecalculationInterval) clearInterval(this.signalRecalculationInterval);
    if (this.memoryCleanupInterval) clearInterval(this.memoryCleanupInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.performanceInterval) clearInterval(this.performanceInterval);
    if (this.signalUpdateTimer) clearTimeout(this.signalUpdateTimer);
    if (this.statsUpdateTimer) clearTimeout(this.statsUpdateTimer);

    // Close all WebSocket connections
    if (this.webSockets) {
        this.webSockets.forEach(ws => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
    }

    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.close();
    }
};