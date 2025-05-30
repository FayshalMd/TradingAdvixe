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
    
    // Prioritize USDT pairs as they're most frequently used
    const usdtPairs = symbols.filter(s => s.endsWith('USDT'));
    const otherPairs = symbols.filter(s => !s.endsWith('USDT'));
    
    // Put USDT pairs in the first connections for faster updates
    const sortedSymbols = [...usdtPairs, ...otherPairs];
    
    // Split symbols into chunks
    const chunks = [];
    for (let i = 0; i < sortedSymbols.length; i += STREAMS_PER_CONNECTION) {
        chunks.push(sortedSymbols.slice(i, i + STREAMS_PER_CONNECTION));
    }

    console.log(`Creating ${chunks.length} WebSocket connections for complete coverage`);

    // Check if this is a fresh page load
    const isPageReload = document.readyState === "complete" && 
                        (!this.lastReconnectTime || (Date.now() - this.lastReconnectTime > 10000));
    
    if (isPageReload) {
        console.log('Page reload detected - fast connection setup');
        this.lastReconnectTime = Date.now();
    }

    // Create first few connections immediately for instant updates on page load
    const fastConnectCount = Math.min(3, chunks.length); // First 3 connections without delay
    
    // Connect first chunks immediately (these contain the USDT pairs)
    for (let i = 0; i < fastConnectCount; i++) {
        if (chunks[i]) {
            // No delay for first connections - immediate updates after reload
            this.createWebSocketConnection(chunks[i], i, true); 
        }
    }
    
    // Connect remaining chunks with staggered timing
    for (let i = fastConnectCount; i < chunks.length; i++) {
        // Reduced delays for faster overall connection
        const delay = isPageReload ? 
            Math.min(100 * i, 1000) : // Faster connection on page reload
            Math.min(300 * Math.pow(1.2, i), 2000); // Normal staggered timing
            
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

    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    const ws = new WebSocket(wsUrl);

    // Set connection timeout (shorter for priority connections)
    const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
            console.log(`WebSocket ${connectionIndex + 1} connection timeout`);
            ws.close();
        }
    }, isPriorityConnection ? 5000 : 10000);

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
            const delay = 5000 + (connectionIndex * 1000) + (this.reconnectAttempts * 2000);
            console.log(`Reconnecting WebSocket ${connectionIndex + 1} in ${delay/1000}s`);
            
            setTimeout(() => {
                if (this.isOnline) {
                    this.createWebSocketConnection(symbols, connectionIndex);
                }
            }, delay);
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
    
    // Immediate update of price in UI
    this.updatePriceUI(symbol, priceChanged);
    
    // Process other data updates with optimized throttling
    if (!this.fullUpdateThrottle) {
        this.fullUpdateThrottle = new Map();
    }
    
    const now = Date.now();
    const lastFullUpdate = this.fullUpdateThrottle.get(symbol) || 0;
    
    // Process full data updates every 200ms for each symbol (faster than before)
    if (now - lastFullUpdate > 200) {
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

        // Batch signal updates more efficiently
        this.queueSignalUpdate(symbol);
        
        // Schedule stats update if not already pending
        if (!this.statsUpdateTimer) {
            this.statsUpdateTimer = setTimeout(() => {
                this.updateStats();
                this.statsUpdateTimer = null;
            }, 1000); // More frequent stats updates
        }
    }
};

CompleteCryptoDashboard.prototype.updatePriceUI = function(symbol, priceChanged) {
    const row = document.getElementById(`row-${symbol}`);
    if (!row) return;
    
    const data = this.priceData.get(symbol);
    if (!data) return;
    
    // Update price cell immediately
    row.children[1].textContent = `${this.formatPrice(data.price)} ${data.quoteAsset}`;
    
    // Flash effect on price change
    if (priceChanged) {
        const flashClass = data.priceChange > 0 ? 'flash-green' : 'flash-red';
        row.classList.add(flashClass);
        setTimeout(() => row.classList.remove(flashClass), 300); // Shorter flash duration
        
        // Update timestamp immediately on price change for instant feedback
        const timestampCell = row.children[10];
        timestampCell.textContent = this.formatTimestamp(data.lastUpdated);
        
        // Add live indicator class
        if (Date.now() - data.lastUpdated < 5000) {
            timestampCell.classList.add('live-update');
            timestampCell.classList.add('recent-update');
        }
    }
    
    // Update full row if visible and not recently updated
    if (!this.uiUpdateThrottle) this.uiUpdateThrottle = new Map();
    const now = Date.now();
    if (now - (this.uiUpdateThrottle.get(symbol) || 0) > 100) { // Faster 100ms throttle
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
    const BATCH_SIZE = 5; // Reduced from 10 to 5
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
            // Add delay between batches to prevent overwhelming
            setTimeout(() => {
                processBatch();
            }, 10); // 10ms delay between batches
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
