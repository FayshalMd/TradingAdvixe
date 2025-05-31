// WebSocket and Data Handling Methods
CompleteCryptoDashboard.prototype.setupWebSocket = function() {
    // Close existing connection if any
    if (this.webSocket) {
        this.webSocket.close();
    }

    // Get ALL symbols for real-time updates (not just top 100)
    const allSymbols = Array.from(this.priceData.keys());
    
    console.log(`Setting up WebSocket for ${allSymbols.length} symbols`);
    
    // Binance has limits on streams per connection, so we'll use multiple connections
    this.setupMultipleWebSocketConnections(allSymbols);
};

CompleteCryptoDashboard.prototype.setupMultipleWebSocketConnections = function(symbols) {
    this.webSockets = [];
    const STREAMS_PER_CONNECTION = 100; // Reduced from 150 to 100 for better reliability
    
    // Check if we should use low-bandwidth mode
    this.lowBandwidthMode = localStorage.getItem('lowBandwidthMode') === 'true';
    
    // Prioritize USDT pairs as they're most frequently used
    const usdtPairs = symbols.filter(s => s.endsWith('USDT'));
    const btcPairs = symbols.filter(s => s.endsWith('BTC'));
    const ethPairs = symbols.filter(s => s.endsWith('ETH'));
    const otherPairs = symbols.filter(s => !s.endsWith('USDT') && !s.endsWith('BTC') && !s.endsWith('ETH'));
    
    // In low bandwidth mode, reduce the number of monitored pairs
    const maxPairsToMonitor = this.lowBandwidthMode ? 300 : symbols.length;
    
    // Sort by volume and take top pairs
    const sortByVolume = (pairs) => {
        return pairs.sort((a, b) => {
            const volumeA = this.priceData.get(a)?.quoteVolume || 0;
            const volumeB = this.priceData.get(b)?.quoteVolume || 0;
            return volumeB - volumeA;
        });
    };
    
    // Get top pairs by volume for each category
    const topUsdtPairs = sortByVolume(usdtPairs).slice(0, Math.round(maxPairsToMonitor * 0.7));
    const topBtcPairs = sortByVolume(btcPairs).slice(0, Math.round(maxPairsToMonitor * 0.15));
    const topEthPairs = sortByVolume(ethPairs).slice(0, Math.round(maxPairsToMonitor * 0.1));
    const topOtherPairs = sortByVolume(otherPairs).slice(0, Math.round(maxPairsToMonitor * 0.05));
    
    // Put USDT pairs in the first connections for faster updates
    const sortedSymbols = [...topUsdtPairs, ...topBtcPairs, ...topEthPairs, ...topOtherPairs];
    
    console.log(`Using ${sortedSymbols.length}/${symbols.length} pairs in ${this.lowBandwidthMode ? 'low' : 'standard'} bandwidth mode`);
    
    // Split symbols into chunks
    const chunks = [];
    for (let i = 0; i < sortedSymbols.length; i += STREAMS_PER_CONNECTION) {
        chunks.push(sortedSymbols.slice(i, i + STREAMS_PER_CONNECTION));
    }

    console.log(`Creating ${chunks.length} WebSocket connections for coverage`);

    // Check if this is a fresh page load
    const isPageReload = document.readyState === "complete" && 
                        (!this.lastReconnectTime || (Date.now() - this.lastReconnectTime > 10000));
    
    if (isPageReload) {
        console.log('Page reload detected - fast connection setup');
        this.lastReconnectTime = Date.now();
    }

    // Create first few connections immediately for instant updates on page load
    const fastConnectCount = Math.min(2, chunks.length); // First 2 connections without delay (reduced from 3)
    
    // Connect first chunks immediately (these contain the USDT pairs)
    for (let i = 0; i < fastConnectCount; i++) {
        if (chunks[i]) {
            // No delay for first connections - immediate updates after reload
            this.createWebSocketConnection(chunks[i], i, true); 
        }
    }
    
    // Connect remaining chunks with staggered timing
    for (let i = fastConnectCount; i < chunks.length; i++) {
        // Increased delays for lower bandwidth usage
        const delay = isPageReload ? 
            Math.min(500 * i, 3000) : // Slower connection on page reload
            Math.min(800 * Math.pow(1.2, i), 5000); // Slower staggered timing
            
        setTimeout(() => {
            this.createWebSocketConnection(chunks[i], i, false);
        }, delay);
    }
};

