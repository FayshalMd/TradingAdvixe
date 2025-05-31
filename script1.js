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
            
            // Use a CORS proxy to avoid CORS issues when running locally
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const apiUrl = 'https://api.binance.com/api/v3/exchangeInfo';
            
            const response = await fetch(`${proxyUrl}${encodeURIComponent(apiUrl)}`);
            const data = await response.json();
            
            // Check if data.symbols exists before attempting to filter it
            if (!data || !data.symbols || !Array.isArray(data.symbols)) {
                console.error('Invalid API response format:', data);
                throw new Error('Invalid API response format - missing symbols array');
            }
            
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
            
            // Fallback to saved data if API failed
            if (this.priceData.size > 0) {
                console.log('Using saved data as fallback since API failed');
                this.updateConnectionStatus(true, `Using ${this.priceData.size} symbols from saved data`);
                this.renderTable();
            }
        }
    }

    async loadInitialPrices() {
        try {
            console.log('Loading initial price data...');
            // Use a CORS proxy to avoid CORS issues when running locally
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const apiUrl = 'https://api.binance.com/api/v3/ticker/24hr';
            
            let attempts = 0;
            let maxAttempts = 3;
            let response;
            
            while (attempts < maxAttempts) {
                try {
                    response = await fetch(`${proxyUrl}${encodeURIComponent(apiUrl)}`);
                    if (response.ok) break;
                    throw new Error(`Failed attempt ${attempts + 1}: ${response.status}`);
                } catch (fetchError) {
                    console.warn(`Fetch attempt ${attempts + 1} failed:`, fetchError);
                    attempts++;
                    if (attempts >= maxAttempts) throw fetchError;
                    // Wait before retrying
                    await new Promise(r => setTimeout(r, 1000 * attempts));
                }
            }
            
            const data = await response.json();
            
            this.updateConnectionStatus(false, 'Loading price data...');
            
            data.forEach(ticker => {
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
        const BATCH_SIZE = 50; // Increased batch size for faster processing
        const MAX_SYMBOLS = 1500; // Increased to 1500 symbols for better market coverage
        
        // Prioritize USDT pairs first as they're most important
        const usdtPairs = allSymbols.filter(s => s.endsWith('USDT'));
        const otherPairs = allSymbols.filter(s => !s.endsWith('USDT'));
        
        // Get volume data for sorting
        const volumeMap = new Map();
        allSymbols.forEach(symbol => {
            volumeMap.set(symbol, this.priceData.get(symbol)?.quoteVolume || 0);
        });
        
        // Sort USDT pairs by volume first, then other pairs
        const sortedUsdtPairs = usdtPairs
            .sort((a, b) => volumeMap.get(b) - volumeMap.get(a));
            
        const sortedOtherPairs = otherPairs
            .sort((a, b) => volumeMap.get(b) - volumeMap.get(a));
            
        // Combine with priority to USDT pairs
        const topSymbols = [
            ...sortedUsdtPairs.slice(0, Math.min(sortedUsdtPairs.length, MAX_SYMBOLS * 0.7)),
            ...sortedOtherPairs.slice(0, Math.min(sortedOtherPairs.length, MAX_SYMBOLS * 0.3))
        ].slice(0, MAX_SYMBOLS);

        console.log(`Loading historical data for ${topSymbols.length} top volume symbols`);

        // Create multiple parallel workers to load data faster
        const PARALLEL_WORKERS = 10; // Increased from 5 to 10 parallel workers
        let completedCount = 0;
        
        // Start worker processes
        const startTime = Date.now();
        console.log(`Starting ${PARALLEL_WORKERS} parallel workers for data loading`);
        
        // Create a promise for each worker
        const workerPromises = [];
        
        for (let worker = 0; worker < PARALLEL_WORKERS; worker++) {
            const promise = this.processHistoricalDataBatch(topSymbols, worker, PARALLEL_WORKERS, BATCH_SIZE)
                .then(processed => {
                    completedCount += processed;
                    const pctComplete = (completedCount / topSymbols.length * 100).toFixed(1);
                    console.log(`Worker ${worker+1} completed, processed ${processed} symbols (${pctComplete}% done)`);
                    return processed;
                })
                .catch(error => {
                    console.error(`Worker ${worker+1} failed:`, error);
                    return 0;
                });
                
            workerPromises.push(promise);
        }
        
        // Fast progress updates for better feedback
        const progressInterval = setInterval(() => {
            const progress = Math.min(completedCount, topSymbols.length);
            const pctComplete = (progress / topSymbols.length * 100).toFixed(1);
            this.updateConnectionStatus(false, `Loading historical data... (${progress}/${topSymbols.length}, ${pctComplete}%)`);
        }, 200); // Update more frequently
        
        // Wait for all workers to complete
        Promise.allSettled(workerPromises).then(results => {
            const totalProcessed = results.reduce((sum, result) => sum + (result.value || 0), 0);
            const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            
            clearInterval(progressInterval);
            console.log(`Completed loading historical data in ${timeElapsed}s: ${this.historicalData.size} symbols`);
            this.updateConnectionStatus(true, `Data loaded for ${this.historicalData.size} symbols in ${timeElapsed}s`);
            
            // Calculate signals once all historical data is loaded
            this.calculateAllSignals();
        });
    }
    
    async processHistoricalDataBatch(allSymbols, workerIndex, workerCount, batchSize) {
        let processedCount = 0;
        let successCount = 0;
        let failCount = 0;
        
        // Calculate each worker's share of symbols with better distribution
        const workerSymbols = [];
        for (let i = workerIndex; i < allSymbols.length; i += workerCount) {
            workerSymbols.push(allSymbols[i]);
        }
        
        // Process in smaller sub-batches for better progress tracking
        const SUB_BATCH_SIZE = 20; // Process 20 at a time within each worker
        
        for (let i = 0; i < workerSymbols.length; i += SUB_BATCH_SIZE) {
            const subBatch = workerSymbols.slice(i, i + SUB_BATCH_SIZE);
            if (subBatch.length === 0) break;
            
            // Process sub-batch concurrently
            const promises = subBatch.map(symbol => this.loadSymbolHistoricalData(symbol));
            
            try {
                const results = await Promise.allSettled(promises);
                
                // Track success/failure rates
                results.forEach(result => {
                    if (result.status === 'fulfilled' && result.value === true) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                });
                
                processedCount += subBatch.length;
                
                // Nearly zero delay between sub-batches for maximum speed
                await new Promise(resolve => setTimeout(resolve, 5));
            } catch (error) {
                console.error(`Sub-batch processing error in worker ${workerIndex}:`, error);
            }
        }
        
        console.log(`Worker ${workerIndex+1} completed with ${successCount} successes, ${failCount} failures`);
        return processedCount;
    }

    async loadSymbolHistoricalData(symbol) {
        try {
            // Use AbortController to timeout long-running requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=200`,
                { signal: controller.signal }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Use faster response processing
            const klines = await response.json();
            
            if (klines && klines.length > 0) {
                // Pre-allocate arrays for better performance
                const len = klines.length;
                const prices = new Array(len);
                const highs = new Array(len);
                const lows = new Array(len);
                const volumes = new Array(len);
                
                // Manual loop is faster than multiple map operations
                for (let i = 0; i < len; i++) {
                    const k = klines[i];
                    prices[i] = +k[4]; // Using unary + is faster than parseFloat
                    highs[i] = +k[2];
                    lows[i] = +k[3];
                    volumes[i] = +k[5];
                }
                
                this.historicalData.set(symbol, {
                    prices,
                    highs,
                    lows,
                    volumes
                });
                
                return true; // Successfully processed
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`Fetch timeout for ${symbol}`);
            } else {
                console.error(`Error loading historical data for ${symbol}:`, error);
            }
            // Don't throw, just continue with other symbols
        }
        
        return false; // Failed to process
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
