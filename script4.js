// UI Rendering and Updates
CompleteCryptoDashboard.prototype.getFilteredAndSortedData = function() {
    let filtered = Array.from(this.priceData.values());

    // Apply search filter
    if (this.searchTerm) {
        const search = this.searchTerm.toLowerCase();
        filtered = filtered.filter(data => 
            data.symbol.toLowerCase().includes(search) ||
            data.baseAsset.toLowerCase().includes(search) ||
            data.quoteAsset.toLowerCase().includes(search)
        );
    }

    // Apply symbol filter
    switch (this.currentFilter) {
        case 'usdt':
            filtered = filtered.filter(d => d.quoteAsset === 'USDT');
            break;
        case 'btc':
            filtered = filtered.filter(d => d.quoteAsset === 'BTC');
            break;
        case 'eth':
            filtered = filtered.filter(d => d.quoteAsset === 'ETH');
            break;
        case 'bnb':
            filtered = filtered.filter(d => d.quoteAsset === 'BNB');
            break;
        case 'busd':
            filtered = filtered.filter(d => d.quoteAsset === 'BUSD');
            break;
        case 'spot':
            filtered = filtered.filter(d => d.quoteAsset === 'USDT' || d.quoteAsset === 'BUSD');
            break;
    }

    // Apply quick filters
    switch (this.quickFilter) {
        case 'buy-only':
            filtered = filtered.filter(d => d.signal === 'BUY');
            break;
        case 'sell-only':
            filtered = filtered.filter(d => d.signal === 'SELL');
            break;
        case 'hold-only':
            filtered = filtered.filter(d => d.signal === 'HOLD');
            break;
        case 'swing-up':
            filtered = filtered.filter(d => {
                const swingScore = this.calculateSwingPotential(d.signal, d.confidence, d.change);
                return swingScore.isSwingUp || (d.tradeResult && d.tradeResult.text.includes('Swing UP'));
            });
            break;
        case 'swing-down':
            filtered = filtered.filter(d => {
                const swingScore = this.calculateSwingPotential(d.signal, d.confidence, d.change);
                return swingScore.isSwingDown || (d.tradeResult && d.tradeResult.text.includes('Swing DOWN'));
            });
            break;
        case 'high-confidence':
            filtered = filtered.filter(d => d.confidence >= 75);
            break;
        case 'top-volume':
            filtered = filtered.sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 100);
            break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
        let aVal, bVal;
        
        switch (this.currentSort) {
            case 'swing-up':
                aVal = this.getSwingScore(a, 'up');
                bVal = this.getSwingScore(b, 'up');
                break;
            case 'swing-down':
                aVal = this.getSwingScore(a, 'down');
                bVal = this.getSwingScore(b, 'down');
                break;
            case 'hold':
                // Sort by HOLD position with swing tendencies
                if (a.signal === 'HOLD' && b.signal !== 'HOLD') {
                    return this.sortDirection === 'asc' ? 1 : -1;
                }
                if (a.signal !== 'HOLD' && b.signal === 'HOLD') {
                    return this.sortDirection === 'asc' ? -1 : 1;
                }
                if (a.signal === 'HOLD' && b.signal === 'HOLD') {
                    // Compare deltaVolume to determine buy/sell tendency within HOLD
                    return this.sortDirection === 'asc' ? a.deltaVolume - b.deltaVolume : b.deltaVolume - a.deltaVolume;
                }
                return 0;
                break;
            case 'symbol':
                aVal = a.symbol;
                bVal = b.symbol;
                break;
            case 'price':
                aVal = a.price;
                bVal = b.price;
                break;
            case 'change':
                aVal = a.change;
                bVal = b.change;
                break;
            case 'volume':
                aVal = a.quoteVolume;
                bVal = b.quoteVolume;
                break;
            case 'buyVolume':
                aVal = a.buyVolume || 0;
                bVal = b.buyVolume || 0;
                break;
            case 'sellVolume':
                aVal = a.sellVolume || 0;
                bVal = b.sellVolume || 0;
                break;
            case 'deltaVolume':
                aVal = a.deltaVolume || 0;
                bVal = b.deltaVolume || 0;
                break;
            case 'signal':
                const signalOrder = { 'BUY': 3, 'HOLD': 2, 'SELL': 1 };
                aVal = signalOrder[a.signal] || 0;
                bVal = signalOrder[b.signal] || 0;
                break;
            case 'confidence':
                aVal = a.confidence;
                bVal = b.confidence;
                break;
            case 'trade-result':
                const tradeOrder = { 'trade-now': 5, 'already-long': 4, 'already-short': 3, 'risky-trade': 2, 'dont-trade': 1 };
                aVal = tradeOrder[a.tradeResult?.status] || 0;
                bVal = tradeOrder[b.tradeResult?.status] || 0;
                break;
            case 'updated':
                aVal = a.lastUpdated;
                bVal = b.lastUpdated;
                break;
            default:
                aVal = a.quoteVolume;
                bVal = b.quoteVolume;
        }

        if (typeof aVal === 'string') {
            return this.sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
};

CompleteCryptoDashboard.prototype.renderTable = function() {
    // Store current time to ensure fresh timestamps
    const renderTime = Date.now();
    
    const tbody = document.getElementById('signalsTableBody');
    const filteredData = this.getFilteredAndSortedData();
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">No cryptocurrencies match your filters</td></tr>';
        return;
    }

    // Track when table was last fully refreshed
    this.lastTableRefresh = renderTime;

    pageData.forEach(data => {
        const signalText = this.getSignalText(data.signal, data.confidence, data.symbol);
        const confidenceLabel = this.getConfidenceLabel(data.confidence);
        const tradeResult = data.tradeResult || { status: 'dont-trade', text: "Don't Trade" };

        const row = document.createElement('tr');
        row.id = `row-${data.symbol}`;
        
        // Calculate timestamp based on render time for consistent display
        const timestamp = this.formatTimestamp(data.lastUpdated);
        
        row.innerHTML = `
            <td class="symbol">${data.symbol}</td>
            <td class="price">${this.formatPrice(data.price)} ${data.quoteAsset}</td>
            <td style="color: ${data.change >= 0 ? '#00d4aa' : '#ff6b6b'}">${data.change.toFixed(2)}%</td>
            <td>${this.formatVolume(data.quoteVolume)}</td>
            <td style="color: ${data.deltaVolume >= 0 ? '#00d4aa' : '#ff6b6b'}">${data.deltaVolume ? data.deltaVolume.toFixed(2)+'%' : 'N/A'}</td>
            <td><span class="signal ${this.getSignalClass(data.symbol)}">${signalText}</span></td>
            <td class="confidence ${confidenceLabel.toLowerCase().replace(' ', '-')}">${data.confidence}%</td>
            <td><span class="trade-result ${tradeResult.status}">${tradeResult.text}</span></td>
            <td class="timestamp" data-timestamp="${data.lastUpdated}">${timestamp}</td>
        `;

        tbody.appendChild(row);
    });

    this.updatePagination(filteredData.length);
};