CompleteCryptoDashboard.prototype.createWebSocketConnection = function(symbols, connectionIndex, isPriorityConnection = false) {
    // Close any existing connection for this index
    if (this.webSockets[connectionIndex]) {
        this.webSockets[connectionIndex].close();
    }

    const streams = symbols.map(symbol => 
        `${symbol.toLowerCase()}@ticker`
    ).join('/');

    // Use JavaScript native WebSocket without additional headers
    // This helps avoid CORS issues in some environments
    let wsUrl;
    try {
        // Try secure connection first
        wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
        
        // For local development, you might need to use a fallback
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`Using alternative WebSocket endpoint for local development (connection ${connectionIndex + 1})`);
            // Additional fallback mechanism can be added here if needed
        }
    } catch (error) {
        console.error('Error creating WebSocket URL:', error);
        wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    }

    const ws = new WebSocket(wsUrl);

    // Set connection timeout (shorter for priority connections)
    const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
            console.log(`WebSocket ${connectionIndex + 1} connection timeout`);
            ws.close();
            
            // For local development, try reconnecting with exponential backoff
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                const reconnectDelay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts || 0), 30000);
                console.log(`Will attempt reconnection in ${reconnectDelay/1000} seconds...`);
                
                setTimeout(() => {
                    if (this.isOnline) {
                        this.createWebSocketConnection(symbols, connectionIndex, isPriorityConnection);
                    }
                }, reconnectDelay);
                
                if (!this.reconnectAttempts) this.reconnectAttempts = 0;
                this.reconnectAttempts++;
            }
        }
    }, isPriorityConnection ? 8000 : 15000); // Increased timeouts

    ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`WebSocket ${connectionIndex + 1} connected with ${symbols.length} streams${isPriorityConnection ? ' (priority)' : ''}`);
        this.reconnectAttempts = 0; // Reset on successful connection
        this.updateConnectionStatus(true, `Real-time updates active (${this.getActiveConnections()}/${Math.ceil(Array.from(this.priceData.keys()).length / 150)} connections)`);
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.data) {
                // Add message throttling to prevent overwhelming
                if (!this.messageThrottle) {
                    this.messageThrottle = 0;
                }
                
                this.messageThrottle++;
                
                // Process every message but throttle UI updates
                this.handlePriceUpdate(message.data);
                
                // Log throttling stats every 1000 messages
                if (this.messageThrottle % 1000 === 0) {
                    console.log(`Processed ${this.messageThrottle} price updates`);
                }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`WebSocket ${connectionIndex + 1} disconnected (Code: ${event.code}, Reason: ${event.reason})`);
        
        // Only attempt reconnection if we're online and not intentionally closing
        if (this.isOnline && event.code !== 1000) {
            // Use exponential backoff for reconnection
            const baseDelay = 5000;
            const maxDelay = 30000; // Maximum 30 seconds
            
            const backoffFactor = Math.min(Math.pow(1.5, this.reconnectAttempts || 0), 6);
            const delay = Math.min(baseDelay * backoffFactor + (connectionIndex * 1000), maxDelay);
            
            console.log(`Reconnecting WebSocket ${connectionIndex + 1} in ${(delay/1000).toFixed(1)}s (attempt: ${this.reconnectAttempts || 0})`);
            
            setTimeout(() => {
                if (this.isOnline) {
                    this.createWebSocketConnection(symbols, connectionIndex);
                    
                    // Increment reconnect attempts for exponential backoff
                    if (!this.reconnectAttempts) this.reconnectAttempts = 0;
                    this.reconnectAttempts++;
                }
            }, delay);
        } else if (!this.isOnline) {
            console.log(`Not reconnecting WebSocket ${connectionIndex + 1} - offline mode`);
        }
    };

    ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error(`WebSocket ${connectionIndex + 1} error:`, error);
        
        // If we get too many errors, back off
        if (this.reconnectAttempts > 5) {
            console.log(`Too many errors on WebSocket ${connectionIndex + 1}, backing off`);
            return;
        }
    };

    this.webSockets[connectionIndex] = ws;
};

CompleteCryptoDashboard.prototype.getActiveConnections = function() {
    return this.webSockets ? this.webSockets.filter(ws => 
        ws && ws.readyState === WebSocket.OPEN
    ).length : 0;
};

