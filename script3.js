// Technical Analysis and Indicators
CompleteCryptoDashboard.prototype.calculateTechnicalIndicators = function(symbol) {
    const historical = this.historicalData.get(symbol);
    const currentData = this.priceData.get(symbol);
    
    if (!historical || !currentData || historical.prices.length < 110) {
        // Simple signal based on 24h change for symbols without historical data
        const change = currentData.change;
        if (change > 5) return { 
            signal: 'BUY', 
            confidence: 60 + Math.min(change * 2, 30),
            tradeResult: this.getTradeResult('BUY', 60 + Math.min(change * 2, 30), currentData.change)
        };
        if (change < -5) return { 
            signal: 'SELL', 
            confidence: 60 + Math.min(Math.abs(change) * 2, 30),
            tradeResult: this.getTradeResult('SELL', 60 + Math.min(Math.abs(change) * 2, 30), currentData.change)
        };
        return { 
            signal: 'HOLD', 
            confidence: 50,
            tradeResult: this.getTradeResult('HOLD', 50, currentData.change)
        };
    }

    const prices = historical.prices;
    const highs = historical.highs;
    const lows = historical.lows;
    const volumes = historical.volumes;
    const currentPrice = currentData.price;

    // 4EMA Calculation (9, 20, 55, 110)
    const ema9 = this.calculateEMA(prices, 9);
    const ema20 = this.calculateEMA(prices, 20);
    const ema55 = this.calculateEMA(prices, 55);
    const ema110 = this.calculateEMA(prices, 110);

    // AlphaTrend Calculation
    const alphaTrend = this.calculateAlphaTrend(prices, highs, lows);

    // Enhanced Pivot Points
    const pivotData = this.calculateEnhancedPivotPoints(highs, lows, prices);

    // Bollinger Bands (20-period with 2 std dev)
    const bb = this.calculateBollingerBands(prices, 20);

    // Delta Volume Analysis
    const deltaVolume = this.calculateDeltaVolume(prices, volumes);

    // Signal scoring with all indicators
    let bullishSignals = 0;
    let totalSignals = 0;

    // 4EMA Signal (Price above all EMAs)
    if (currentPrice > ema9 && currentPrice > ema20 && currentPrice > ema55 && currentPrice > ema110) {
        bullishSignals += 2; // Higher weight for EMA alignment
    } else if (currentPrice < ema9 && currentPrice < ema20 && currentPrice < ema55 && currentPrice < ema110) {
        bullishSignals -= 2;
    }
    totalSignals += 2;

    // EMA Trend Direction
    if (ema9 > ema20 && ema20 > ema55 && ema55 > ema110) bullishSignals++;
    else if (ema9 < ema20 && ema20 < ema55 && ema55 < ema110) bullishSignals--;
    totalSignals++;

    // AlphaTrend Signal
    if (alphaTrend.direction === 'up' && alphaTrend.confidence > 0.6) {
        bullishSignals += Math.round(alphaTrend.confidence * 2);
    } else if (alphaTrend.direction === 'down' && alphaTrend.confidence > 0.6) {
        bullishSignals -= Math.round(alphaTrend.confidence * 2);
    }
    totalSignals += 2;

    // Bollinger Bands Signal
    if (currentPrice > bb.middle) bullishSignals++;
    else if (currentPrice < bb.middle) bullishSignals--;
    totalSignals++;

    // Bollinger Band position
    const bbPosition = (currentPrice - bb.lower) / (bb.upper - bb.lower);
    if (bbPosition > 0.8) bullishSignals -= 1; // Overbought
    else if (bbPosition < 0.2) bullishSignals += 1; // Oversold
    totalSignals++;

    // Pivot Points Signal
    const distanceToSupport = Math.abs(currentPrice - pivotData.support1) / currentPrice;
    const distanceToResistance = Math.abs(currentPrice - pivotData.resistance1) / currentPrice;
    
    if (distanceToSupport < 0.02) bullishSignals++; // Near support
    if (distanceToResistance < 0.02) bullishSignals--; // Near resistance
    if (currentPrice > pivotData.pivot) bullishSignals++;
    else bullishSignals--;
    totalSignals += 2;

    // Delta Volume Signal
    if (deltaVolume.trend === 'positive' && deltaVolume.strength > 0.6) {
        bullishSignals += Math.round(deltaVolume.strength * 2);
    } else if (deltaVolume.trend === 'negative' && deltaVolume.strength > 0.6) {
        bullishSignals -= Math.round(deltaVolume.strength * 2);
    }
    totalSignals += 2;

    // Volume momentum
    if (currentData.quoteVolume > 100000) bullishSignals++;
    totalSignals++;

    // 24h change momentum
    if (currentData.change > 3) bullishSignals++;
    else if (currentData.change < -3) bullishSignals--;
    totalSignals++;

    // Calculate final signal
    const bullishRatio = bullishSignals / totalSignals;
    let signal, confidence;

    // Enhanced signal logic
    if (bullishRatio >= 0.75) {
        signal = 'BUY';
        confidence = 75 + (bullishRatio - 0.75) * 100;
    } else if (bullishRatio <= 0.25) {
        signal = 'SELL';
        confidence = 75 + (0.25 - bullishRatio) * 100;
    } else if (bullishRatio >= 0.6) {
        signal = 'BUY';
        confidence = 50 + (bullishRatio - 0.5) * 50;
    } else if (bullishRatio <= 0.4) {
        signal = 'SELL';
        confidence = 50 + (0.5 - bullishRatio) * 50;
    } else {
        signal = 'HOLD';
        confidence = 40 + bullishRatio * 20;
    }

    const finalConfidence = Math.round(Math.min(confidence, 95));
    const tradeResult = this.getTradeResult(signal, finalConfidence, currentData.change);

    return {
        signal,
        confidence: finalConfidence,
        tradeResult
    };
};