CompleteCryptoDashboard.prototype.updateTableRowImmediate = function(symbol) {
    const row = document.getElementById(`row-${symbol}`);
    if (!row) return;

    const data = this.priceData.get(symbol);
    if (!data) return;

    // Direct DOM updates for maximum speed - avoid requestAnimationFrame overhead
    // Update price cell with highest priority for real-time display
    row.children[1].textContent = `${this.formatPrice(data.price)} ${data.quoteAsset}`;
    
    // Update change with color
    const changeCell = row.children[2];
    changeCell.textContent = `${data.change.toFixed(2)}%`;
    changeCell.style.color = data.change >= 0 ? '#00d4aa' : '#ff6b6b';
    
    // Fast update of critical cells only - less important cells updated less frequently
    row.children[3].textContent = this.formatVolume(data.quoteVolume);
    
    // Update delta volume (buyers vs sellers indicator)
    const deltaCell = row.children[4]; 
    deltaCell.textContent = data.deltaVolume ? data.deltaVolume.toFixed(2)+'%' : 'N/A';
    deltaCell.style.color = data.deltaVolume >= 0 ? '#00d4aa' : '#ff6b6b';
    
    // Fast timestamp update
    row.children[8].textContent = this.formatTimestamp(data.lastUpdated);

    // Apply optimized flash effect for price changes - shorter duration
    if (data.priceChange) {
        const flashClass = data.priceChange > 0 ? 'flash-green' : 'flash-red';
        
        // Clean up existing flash classes first
        row.classList.remove('flash-green', 'flash-red');
        
        // Add flash class immediately
        row.classList.add(flashClass);
        
        // Remove flash class after shorter duration (300ms instead of 500ms)
        setTimeout(() => row.classList.remove(flashClass), 300);
    }
};