CompleteCryptoDashboard.prototype.handlePriceUpdate = function(data) {
    const symbol = data.s;
    const price = parseFloat(data.c);
    
    const existing = this.priceData.get(symbol);
    if (!existing) return;
    
    const oldPrice = existing.price;
    
    // Only register a real update if price actually changed
    const priceChanged = price !== oldPrice;
    
    // Always update price immediately to ensure real-time price display
    existing.price = price;
    existing.priceChange = priceChanged ? price - oldPrice : 0;
    
    // Always refresh the timestamp on actual price changes
    if (priceChanged) {
        existing.lastUpdated = Date.now();
    }
    
    // Only update UI if price actually changed (reduces CPU usage)
    if (priceChanged) {
        this.updatePriceUI(symbol, priceChanged);
    }
    
    // Process other data updates with optimized throttling
    if (!this.fullUpdateThrottle) {
        this.fullUpdateThrottle = new Map();
    }
    
    const now = Date.now();
    const lastFullUpdate = this.fullUpdateThrottle.get(symbol) || 0;
    
    // Use longer throttle interval for less important updates
    // In low bandwidth mode: 1000ms, Standard mode: 500ms
    const throttleInterval = this.lowBandwidthMode ? 1000 : 500;
    
    if (now - lastFullUpdate > throttleInterval) {
        this.fullUpdateThrottle.set(symbol, now);
        
        const change = parseFloat(data.P);
        const volume = parseFloat(data.v);
        const quoteVolume = parseFloat(data.q);
        const count = parseInt(data.n);
        
        // Optimized volume analysis
        const volumeChange = quoteVolume - (existing.quoteVolume || 0);
        if (volumeChange > 0) {
            const buyFactor = existing.priceChange > 0 ? 0.7 : (existing.priceChange < 0 ? 0.3 : 0.5);
            existing.buyVolume = (existing.buyVolume || 0) + volumeChange * buyFactor;
            existing.sellVolume = (existing.sellVolume || 0) + volumeChange * (1 - buyFactor);
        }

        existing.deltaVolume = ((existing.buyVolume || 0) - (existing.sellVolume || 0)) / 
                              ((existing.buyVolume || 0) + (existing.sellVolume || 0) || 1) * 100;
        existing.change = change;
        existing.volume = volume;
        existing.quoteVolume = quoteVolume;
        existing.tradeCount = count;

        // In low bandwidth mode, queue signal updates less frequently
        if (!this.lowBandwidthMode || Math.random() < 0.2) {
            this.queueSignalUpdate(symbol);
        }
        
        // Update stats less frequently in low bandwidth mode
        const statsInterval = this.lowBandwidthMode ? 5000 : 2000;
        
        // Schedule stats update if not already pending
        if (!this.statsUpdateTimer) {
            this.statsUpdateTimer = setTimeout(() => {
                this.updateStats();
                this.statsUpdateTimer = null;
            }, statsInterval);
        }
    }
};

CompleteCryptoDashboard.prototype.updatePriceUI = function(symbol, priceChanged) {
    const row = document.getElementById(`row-${symbol}`);
    if (!row) return;
    
    const data = this.priceData.get(symbol);
    if (!data) return;
    
    // Always update price cell immediately for real-time price
    row.children[1].textContent = `${this.formatPrice(data.price)} ${data.quoteAsset}`;
    
    // Flash effect on price change
    if (priceChanged) {
        const flashClass = data.priceChange > 0 ? 'flash-green' : 'flash-red';
        row.classList.add(flashClass);
        setTimeout(() => row.classList.remove(flashClass), 300); // Shorter flash duration
        
        // Update timestamp immediately on price change for instant feedback
        const timestampCell = row.children[8]; // Updated index for removed columns
        timestampCell.textContent = this.formatTimestamp(data.lastUpdated);
        
        // Add live indicator class
        if (Date.now() - data.lastUpdated < 5000) {
            timestampCell.classList.add('live-update');
            timestampCell.classList.add('recent-update');
        }
    }
    
    // Update full row if visible and not recently updated
    // Make UI updates faster with reduced throttling
    if (!this.uiUpdateThrottle) this.uiUpdateThrottle = new Map();
    const now = Date.now();
    if (now - (this.uiUpdateThrottle.get(symbol) || 0) > 50) { // Faster 50ms throttle (down from 100ms)
        this.uiUpdateThrottle.set(symbol, now);
        this.updateTableRowImmediate(symbol);
    }
};