CompleteCryptoDashboard.prototype.calculateAlphaTrend = function(prices, highs, lows) {
    if (prices.length < 20) return { direction: 'neutral', confidence: 0 };
    
    // Calculate ATR (Average True Range)
    const atr = this.calculateATR(highs, lows, prices, 14);
    const ema21 = this.calculateEMA(prices, 21);
    
    // AlphaTrend calculation
    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices[prices.length - 2];
    
    // Trend strength based on EMA and ATR
    const trendDistance = Math.abs(currentPrice - ema21) / atr;
    const priceVelocity = (currentPrice - previousPrice) / previousPrice;
    
    let direction = 'neutral';
    let confidence = 0;
    
    if (currentPrice > ema21 && priceVelocity > 0) {
        direction = 'up';
        confidence = Math.min(trendDistance * 0.3 + Math.abs(priceVelocity) * 100, 1);
    } else if (currentPrice < ema21 && priceVelocity < 0) {
        direction = 'down';
        confidence = Math.min(trendDistance * 0.3 + Math.abs(priceVelocity) * 100, 1);
    }
    
    return { direction, confidence };
};

CompleteCryptoDashboard.prototype.calculateATR = function(highs, lows, closes, period) {
    if (highs.length < period + 1) return 1;
    
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
        const tr1 = highs[i] - lows[i];
        const tr2 = Math.abs(highs[i] - closes[i - 1]);
        const tr3 = Math.abs(lows[i] - closes[i - 1]);
        trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    // Calculate average of true ranges
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;
};

CompleteCryptoDashboard.prototype.calculateEnhancedPivotPoints = function(highs, lows, closes) {
    if (highs.length < 20) return { pivot: 0, support1: 0, resistance1: 0 };
    
    // Use recent 20 periods for pivot calculation
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);
    const recentCloses = closes.slice(-20);
    
    const high = Math.max(...recentHighs);
    const low = Math.min(...recentLows);
    const close = recentCloses[recentCloses.length - 1];
    
    const pivot = (high + low + close) / 3;
    const support1 = 2 * pivot - high;
    const resistance1 = 2 * pivot - low;
    
    return { pivot, support1, resistance1, high, low };
};