CompleteCryptoDashboard.prototype.updateTableRow = function(symbol, signalChanged = false) {
    const row = document.getElementById(`row-${symbol}`);
    if (!row) return;

    const data = this.priceData.get(symbol);
    if (!data) return;

    const signalText = this.getSignalText(data.signal, data.confidence, data.symbol);
    const confidenceLabel = this.getConfidenceLabel(data.confidence);
    const tradeResult = data.tradeResult || { status: 'dont-trade', text: "Don't Trade" };

    // Flash effect on price change or signal change
    if (data.priceChange || signalChanged) {
        const flashClass = signalChanged ? 
            (data.signal === 'BUY' ? 'flash-green' : 'flash-red') :
            (data.priceChange > 0 ? 'flash-green' : 'flash-red');
        
        row.classList.add(flashClass);
        setTimeout(() => row.classList.remove(flashClass), 500);
    }

    row.children[1].textContent = `${this.formatPrice(data.price)} ${data.quoteAsset}`;
    row.children[2].textContent = `${data.change.toFixed(2)}%`;
    row.children[2].style.color = data.change >= 0 ? '#00d4aa' : '#ff6b6b';
    row.children[3].textContent = this.formatVolume(data.quoteVolume);
    
    // Update delta volume with color coding
    const deltaCell = row.children[4];
    deltaCell.textContent = data.deltaVolume ? data.deltaVolume.toFixed(2)+'%' : 'N/A';
    deltaCell.style.color = data.deltaVolume >= 0 ? '#00d4aa' : '#ff6b6b';
    
    row.children[5].innerHTML = `<span class="signal ${this.getSignalClass(data.symbol)}">${signalText}</span>`;
    row.children[6].textContent = `${data.confidence}%`;
    row.children[6].className = `confidence ${confidenceLabel.toLowerCase().replace(' ', '-')}`;
    row.children[7].innerHTML = `<span class="trade-result ${tradeResult.status}">${tradeResult.text}</span>`;
    row.children[8].textContent = this.formatTimestamp(data.lastUpdated);
};

CompleteCryptoDashboard.prototype.updateStats = function() {
    const stats = { BUY: 0, SELL: 0, HOLD: 0 };
    
    for (const data of this.priceData.values()) {
        stats[data.signal]++;
    }

    // Use cached DOM elements and schedule render for better performance
    this.scheduleRender(() => {
        const totalPairsEl = this.getCachedElement('totalPairs');
        const buySignalsEl = this.getCachedElement('buySignals');
        const sellSignalsEl = this.getCachedElement('sellSignals');
        const holdSignalsEl = this.getCachedElement('holdSignals');
        
        totalPairsEl.textContent = this.priceData.size;
        buySignalsEl.textContent = stats.BUY;
        sellSignalsEl.textContent = stats.SELL;
        holdSignalsEl.textContent = stats.HOLD;
    });
};

