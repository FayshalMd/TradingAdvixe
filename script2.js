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
    const STREAMS_PER_CONNECTION = 150; // Reduced from 200 to handle high frequency better
    
    // Split symbols into chunks
    const chunks = [];
    for (let i = 0; i < symbols.length; i += STREAMS_PER_CONNECTION) {
        chunks.push(symbols.slice(i, i + STREAMS_PER_CONNECTION));
    }

    console.log(`Creating ${chunks.length} WebSocket connections for complete coverage`);

    // Increased delay between connections to prevent overwhelming
    chunks.forEach((chunk, index) => {
        setTimeout(() => {
            this.createWebSocketConnection(chunk, index);
        }, index * 500); // Increased from 200ms to 500ms
    });
};

CompleteCryptoDashboard.prototype.createWebSocketConnection = function(symbols, connectionIndex) {
    // Close any existing connection for this index
    if (this.webSockets[connectionIndex]) {
        this.webSockets[connectionIndex].close();
    }

    const streams = symbols.map(symbol => 
        `${symbol.toLowerCase()}@ticker`
    ).join('/');

    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    const ws = new WebSocket(wsUrl);

    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
            console.log(`WebSocket ${connectionIndex + 1} connection timeout`);
            ws.close();
        }
    }, 10000);

    ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`WebSocket ${connectionIndex + 1} connected with ${symbols.length} streams`);
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
    const change = parseFloat(data.P);
    const volume = parseFloat(data.v);
    const quoteVolume = parseFloat(data.q);
    const count = parseInt(data.n); // Number of trades

    const existing = this.priceData.get(symbol);
    if (!existing) return;

    const oldPrice = existing.price;
    const oldSignal = existing.signal;

    // Calculate buy/sell volume approximation
    const priceChange = price - oldPrice;
    const volumeChange = quoteVolume - (existing.quoteVolume || 0);
    
    // Enhanced volume analysis based on price movement
    if (priceChange > 0 && volumeChange > 0) {
        // Price up = more buying pressure
        existing.buyVolume = (existing.buyVolume || 0) + volumeChange * 0.7;
        existing.sellVolume = (existing.sellVolume || 0) + volumeChange * 0.3;
    } else if (priceChange < 0 && volumeChange > 0) {
        // Price down = more selling pressure
        existing.buyVolume = (existing.buyVolume || 0) + volumeChange * 0.3;
        existing.sellVolume = (existing.sellVolume || 0) + volumeChange * 0.7;
    } else if (volumeChange > 0) {
        // Price flat = split volume evenly
        existing.buyVolume = (existing.buyVolume || 0) + volumeChange * 0.5;
        existing.sellVolume = (existing.sellVolume || 0) + volumeChange * 0.5;
    }

    // Calculate delta volume percentage
    const totalVol = (existing.buyVolume || 0) + (existing.sellVolume || 0);
    existing.deltaVolume = totalVol > 0 ? 
        ((existing.buyVolume || 0) - (existing.sellVolume || 0)) / totalVol * 100 : 0;

    existing.price = price;
    existing.change = change;
    existing.volume = volume;
    existing.quoteVolume = quoteVolume;
    existing.lastUpdated = Date.now();
    existing.priceChange = priceChange;
    existing.tradeCount = count;

    // Throttle UI updates - only update visible rows and not too frequently
    this.throttleUIUpdate(symbol);

    // Batch signal recalculation for performance
    if (!this.pendingSignalUpdates) {
        this.pendingSignalUpdates = new Set();
    }
    this.pendingSignalUpdates.add(symbol);

    // Increased debounce time to handle high frequency updates
    if (!this.signalUpdateTimer) {
        this.signalUpdateTimer = setTimeout(() => {
            this.processPendingSignalUpdates();
        }, 200); // Increased from 50ms to 200ms
    }
    
    // Update stats less frequently
    if (!this.statsUpdateTimer) {
        this.statsUpdateTimer = setTimeout(() => {
            this.updateStats();
            this.statsUpdateTimer = null;
        }, 2000); // Increased from 500ms to 2000ms
    }
};

CompleteCryptoDashboard.prototype.throttleUIUpdate = function(symbol) {
    // Initialize throttle tracking
    if (!this.uiUpdateThrottle) {
        this.uiUpdateThrottle = new Map();
    }

    const now = Date.now();
    const lastUpdate = this.uiUpdateThrottle.get(symbol) || 0;
    
    // Only update UI every 500ms per symbol to prevent overwhelming
    if (now - lastUpdate > 500) {
        this.uiUpdateThrottle.set(symbol, now);
        
        // Only update if row is visible in current page
        const row = document.getElementById(`row-${symbol}`);
        if (row) {
            this.updateTableRowImmediate(symbol);
        }
    }
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
        const savedData = localStorage.getItem('cryptoDashboard');
        if (savedData) {
            const data = JSON.parse(savedData);
            const timeSinceLastUpdate = Date.now() - data.lastUpdate;
            
            // Only restore if data is less than 1 hour old
            if (timeSinceLastUpdate < 3600000) {
                this.priceData = new Map(data.priceData);
                this.historicalData = new Map(data.historicalData);
                this.currentFilter = data.currentFilter || 'usdt';
                this.currentSort = data.currentSort || 'volume';
                this.currentPage = data.currentPage || 1;
                this.searchTerm = data.searchTerm || '';
                this.quickFilter = data.quickFilter || 'all';
                
                console.log(`Restored ${this.priceData.size} symbols from saved data`);
                this.updateConnectionStatus(false, 'Restored from saved data - Reconnecting...');
                
                // Render table with saved data immediately
                if (this.priceData.size > 0) {
                    setTimeout(() => this.renderTable(), 100);
                }
            } else {
                console.log('Saved data too old, starting fresh');
                localStorage.removeItem('cryptoDashboard');
            }
        }
    } catch (error) {
        console.warn('Failed to load saved data:', error);
        localStorage.removeItem('cryptoDashboard');
    }
};