CompleteCryptoDashboard.prototype.calculateDeltaVolume = function(prices, volumes) {
    if (prices.length < 10 || volumes.length < 10) {
        return { trend: 'neutral', strength: 0, buyVolume: 0, sellVolume: 0 };
    }
    
    let cumulativeDelta = 0;
    let positiveVolume = 0;
    let negativeVolume = 0;
    
    // Analyze last 10 periods (approx 10 minutes if 1h klines, more if shorter)
    for (let i = prices.length - 10; i < prices.length - 1; i++) {
        const priceChange = prices[i + 1] - prices[i];
        const volume = volumes[i];
        
        if (priceChange > 0) {
            positiveVolume += volume;
            cumulativeDelta += volume;
        } else if (priceChange < 0) {
            negativeVolume += volume;
            cumulativeDelta -= volume;
        } else { // Price didn't change, split volume based on previous tick or assign half
            positiveVolume += volume / 2;
            negativeVolume += volume / 2;
        }
    }
    
    const totalAnalyzedVolume = positiveVolume + negativeVolume;
    const deltaRatio = totalAnalyzedVolume > 0 ? cumulativeDelta / totalAnalyzedVolume : 0;
    
    let trend = 'neutral';
    let strength = Math.abs(deltaRatio);
    
    if (deltaRatio > 0.1) trend = 'positive';
    else if (deltaRatio < -0.1) trend = 'negative';
    
    return { 
        trend, 
        strength: Math.min(strength, 1), 
        buyVolume: positiveVolume, 
        sellVolume: negativeVolume 
    };
};

CompleteCryptoDashboard.prototype.calculateEMA = function(prices, period) {
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
};

CompleteCryptoDashboard.prototype.calculateBollingerBands = function(prices, period) {
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((a, b) => a + b) / period;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
        upper: sma + (stdDev * 2),
        middle: sma,
        lower: sma - (stdDev * 2)
    };
};

CompleteCryptoDashboard.prototype.getTradeResult = function(signal, confidence, change24h) {
    const absChange = Math.abs(change24h);
    
    // Enhanced swing detection
    const swingScore = this.calculateSwingPotential(signal, confidence, change24h);
    
    // Check for swing opportunities first
    if (swingScore.isSwingUp && confidence >= 65) {
        return {
            status: 'swing-move',
            text: 'Swing UP (Buy)'
        };
    }
    
    if (swingScore.isSwingDown && confidence >= 65) {
        return {
            status: 'swing-move',
            text: 'Swing DOWN (Sell)'
        };
    }
    
    // Check for extremely high 24h change (risky trade)
    if (absChange > 15) {
        return {
            status: 'risky-trade',
            text: 'Risky Trade'
        };
    }
    
    // High confidence signals
    if (confidence >= 80) {
        if (signal === 'BUY') {
            return {
                status: 'trade-now',
                text: 'Trade Now (Long)'
            };
        } else if (signal === 'SELL') {
            return {
                status: 'trade-now',
                text: 'Trade Now (Short)'
            };
        }
    }
    
    // Medium-high confidence
    if (confidence >= 70) {
        if (signal === 'BUY') {
            return {
                status: 'already-long',
                text: 'Already Traded Long'
            };
        } else if (signal === 'SELL') {
            return {
                status: 'already-short',
                text: 'Already Traded Short'
            };
        }
    }
    
    // Low confidence or HOLD signals
    if (confidence < 60 || signal === 'HOLD') {
        return {
            status: 'dont-trade',
            text: "Don't Trade"
        };
    }
    
    // Default case
    return {
        status: 'dont-trade',
        text: "Don't Trade"
    };
};

CompleteCryptoDashboard.prototype.calculateSwingPotential = function(signal, confidence, change24h) {
    // Check if this is likely a swing opportunity
    const isSwingUp = signal === 'BUY' && 
                    change24h > 2 && change24h < 12 && 
                    confidence >= 65 && confidence < 85;
    
    const isSwingDown = signal === 'SELL' && 
                    change24h < -2 && change24h > -12 && 
                    confidence >= 65 && confidence < 85;
    
    return { isSwingUp, isSwingDown };
};