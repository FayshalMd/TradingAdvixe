// Event Handling, Updates and Initialization
CompleteCryptoDashboard.prototype.startUpdateLoop = function() {
    // Update timestamps based on bandwidth mode preference
    const updateFrequency = this.lowBandwidthMode ? 1000 : 500; // 1s in low bandwidth, 500ms in standard
    
    this.timestampInterval = setInterval(() => {
        // More efficient timestamp updates using data attributes
        // In low bandwidth mode, update fewer timestamps at once
        const visibleTimestamps = Array.from(document.querySelectorAll('.timestamp:not(.processed)'));
        
        // Process only visible timestamps first or limit number in low bandwidth mode
        const timestampsToUpdate = this.lowBandwidthMode ? 
            visibleTimestamps.slice(0, 20) :  // Process only 20 timestamps per interval in low bandwidth mode
            visibleTimestamps;
        
        timestampsToUpdate.forEach(cell => {
            // Mark as processed to avoid excessive updates
            cell.classList.add('processed');
            
            // Get stored timestamp from data attribute if available
            const storedTimestamp = cell.getAttribute('data-timestamp');
            if (storedTimestamp) {
                const timestamp = parseInt(storedTimestamp);
                // Only update if value exists and is valid
                if (!isNaN(timestamp)) {
                    cell.textContent = this.formatTimestamp(timestamp);
                    
                    // Apply highlight for recently updated items (within last 5 seconds)
                    const seconds = Math.floor((Date.now() - timestamp) / 1000);
                    if (seconds < 5) {
                        cell.classList.add('recent-update');
                        cell.classList.add('live-update');
                        // Force update text content to ensure "LIVE" indicator is shown
                        cell.textContent = this.formatTimestamp(timestamp);
                    } else {
                        cell.classList.remove('recent-update');
                        cell.classList.remove('live-update');
                    }
                }
            }
        });
        
        // Reset processed flag periodically to allow updates again
        if (this._timestampCycle === undefined) this._timestampCycle = 0;
        this._timestampCycle++;
        
        if (this._timestampCycle >= 10) {
            document.querySelectorAll('.timestamp.processed').forEach(cell => {
                cell.classList.remove('processed');
            });
            this._timestampCycle = 0;
        }
    }, updateFrequency);

    // Periodic signal recalculation adjusted for bandwidth mode
    const recalculationInterval = this.lowBandwidthMode ? 120000 : 60000; // 2 minutes in low bandwidth mode
    
    this.signalRecalculationInterval = setInterval(() => {
        console.log('Performing periodic signal recalculation...');
        this.calculateAllSignals();
        this.updateStats();
        
        // Refresh table if needed
        if (this.shouldRefreshTable()) {
            this.renderTable();
        }
    }, recalculationInterval);

    // Memory cleanup adjusted for bandwidth mode
    const cleanupInterval = this.lowBandwidthMode ? 180000 : 120000; // 3 minutes in low bandwidth mode
    
    this.memoryCleanupInterval = setInterval(() => {
        this.performMemoryCleanup();
    }, cleanupInterval);

    // Connection health check
    const healthCheckInterval = this.lowBandwidthMode ? 180000 : 120000; // 3 minutes in low bandwidth mode
    
    this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
    }, healthCheckInterval);

    // Performance monitoring
    this.performanceInterval = setInterval(() => {
        this.monitorPerformance();
    }, 30000);
};