CompleteCryptoDashboard.prototype.queueSignalUpdate = function(symbol) {
    if (!this.pendingSignalUpdates) {
        this.pendingSignalUpdates = new Set();
        this.signalUpdateTimer = setTimeout(() => {
            this.processPendingSignalUpdates();
            this.signalUpdateTimer = null;
        }, 100); // Faster debounce (100ms)
    }
    this.pendingSignalUpdates.add(symbol);
};

CompleteCryptoDashboard.prototype.processPendingSignalUpdates = function() {
    if (!this.pendingSignalUpdates || this.pendingSignalUpdates.size === 0) {
        this.signalUpdateTimer = null;
        return;
    }

    const symbolsToUpdate = Array.from(this.pendingSignalUpdates);
    this.pendingSignalUpdates.clear();
    this.signalUpdateTimer = null;

    // Limit batch size to prevent UI blocking
    const BATCH_SIZE = 10; // Increased from 5 to 10
    let currentIndex = 0;

    const processBatch = () => {
        const batch = symbolsToUpdate.slice(currentIndex, currentIndex + BATCH_SIZE);
        
        batch.forEach(symbol => {
            const existing = this.priceData.get(symbol);
            if (!existing) return;

            const oldSignal = existing.signal;
            
            // Only recalculate signals for symbols with historical data
            // to avoid expensive calculations for all symbols
            if (this.historicalData.has(symbol)) {
                const analysis = this.calculateTechnicalIndicators(symbol);
                existing.signal = analysis.signal;
                existing.confidence = analysis.confidence;
                existing.tradeResult = analysis.tradeResult;

                // Update row if signal changed and it's visible
                if (oldSignal !== existing.signal) {
                    const row = document.getElementById(`row-${symbol}`);
                    if (row) {
                        this.updateTableRow(symbol, true);
                    }
                }
            }
        });

        currentIndex += BATCH_SIZE;
        
        if (currentIndex < symbolsToUpdate.length) {
            // Process next batch immediately with requestAnimationFrame for better performance
            requestAnimationFrame(processBatch);
        }
    };

    processBatch();
};

CompleteCryptoDashboard.prototype.saveData = function() {
    try {
        const dataToSave = {
            priceData: Array.from(this.priceData.entries()),
            historicalData: Array.from(this.historicalData.entries()),
            lastUpdate: Date.now(),
            currentFilter: this.currentFilter,
            currentSort: this.currentSort,
            currentPage: this.currentPage,
            searchTerm: this.searchTerm,
            quickFilter: this.quickFilter
        };
        
        localStorage.setItem('cryptoDashboard', JSON.stringify(dataToSave));
        console.log('Data saved to localStorage');
    } catch (error) {
        console.warn('Failed to save data:', error);
    }
};

CompleteCryptoDashboard.prototype.loadSavedData = async function() {
    try {
        // Show loading indicator for better UX
        this.updateConnectionStatus(false, 'Initializing real-time data...');
        
        const savedData = localStorage.getItem('cryptoDashboard');
        if (savedData) {
            const data = JSON.parse(savedData);
            const timeSinceLastUpdate = Date.now() - data.lastUpdate;
            
            // Accept data up to 2 hours old (increased from 1 hour) for faster startup
            if (timeSinceLastUpdate < 7200000) {
                console.log('Loading saved data from local storage');
                
                // Load saved data in a non-blocking way for better performance
                setTimeout(() => {
                    this.priceData = new Map(data.priceData);
                    this.historicalData = new Map(data.historicalData);
                    this.currentFilter = data.currentFilter || 'usdt';
                    this.currentSort = data.currentSort || 'volume';
                    this.currentPage = data.currentPage || 1;
                    this.searchTerm = data.searchTerm || '';
                    this.quickFilter = data.quickFilter || 'all';
                    
                    console.log(`Restored ${this.priceData.size} symbols from saved data`);
                    this.updateConnectionStatus(false, 'Reloading real-time connections...');
                    
                    // Render table immediately to show content as fast as possible
                    this.renderTable();
                    
                    // Begin reconnection process - this will update the stale data
                    this.isPageReload = true;
                    // Flag for faster WebSocket setup
                }, 0); // Using setTimeout with 0 to prevent UI blocking
                
                return true; // Successfully loaded data
            } else {
                console.log('Saved data too old (over 2 hours), starting fresh');
                localStorage.removeItem('cryptoDashboard');
            }
        }
    } catch (error) {
        console.warn('Failed to load saved data:', error);
        localStorage.removeItem('cryptoDashboard');
    }
    
    return false; // No saved data loaded
};