CompleteCryptoDashboard.prototype.updatePagination = function(totalItems) {
    const totalPages = Math.ceil(totalItems / this.pageSize);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${totalPages} (${totalItems} items)`;
    document.getElementById('prevPage').disabled = this.currentPage === 1;
    document.getElementById('nextPage').disabled = this.currentPage === totalPages;
};

CompleteCryptoDashboard.prototype.getSignalText = function(signal, confidence, symbol) {
    if (signal === 'BUY' && confidence >= 75) return 'BUY/LONG';
    if (signal === 'SELL' && confidence >= 75) return 'SELL/SHORT';
    if (signal === 'HOLD') {
        const symbolData = this.priceData.get(symbol); // Get the symbol data passed as third argument
        if (symbolData) {
            // Show buy/sell tendency for HOLD positions
            if (symbolData.deltaVolume >= 3) {
                return 'HOLD → BUY';
            } else if (symbolData.deltaVolume <= -3) {
                return 'HOLD → SELL';
            }
        }
        return 'HOLD';
    }
    if (confidence <= 25) return 'No Signal';
    return signal;
};

CompleteCryptoDashboard.prototype.getSignalClass = function(symbol) {
    const data = this.priceData.get(symbol);
    if (!data) return 'hold';

    const signal = data.signal;
    
    // Process HOLD signals with buy/sell tendency
    if (signal === 'HOLD') {
        // Check deltaVolume to determine buy/sell tendency
        if (data.deltaVolume >= 3) {
            return 'hold-buy';  // HOLD with buying tendency
        } else if (data.deltaVolume <= -3) {
            return 'hold-sell'; // HOLD with selling tendency
        }
        return 'hold';
    }
    
    return signal.toLowerCase();
};

CompleteCryptoDashboard.prototype.getSwingScore = function(data, direction) {
    const historical = this.historicalData.get(data.symbol);
    if (!historical || historical.prices.length < 20) {
        // Fallback scoring based on 24h change and current signal
        const change24h = data.change;
        if (direction === 'up' && data.signal === 'BUY' && change24h > 1) {
            return change24h * 10 + data.confidence;
        } else if (direction === 'down' && data.signal === 'SELL' && change24h < -1) {
            return Math.abs(change24h) * 10 + data.confidence;
        }
        return 0;
    }
    
    const prices = historical.prices;
    const volumes = historical.volumes;
    const currentPrice = data.price;
    const change24h = data.change;
    
    // Calculate technical indicators for swing analysis
    const recentPrices = prices.slice(-20);
    const minPrice = Math.min(...recentPrices);
    const maxPrice = Math.max(...recentPrices);
    const avgPrice = recentPrices.reduce((a, b) => a + b) / recentPrices.length;
    
    // Calculate momentum indicators
    const momentum = (currentPrice - prices[prices.length - 10]) / prices[prices.length - 10];
    const volatility = this.calculateVolatility(recentPrices);
    const volumeRatio = data.quoteVolume / (volumes.slice(-5).reduce((a, b) => a + b) / 5);
    
    // RSI-like calculation for swing potential
    const rsi = this.calculateSimpleRSI(recentPrices);
    
    let score = 0;
    
    if (direction === 'up') {
        // Swing UP scoring (looking for buyers)
        
        // Price position (favor prices near recent lows but showing upward movement)
        const pricePosition = (currentPrice - minPrice) / (maxPrice - minPrice);
        if (pricePosition < 0.4 && momentum > 0) score += 40; // Near low but moving up
        
        // 24h change momentum
        if (change24h > 2 && change24h < 10) score += 30; // Good upward momentum
        if (change24h > 10) score += 10; // Too much, might be overbought
        
        // Signal alignment
        if (data.signal === 'BUY') score += 25;
        
        // Confidence factor
        if (data.confidence >= 70 && data.confidence < 90) score += 20; // Sweet spot
        
        // Volume surge (buyers coming in)
        if (volumeRatio > 1.5) score += 15;
        
        // RSI oversold but recovering
        if (rsi < 40 && momentum > 0) score += 20;
        
        // Volatility (some volatility is good for swings)
        if (volatility > 0.02 && volatility < 0.08) score += 10;
        
    } else {
        // Swing DOWN scoring (looking for sellers)
        
        // Price position (favor prices near recent highs but showing downward movement)
        const pricePosition = (currentPrice - minPrice) / (maxPrice - minPrice);
        if (pricePosition > 0.6 && momentum < 0) score += 40; // Near high but moving down
        
        // 24h change momentum
        if (change24h < -2 && change24h > -10) score += 30; // Good downward momentum
        if (change24h < -10) score += 10; // Too much, might be oversold
        
        // Signal alignment
        if (data.signal === 'SELL') score += 25;
        
        // Confidence factor
        if (data.confidence >= 70 && data.confidence < 90) score += 20; // Sweet spot
        
        // Volume surge (sellers coming in)
        if (volumeRatio > 1.5) score += 15;
        
        // RSI overbought but declining
        if (rsi > 60 && momentum < 0) score += 20;
        
        // Volatility (some volatility is good for swings)
        if (volatility > 0.02 && volatility < 0.08) score += 10;
    }
    
    return Math.min(score, 200); // Cap at 200 for sorting
};

CompleteCryptoDashboard.prototype.calculateVolatility = function(prices) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const avgReturn = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
};

CompleteCryptoDashboard.prototype.calculateSimpleRSI = function(prices) {
    if (prices.length < 14) return 50; // Neutral if not enough data
    
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i-1]);
    }
    
    const gains = changes.filter(change => change > 0);
    const losses = changes.filter(change => change < 0).map(loss => Math.abs(loss));
    
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b) / gains.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b) / losses.length : 0;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

CompleteCryptoDashboard.prototype.getConfidenceLabel = function(confidence) {
    if (confidence >= 90) return 'Very High';
    if (confidence >= 75) return 'High';
    if (confidence >= 50) return 'Neutral';
    if (confidence >= 25) return 'Low';
    return 'No Movement';
};

CompleteCryptoDashboard.prototype.formatPrice = function(price) {
    if (price >= 1000) return price.toFixed(0);
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    return price.toFixed(8);
};

CompleteCryptoDashboard.prototype.formatVolume = function(volume) {
    if (volume >= 1e9) return (volume / 1e9).toFixed(1) + 'B';
    if (volume >= 1e6) return (volume / 1e6).toFixed(1) + 'M';
    if (volume >= 1e3) return (volume / 1e3).toFixed(1) + 'K';
    return volume.toFixed(0);
};

CompleteCryptoDashboard.prototype.formatTimestamp = function(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return `LIVE 🔴`;
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
};
