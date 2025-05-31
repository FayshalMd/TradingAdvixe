* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%);
    color: #e0e0e0;
    min-height: 100vh;
    padding: 20px;
}

.header {
    text-align: center;
    margin-bottom: 30px;
}

.header h1 {
    color: #00d4aa;
    font-size: 2.5rem;
    margin-bottom: 10px;
    text-shadow: 0 0 20px rgba(0, 212, 170, 0.3);
}

.current-time {
    background: rgba(42, 42, 42, 0.8);
    border: 1px solid #404040;
    border-radius: 10px;
    padding: 10px 20px;
    margin-bottom: 15px;
    display: inline-block;
    font-family: 'Courier New', monospace;
    font-size: 1.1rem;
    color: #00d4aa;
    text-shadow: 0 0 10px rgba(0, 212, 170, 0.3);
}

.time-label {
    font-size: 0.8rem;
    color: #888;
    margin-right: 10px;
}

.time-value {
    font-weight: bold;
    color: #ffffff;
}

.stats-bar {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.greed-fear-container {
    background: rgba(42, 42, 42, 0.8);
    border: 1px solid #404040;
    border-radius: 15px;
    padding: 20px;
    margin: 40px auto 20px auto;
    max-width: 500px;
    text-align: center;
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.greed-fear-title {
    color: #00d4aa;
    font-size: 1.3rem;
    font-weight: bold;
    margin-bottom: 15px;
    text-shadow: 0 0 10px rgba(0, 212, 170, 0.3);
}

.greed-meter {
    position: relative;
    width: 200px;
    height: 100px;
    margin: 0 auto 15px auto;
    background: linear-gradient(90deg, 
        #ff4444 0%, 
        #ff8800 25%, 
        #ffdd00 50%, 
        #88dd00 75%, 
        #00dd00 100%);
    border-radius: 100px 100px 0 0;
    overflow: hidden;
}

.greed-needle {
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 3px;
    height: 90px;
    background: #ffffff;
    transform-origin: bottom center;
    transform: translateX(-50%) rotate(0deg);
    transition: transform 0.5s ease;
    border-radius: 3px;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

.greed-needle::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    width: 10px;
    height: 10px;
    background: #ffffff;
    border-radius: 50%;
    transform: translateX(-50%);
}

.greed-value {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 5px;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.greed-label {
    font-size: 1.1rem;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 10px;
}

.greed-description {
    font-size: 0.9rem;
    color: #ccc;
    line-height: 1.4;
}

.greed-scale {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #888;
    margin-top: 10px;
}

.greed-levels {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
    margin-top: 15px;
}

.greed-level {
    padding: 5px;
    border-radius: 5px;
    font-size: 0.7rem;
    font-weight: bold;
    text-align: center;
}

.level-extreme-fear { background: rgba(255, 68, 68, 0.8); }
.level-fear { background: rgba(255, 136, 0, 0.8); }
.level-neutral { background: rgba(255, 221, 0, 0.8); color: #000; }
.level-greed { background: rgba(136, 221, 0, 0.8); }
.level-extreme-greed { background: rgba(0, 221, 0, 0.8); }

.market-indicators {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 10px;
    margin-top: 15px;
}

.indicator-item {
    background: rgba(0, 0, 0, 0.3);
    padding: 8px;
    border-radius: 8px;
    border: 1px solid #404040;
}

.indicator-value {
    font-size: 1.1rem;
    font-weight: bold;
    color: #00d4aa;
}

.indicator-label {
    font-size: 0.7rem;
    color: #888;
    text-transform: uppercase;
}

.last-updated {
    font-size: 0.7rem;
    color: #666;
    margin-top: 10px;
    font-style: italic;
}

.stat-item {
    background: rgba(42, 42, 42, 0.8);
    padding: 10px 20px;
    border-radius: 10px;
    border: 1px solid #404040;
    text-align: center;
}

.stat-number {
    font-size: 1.5rem;
    font-weight: bold;
    color: #00d4aa;
}

.stat-label {
    font-size: 0.8rem;
    color: #888;
}

.status {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.9rem;
    margin-bottom: 20px;
}

.status.connected {
    background: rgba(0, 212, 170, 0.2);
    border: 1px solid #00d4aa;
    color: #00d4aa;
}

.status.disconnected {
    background: rgba(255, 107, 107, 0.2);
    border: 1px solid #ff6b6b;
    color: #ff6b6b;
}

.status.offline {
    background: rgba(255, 165, 0, 0.2);
    border: 1px solid #ffa500;
    color: #ffa500;
    animation: blink 2s infinite;
}

.status.reconnecting {
    background: rgba(255, 255, 0, 0.2);
    border: 1px solid #ffff00;
    color: #ffff00;
}

@keyframes blink {
    0%, 50% { opacity: 1; }
    25%, 75% { opacity: 0.5; }
}

.controls {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-bottom: 30px;
    flex-wrap: wrap;
    align-items: center;
}

.search-container {
    position: relative;
    min-width: 300px;
}

.search-input {
    width: 100%;
    background: #2a2a2a;
    color: #e0e0e0;
    border: 1px solid #404040;
    padding: 12px 45px 12px 15px;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.search-input:focus {
    outline: none;
    border-color: #00d4aa;
    box-shadow: 0 0 10px rgba(0, 212, 170, 0.3);
}

.search-icon {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
    font-size: 1.2rem;
}

.clear-search {
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #ff6b6b;
    cursor: pointer;
    font-size: 1rem;
    display: none;
}

.filter-select, .sort-select {
    background: #2a2a2a;
    color: #e0e0e0;
    border: 1px solid #404040;
    padding: 12px 15px;
    border-radius: 8px;
    font-size: 1rem;
    min-width: 180px;
    cursor: pointer;
}

.filter-select:focus, .sort-select:focus {
    outline: none;
    border-color: #00d4aa;
    box-shadow: 0 0 10px rgba(0, 212, 170, 0.3);
}

/* Toggle switch for low bandwidth mode */
.toggle-container {
    display: flex;
    align-items: center;
    margin: 0 5px;
}

.toggle-label {
    margin-left: 10px;
    font-size: 0.9rem;
    color: #e0e0e0;
    white-space: nowrap;
}

.toggle-switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #2a2a2a;
    transition: .4s;
    border: 1px solid #404040;
}

.slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 4px;
    bottom: 3px;
    background-color: #e0e0e0;
    transition: .4s;
}

input:checked + .slider {
    background-color: #00d4aa;
    border-color: #00d4aa;
}

input:checked + .slider:before {
    transform: translateX(26px);
    background-color: #ffffff;
}

.slider.round {
    border-radius: 24px;
}

.slider.round:before {
    border-radius: 50%;
}

.quick-filters {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.quick-filter-btn {
    background: #2a2a2a;
    color: #e0e0e0;
    border: 1px solid #404040;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.quick-filter-btn:hover {
    border-color: #00d4aa;
    background: rgba(0, 212, 170, 0.1);
}

.quick-filter-btn.active {
    background: #00d4aa;
    color: #000;
    border-color: #00d4aa;
}

.table-container {
    background: rgba(42, 42, 42, 0.8);
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    overflow-x: auto;
    max-height: 80vh;
    overflow-y: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
}

th {
    background: linear-gradient(135deg, #333333 0%, #404040 100%);
    color: #00d4aa;
    padding: 15px 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #00d4aa;
    position: sticky;
    top: 0;
    z-index: 10;
    cursor: pointer;
    user-select: none;
}

th:hover {
    background: linear-gradient(135deg, #404040 0%, #505050 100%);
}

th:first-child { border-radius: 10px 0 0 0; }
th:last-child { border-radius: 0 10px 0 0; }

.sort-arrow {
    margin-left: 5px;
    font-size: 0.8rem;
    opacity: 0.6;
}

td {
    padding: 12px;
    border-bottom: 1px solid #404040;
    transition: all 0.3s ease;
}

tr:hover {
    background: rgba(0, 212, 170, 0.1);
}

.symbol {
    font-weight: bold;
    color: #ffffff;
    font-family: 'Courier New', monospace;
}

.price {
    font-family: 'Courier New', monospace;
    font-weight: bold;
}

.signal {
    padding: 6px 12px;
    border-radius: 6px;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    font-size: 0.85rem;
    white-space: nowrap;
}

.signal.buy {
    background: linear-gradient(135deg, #00d4aa 0%, #00b894 100%);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(0, 212, 170, 0.4);
}

.signal.sell {
    background: linear-gradient(135deg, #ff6b6b 0%, #e55353 100%);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
}

.signal.hold {
    background: linear-gradient(135deg, #ffd93d 0%, #f39c12 100%);
    color: #2c2c2c;
    box-shadow: 0 4px 15px rgba(255, 217, 61, 0.4);
}

.signal.hold-buy {
    background: linear-gradient(135deg, #ffd93d 0%, #6ad38c 100%);
    color: #2c2c2c;
    box-shadow: 0 4px 15px rgba(106, 211, 140, 0.4);
}

.signal.hold-sell {
    background: linear-gradient(135deg, #ffd93d 0%, #ff9d9d 100%);
    color: #2c2c2c;
    box-shadow: 0 4px 15px rgba(255, 157, 157, 0.4);
}

.signal.no-movement {
    background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
    color: #ffffff;
}

.trade-result {
    padding: 6px 12px;
    border-radius: 6px;
    font-weight: bold;
    text-align: center;
    font-size: 0.85rem;
    white-space: nowrap;
}

.trade-result.trade-now {
    background: linear-gradient(135deg, #00d4aa 0%, #00b894 100%);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(0, 212, 170, 0.4);
    animation: pulse 2s infinite;
}

.trade-result.already-long {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
}

.trade-result.already-short {
    background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
}

.trade-result.dont-trade {
    background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
    color: #ffffff;
}

.trade-result.risky-trade {
    background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
    color: #212529;
    box-shadow: 0 4px 15px rgba(255, 193, 7, 0.4);
    animation: blink 1.5s infinite;
}

.trade-result.swing-move {
    background: linear-gradient(135deg, #8e44ad 0%, #3498db 100%);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(142, 68, 173, 0.4);
    animation: pulseSlow 2.5s infinite;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

@keyframes pulseSlow {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
}

.confidence {
    font-weight: bold;
}

.confidence.very-high { color: #00d4aa; }
.confidence.high { color: #28a745; }
.confidence.neutral { color: #ffd93d; }
.confidence.low { color: #ff6b6b; }
.confidence.no-movement { color: #6c757d; }

.timestamp {
    font-size: 0.8rem;
    color: #888;
}

/* Style for live timestamps */
.timestamp.live-update {
    color: #00d4aa;
    font-weight: bold;
    animation: pulseLive 1s infinite;
}

/* Style for highlighting recent updates */
.recent-update {
    color: #00d4aa !important;
    animation: pulseLive 1s infinite;
    font-weight: bold;
}

@keyframes pulseLive {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.flash-green {
    animation: flashGreen 0.5s ease-in-out;
}

.flash-red {
    animation: flashRed 0.5s ease-in-out;
}

@keyframes flashGreen {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(0, 212, 170, 0.3); }
}

@keyframes flashRed {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(255, 107, 107, 0.3); }
}

.loading {
    text-align: center;
    padding: 40px;
    color: #888;
}

.spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid #404040;
    border-top: 2px solid #00d4aa;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 10px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.tooltip {
    position: absolute;
    background: #2a2a2a;
    color: #e0e0e0;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    z-index: 1000;
    display: none;
    border: 1px solid #404040;
    max-width: 200px;
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
}

.pagination button {
    background: #2a2a2a;
    color: #e0e0e0;
    border: 1px solid #404040;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.pagination button:hover:not(:disabled) {
    border-color: #00d4aa;
    background: rgba(0, 212, 170, 0.1);
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination .current-page {
    background: #00d4aa;
    color: #000;
    border-color: #00d4aa;
}

.disclaimer {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid #ff6b6b;
    border-radius: 10px;
    padding: 20px;
    margin: 20px auto;
    max-width: 800px;
    text-align: center;
}

.disclaimer h3 {
    color: #ff6b6b;
    font-size: 1.2rem;
    margin-bottom: 10px;
    text-transform: uppercase;
    font-weight: bold;
}

.disclaimer p {
    color: #e0e0e0;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 10px;
}

.disclaimer .warning {
    color: #ffd93d;
    font-weight: bold;
    font-size: 1.1rem;
    text-transform: uppercase;
}

@media (max-width: 768px) {
    .header h1 { font-size: 2rem; }
    .controls { flex-direction: column; }
    .search-container { min-width: 250px; }
    .filter-select, .sort-select { min-width: 150px; }
    .stats-bar { gap: 15px; }
}

/* Enhanced Mobile Responsiveness */
@media (max-width: 480px) {
    body {
        padding: 10px;
    }

    .header h1 {
        font-size: 1.8rem;
        margin-bottom: 8px;
    }

    .current-time {
        font-size: 0.9rem;
        padding: 8px 15px;
    }

    .stats-bar {
        gap: 10px;
        margin-bottom: 15px;
    }

    .stat-item {
        padding: 8px 12px;
        min-width: 70px;
    }

    .stat-number {
        font-size: 1.2rem;
    }

    .stat-label {
        font-size: 0.7rem;
    }

    .controls {
        gap: 10px;
        margin-bottom: 20px;
    }

    .search-container {
        min-width: 100%;
        order: -1;
    }

    .filter-select, .sort-select {
        min-width: 120px;
        padding: 10px 12px;
        font-size: 0.9rem;
    }

    .quick-filters {
        justify-content: center;
    }

    .quick-filter-btn {
        padding: 6px 10px;
        font-size: 0.8rem;
    }

    /* Mobile Table Optimizations */
    .table-container {
        padding: 10px;
        max-height: 75vh;
        border-radius: 10px;
    }

    .table-container {
        overflow-y: auto;
        max-height: none;
    }

    tbody td {
        max-width: none;
        overflow: visible;
        text-overflow: clip;
    }

    .symbol { min-width: auto; }
    .price { min-width: auto; }
    td:nth-child(3) { min-width: auto; }

    /* Add spacing between cards for better UX */
    #signalsTable {
        margin-bottom: 15px;
    }

    /* Improve loading state on mobile */
    #signalsTableBody .loading {
        padding: 30px 15px;
        border-radius: 8px;
        background: rgba(30, 30, 30, 0.7);
        text-align: center;
    }

    /* Make pagination more mobile-friendly */
    #pagination {
        padding: 10px 5px;
        background: rgba(30, 30, 30, 0.7);
        border-radius: 8px;
        margin-top: 15px;
    }
}

/* Tablet Optimizations */
@media (min-width: 481px) and (max-width: 768px) {
    .header h1 {
        font-size: 2.2rem;
    }

    .controls {
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
    }

    .search-container {
        min-width: 280px;
    }

    .filter-select, .sort-select {
        min-width: 160px;
    }

    table {
        font-size: 0.9rem;
    }

    th, td {
        padding: 10px 8px;
    }

    .signal, .trade-result {
        font-size: 0.8rem;
    }
}

/* Desktop Optimizations */
@media (min-width: 1200px) {
    .header h1 {
        font-size: 3rem;
    }

    .table-container {
        max-height: 85vh;
    }

    table {
        font-size: 1rem;
    }

    th, td {
        padding: 15px 12px;
    }

    .signal, .trade-result {
        font-size: 0.9rem;
        padding: 8px 15px;
    }

    .controls {
        max-width: 1200px;
        margin: 0 auto 30px auto;
    }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
    th, .quick-filter-btn, .pagination button {
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .search-input {
        min-height: 44px;
    }

    .filter-select, .sort-select {
        min-height: 44px;
    }

    /* Larger tap targets for mobile */
    .clear-search {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .search-icon {
        font-size: 1.4rem;
    }
}

/* Horizontal scroll indicator for mobile tables */
@media (max-width: 768px) {
    .table-container::after {
        content: "← Swipe to see more columns →";
        display: block;
        text-align: center;
        font-size: 0.7rem;
        color: #888;
        padding: 5px 0;
        border-top: 1px solid #404040;
        margin-top: 10px;
    }

    .table-container {
        position: relative;
    }

    /* Add shadow to indicate scrollable content */
    .table-container {
        background: linear-gradient(90deg, rgba(42, 42, 42, 1) 0%, rgba(42, 42, 42, 0) 10%, rgba(42, 42, 42, 0) 90%, rgba(42, 42, 42, 1) 100%),
                   rgba(42, 42, 42, 0.8);
    }

    /* Fix mobile table display issues */
    .table-container {
        overflow-y: auto;
        max-height: none;
    }

    tbody td {
        max-width: none;
        overflow: visible;
        text-overflow: clip;
    }

    .symbol { min-width: auto; }
    .price { min-width: auto; }
    td:nth-child(3) { min-width: auto; }
}

/* Loading state optimizations for mobile */
@media (max-width: 768px) {
    .loading {
        padding: 20px;
        font-size: 0.9rem;
    }

    .spinner {
        width: 16px;
        height: 16px;
    }
}

/* Complete mobile table redesign for better responsiveness */
@media (max-width: 768px) {
    /* Reset table layout */
    table, thead, tbody, tr, th, td {
        display: block;
        width: 100%;
        box-sizing: border-box;
    }
    
    /* Hide table header for mobile view */
    thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px;
        visibility: hidden;
    }
    
    /* Create card-like rows */
    tbody tr {
        border: 1px solid #404040;
        border-radius: 8px;
        margin-bottom: 15px;
        background: rgba(30, 30, 30, 0.9);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        overflow: hidden;
    }
    
    /* Style each cell like a row with label + value */
    tbody td {
        position: relative;
        padding: 10px 8px 10px 45%;
        min-height: 40px;
        text-align: right;
        border-bottom: 1px solid #333;
        line-height: 1.4;
        word-break: break-word;
    }
    
    /* Remove bottom border from last cell */
    tbody tr td:last-child {
        border-bottom: none;
    }
    
    /* Add cell labels for mobile view */
    tbody td::before {
        content: attr(data-label);
        position: absolute;
        top: 50%;
        left: 10px;
        width: 40%;
        transform: translateY(-50%);
        white-space: nowrap;
        text-align: left;
        font-weight: bold;
        color: #00d4aa;
    }
    
    /* Reset special styling for certain cells on mobile */
    .signal, .trade-result {
        display: inline-block;
        margin: 0;
        padding: 4px 8px;
        font-size: 0.75rem;
        width: auto;
        text-align: center;
    }
    
    /* Special styling for the symbol cell (as header) */
    tbody td.symbol {
        background: linear-gradient(135deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 184, 148, 0.2) 100%);
        font-size: 1rem;
        text-align: center;
        font-weight: bold;
        border-radius: 8px 8px 0 0;
        border-bottom: 2px solid rgba(0, 212, 170, 0.5);
        padding: 12px 8px;
    }
    
    /* Symbol cell doesn't need label */
    tbody td.symbol::before {
        display: none;
    }
    
    /* Remove white-space nowrap to allow wrapping */
    tbody td {
        white-space: normal;
    }
    
    /* Improve column-specific styling */
    tbody td:nth-child(3) {
        background: rgba(0, 0, 0, 0.1); /* Change color */
    }
    
    tbody td:nth-child(6) {
        background: rgba(0, 0, 0, 0.1); /* Signal */
    }
    
    tbody td:nth-child(8) {
        background: rgba(0, 0, 0, 0.1); /* Trade Result */
    }
    
    /* Fix values alignment for better readability */
    tbody td.price {
        font-family: 'Courier New', monospace;
    }
    
    /* Replace horizontal scrolling with card layout */
    .table-container {
        overflow-x: hidden !important;
        padding: 15px;
        background: rgba(42, 42, 42, 0.8);
    }
    
    /* Hide the swipe indicator since we no longer need horizontal scrolling */
    .table-container::after {
        display: none !important;
    }
    
    /* Fix table dimensions */
    table {
        display: block;
        width: 100%;
        min-width: auto !important;
        table-layout: auto;
        font-size: 0.85rem;
    }
    
    /* Fix trade signals in card view */
    .signal.buy,
    .signal.sell,
    .signal.hold,
    .signal.hold-buy,
    .signal.hold-sell,
    .trade-result.trade-now,
    .trade-result.already-long,
    .trade-result.already-short,
    .trade-result.dont-trade,
    .trade-result.risky-trade,
    .trade-result.swing-move {
        display: inline-block !important;
        width: auto !important;
        min-width: 80px;
        box-shadow: none;
    }
    
    /* Adjust confidence cell display */
    .confidence {
        text-align: right;
        padding-right: 15px;
        font-size: 0.9rem;
    }
    
    /* Fix for loading state during initial load */
    #signalsTableBody tr td.loading {
        padding: 30px 15px !important;
        text-align: center;
    }
    
    /* Fix for any tr with a single cell spanning multiple columns */
    #signalsTableBody tr td[colspan] {
        padding: 15px !important;
        text-align: center;
    }
    
    /* Fix for the "no data" message */
    #signalsTableBody tr td[colspan]::before {
        display: none;
    }
    
    /* Fix any conflicting mobile styles */
    .table-container {
        max-height: none !important;
        overflow-x: hidden !important;
    }
    
    tbody td {
        white-space: normal !important;
    }
}