CompleteCryptoDashboard.prototype.startSentimentUpdates = function() {
    this.updateSentiment(); // Initial update
    
    // Update sentiment less frequently in low bandwidth mode
    const updateInterval = this.lowBandwidthMode ? 600000 : 300000; // 10 mins vs 5 mins
    
    // Update sentiment every 5 minutes (10 minutes in low bandwidth mode)
    this.sentimentInterval = setInterval(() => {
        this.updateSentiment();
    }, updateInterval);
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
    const needle = this.getCachedElement('greedNeedle');
    const valueEl = this.getCachedElement('greedValue');
    const labelEl = this.getCachedElement('greedLabel');
    const descriptionEl = this.getCachedElement('greedDescription');
    const updatedEl = this.getCachedElement('sentimentUpdated');

    // Schedule render to batch updates
    this.scheduleRender(() => {
        // Calculate rotation (0 = Extreme Fear, 180 = Extreme Greed)
        // Meter range is -90 (left) to +90 (right)
        const rotation = (value / 100) * 180 - 90;
        
        needle.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueEl.textContent = value;
        labelEl.textContent = label;
        labelEl.style.color = this.getSentimentColor(value);
        
        descriptionEl.textContent = this.getSentimentDescription(value);
    });

    if (isError) {
        this.scheduleRender(() => {
            updatedEl.textContent = 'Last updated: Error (Using cached value)';
            updatedEl.style.color = '#ff6b6b';
        });
    } else if (timestamp > 0) {
        this.scheduleRender(() => {
            updatedEl.textContent = `Last updated: ${new Date(timestamp).toLocaleString()}`;
            updatedEl.style.color = '#666';
        });
    } else {
        this.scheduleRender(() => {
            updatedEl.textContent = 'Last updated: Loading...';
            updatedEl.style.color = '#666';
        });
    }
    
    // Schedule additional UI updates
    this.scheduleRender(() => {
        // Update market indicators (dummy data for now, replace with actual API calls)
        const volatilityValue = this.getCachedElement('volatilityValue');
        const volumeValue = this.getCachedElement('volumeValue');
        const dominanceValue = this.getCachedElement('dominanceValue');
        
        volatilityValue.textContent = 'Medium';
        volumeValue.textContent = this.formatVolume(this.getTotalMarketVolume());
        dominanceValue.textContent = '45.2%'; // Example
    });
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
    
    // Bandwidth mode toggle
    const bandwidthToggle = document.getElementById('bandwidthToggle');
    
    // Set the initial state from localStorage
    bandwidthToggle.checked = localStorage.getItem('lowBandwidthMode') === 'true';
    this.lowBandwidthMode = bandwidthToggle.checked;
    
    // Add change event listener
    bandwidthToggle.addEventListener('change', () => {
        // Save setting to localStorage
        localStorage.setItem('lowBandwidthMode', bandwidthToggle.checked);
        this.lowBandwidthMode = bandwidthToggle.checked;
        
        // Show user feedback
        const status = document.getElementById('connectionStatus');
        status.innerHTML = `⚙️ ${this.lowBandwidthMode ? 'Low' : 'Standard'} bandwidth mode activated. Reloading connections...`;
        
        // Close and reset existing connections
        if (this.webSockets) {
            this.webSockets.forEach(ws => {
                if (ws && ws.readyState !== WebSocket.CLOSED) {
                    ws.close();
                }
            });
            this.webSockets = [];
        }
        
        // Delay slightly before reconnecting
        setTimeout(() => {
            this.setupWebSocket();
        }, 500);
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
            
            // For "All" button, also reload and refresh everything
            if (btn.dataset.filter === 'all') {
                // Update connection status to show reload is happening
                this.updateConnectionStatus(false, 'Refreshing data...');
                
                // Recalculate all signals
                this.calculateAllSignals();
                
                // Update market sentiment
                this.updateSentiment();
                
                // Perform reconnection to refresh WebSocket data
                this.handleReconnection();
                
                // Force refresh table
                this.lastTableRefresh = 0;
                
                // Update statistics
                this.updateStats();
            }
            
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
    setInterval(updateClock, 500); // Update every 500ms for smoother seconds display
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

    // Reset all connection attempt counters on manual reconnection
    if (this.connectionReconnectAttempts) {
        for (let key in this.connectionReconnectAttempts) {
            this.connectionReconnectAttempts[key] = 0;
        }
    }

    // For page reloads or initial connections, attempt immediate connection
    const isInitialConnection = this.reconnectAttempts === 0;
    
    // Reset reconnect attempts if too many to allow retry
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached, resetting to try again');
        this.reconnectAttempts = Math.max(1, Math.floor(this.maxReconnectAttempts / 2));
    } else {
        this.reconnectAttempts++;
    }
    
    // Fast reconnection for initial/page reload, progressive backoff for subsequent attempts
    const delay = isInitialConnection ? 1000 : Math.min(3000 * this.reconnectAttempts, 15000); // Longer initial delay and max delay
    
    console.log(`${isInitialConnection ? 'Initial connection' : 'Reconnection attempt'} ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay/1000}s`);
    this.updateConnectionStatus(false, isInitialConnection ? 
        'Establishing real-time connections...' : 
        `Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
        // For page reloads, force a complete reset of connections
        if (isInitialConnection) {
            // Close any existing connections first
            if (this.webSockets) {
                this.webSockets.forEach(ws => {
                    if (ws && ws.readyState !== WebSocket.CLOSED) {
                        ws.close();
                    }
                });
            }
            
            console.log('Setting up fresh WebSocket connections after network recovery');
            this.webSockets = [];
        }
        
        // Add network connectivity check before attempting WebSocket setup
        if (navigator.onLine) {
            this.setupWebSocket();
        } else {
            console.log('Device went offline during reconnection attempt');
            this.updateConnectionStatus(false, 'Device is offline');
        }
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

CompleteCryptoDashboard.prototype.formatTimestamp = function(timestamp) {
    // During refresh period, indicate refreshing status
    if (this.isRefreshing) {
        return `Refreshing...`;
    }
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return `LIVE 🔴`;
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
};

// Performance optimization: Cache frequently accessed DOM elements
CompleteCryptoDashboard.prototype.getCachedElement = function(id) {
    if (!this._domCache) this._domCache = new Map();
    if (!this._domCache.has(id)) {
        const element = document.getElementById(id);
        this._domCache.set(id, element);
    }
    return this._domCache.get(id);
};

// Use RAF for smoother UI updates
CompleteCryptoDashboard.prototype.scheduleRender = function(callback) {
    if (!this._renderQueue) this._renderQueue = [];
    this._renderQueue.push(callback);
    
    if (!this._renderScheduled) {
        this._renderScheduled = true;
        requestAnimationFrame(() => {
            const queue = this._renderQueue || [];
            this._renderQueue = [];
            this._renderScheduled = false;
            
            // Execute all queued render operations
            queue.forEach(fn => {
                try {
                    fn();
                } catch (err) {
                    console.error('Render error:', err);
                }
            });
        });
    }
    
    return this;
};
