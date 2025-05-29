// Core Dashboard Functionality
class CompleteCryptoDashboard {
    constructor() {
        this.allSymbols = [];
        this.priceData = new Map();
        this.historicalData = new Map();
        this.webSocket = null;
        this.isConnected = false;
        this.updateInterval = null;
        this.currentPage = 1;
        this.pageSize = 100;
        this.currentFilter = 'usdt';
        this.currentSort = 'volume';
        this.sortDirection = 'desc';
        this.searchTerm = '';
        this.quickFilter = 'all';
        this.startTime = Date.now(); // Track start time for performance monitoring
        this.isOnline = navigator.onLine;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.lastSaveTime = Date.now();
        this.webSockets = [];
        this.greedFearIndex = 50;
        this.lastSentimentUpdate = 0;
        
        this.init();
    }

    async init() {
        // Check if we're coming back from an interruption
        await this.loadSavedData();
        
        // Set up offline/online event listeners
        this.setupNetworkHandlers();
        
        await this.loadAllSymbols();
        this.setupWebSocket();
        this.setupEventListeners();
        this.startUpdateLoop();
        this.updateStats();
        this.startClock();
        this.startSentimentUpdates();
    }

    async loadAllSymbols() {
        try {
            this.updateConnectionStatus(false, 'Loading all Binance symbols...');
            
            const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
            const data = await response.json();
            
            // Get ALL trading symbols (not just USDT pairs)
            this.allSymbols = data.symbols
                .filter(symbol => symbol.status === 'TRADING')
                .map(symbol => ({
                    symbol: symbol.symbol,
                    baseAsset: symbol.baseAsset,
                    quoteAsset: symbol.quoteAsset,
                    isSpotTradingAllowed: symbol.isSpotTradingAllowed
                }));

            console.log(`Loaded ${this.allSymbols.length} trading symbols`);
            document.getElementById('totalPairs').textContent = this.allSymbols.length;
            
            await this.loadInitialPrices();
        } catch (error) {
            console.error('Error loading symbols:', error);
            this.updateConnectionStatus(false, 'Failed to load symbols');
        }
    }

    async loadInitialPrices() {
        try {
            this.updateConnectionStatus(false, 'Loading price data...');
            
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            const tickers = await response.json();
            
            tickers.forEach(ticker => {
                const symbolData = this.allSymbols.find(s => s.symbol === ticker.symbol);
                if (symbolData) {
                    this.priceData.set(ticker.symbol, {
                        symbol: ticker.symbol,
                        baseAsset: symbolData.baseAsset,
                        quoteAsset: symbolData.quoteAsset,
                        price: parseFloat(ticker.lastPrice),
                        change: parseFloat(ticker.priceChangePercent),
                        volume: parseFloat(ticker.volume),
                        quoteVolume: parseFloat(ticker.quoteVolume),
                        count: parseInt(ticker.count),
                        lastUpdated: Date.now(),
                        signal: 'HOLD',
                        confidence: 50,
                        buyVolume: 0,
                        sellVolume: 0,
                        deltaVolume: 0
                    });
                }
            });

            await this.loadSampleHistoricalData();
            this.calculateAllSignals();
            this.renderTable();
            this.updateConnectionStatus(true, `Connected - ${this.priceData.size} pairs loaded`);
        } catch (error) {
            console.error('Error loading initial prices:', error);
            this.updateConnectionStatus(false, 'Failed to load price data');
        }
    }

    async loadSampleHistoricalData() {
        this.updateConnectionStatus(false, 'Loading historical data for technical analysis...');
        
        // Load historical data for more symbols in batches
        const allSymbols = Array.from(this.priceData.keys());
        const BATCH_SIZE = 10; // Process 10 symbols at a time
        const MAX_SYMBOLS = 500; // Limit to top 500 by volume for performance
        
        // Sort by volume and take top symbols for historical data
        const topSymbols = allSymbols
            .map(symbol => ({ symbol, volume: this.priceData.get(symbol)?.quoteVolume || 0 }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, MAX_SYMBOLS)
            .map(item => item.symbol);

        console.log(`Loading historical data for ${topSymbols.length} top volume symbols`);

        // Process in batches to avoid overwhelming the API
        for (let i = 0; i < topSymbols.length; i += BATCH_SIZE) {
            const batch = topSymbols.slice(i, i + BATCH_SIZE);
            
            // Process batch concurrently
            const promises = batch.map(symbol => this.loadSymbolHistoricalData(symbol));
            
            try {
                await Promise.allSettled(promises);
                
                // Update progress
                const progress = Math.min(i + BATCH_SIZE, topSymbols.length);
                this.updateConnectionStatus(false, `Loading historical data... (${progress}/${topSymbols.length})`);
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('Batch processing error:', error);
            }
        }

        console.log(`Completed loading historical data for ${this.historicalData.size} symbols`);
    }

    async loadSymbolHistoricalData(symbol) {
        try {
            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=200`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const klines = await response.json();
            
            if (klines && klines.length > 0) {
                const prices = klines.map(k => parseFloat(k[4])); // Close prices
                const highs = klines.map(k => parseFloat(k[2]));
                const lows = klines.map(k => parseFloat(k[3]));
                const volumes = klines.map(k => parseFloat(k[5]));

                this.historicalData.set(symbol, {
                    prices,
                    highs,
                    lows,
                    volumes
                });
            }
        } catch (error) {
            console.error(`Error loading historical data for ${symbol}:`, error);
            // Don't throw, just continue with other symbols
        }
    }

    calculateAllSignals() {
        for (const [symbol, data] of this.priceData.entries()) {
            const analysis = this.calculateTechnicalIndicators(symbol);
            data.signal = analysis.signal;
            data.confidence = analysis.confidence;
            data.tradeResult = analysis.tradeResult;
        }
    }

    setupNetworkHandlers() {
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            this.isOnline = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(false, 'Reconnecting after network restoration...');
            this.handleReconnection();
        });

        window.addEventListener('offline', () => {
            console.log('Network connection lost');
            this.isOnline = false;
            this.updateConnectionStatus(false, 'Offline - Will reconnect when network is available');
            this.saveData(); // Save data when going offline
        });

        // Page visibility change handling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Page hidden - saving data and reducing activity');
                this.saveData();
            } else {
                console.log('Page visible - resuming full activity');
                if (this.isOnline) {
                    this.handleReconnection();
                }
            }
        });
    }

    updateConnectionStatus(connected, message) {
        const status = document.getElementById('connectionStatus');
        status.className = `status ${connected ? 'connected' : 'disconnected'}`;
        status.innerHTML = connected ? 
            `✅ ${message}` : 
            `<span class="spinner"></span>${message}`;
    }
}