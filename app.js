const priceCache = {};

async function fetchHistoricalData(symbol, startDate, endDate) {
    try {
        // Use Yahoo Finance through reliable CORS proxy
        const period1 = Math.floor(startDate.getTime() / 1000);
        const period2 = Math.floor(endDate.getTime() / 1000);
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`)}`);
        
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        const result = data.chart?.result?.[0];
        if (!result) throw new Error('No data available for this symbol');
        
        return {
            symbol: result.meta.symbol,
            timestamps: result.timestamp,
            quotes: result.indicators.quote[0]
        };
    } catch (error) {
        console.error('API Error:', error);
        throw new Error('Could not fetch stock data. Please try a different symbol or check your internet connection.');
    }
}

let chart = null;

async function getStockData() {
    const symbol = document.getElementById('symbol').value.toUpperCase();
    const errorElement = document.getElementById('error');
    const troubleshooting = document.getElementById('troubleshooting');
    const priceDataElement = document.getElementById('price-data');
    const ctx = document.getElementById('candlestick-chart').getContext('2d');
    
    // Forcefully reset chart and canvas
    if (chart) {
        chart.destroy();
        const canvas = document.getElementById('candlestick-chart');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        console.log('Canvas fully reset');
    }
    
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    document.getElementById('startDate').valueAsDate = startDate;
    document.getElementById('endDate').valueAsDate = endDate;
    
    errorElement.textContent = '';
    troubleshooting.innerHTML = '';
    priceDataElement.innerHTML = 'Loading...';

    try {
        const historicalData = await fetchHistoricalData(symbol, startDate, endDate);
        
        // Create price data table
        let tableHTML = `
            <h3>${historicalData.symbol || 'N/A'} - Last 30 Days</h3>
            <table class="price-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Open</th>
                        <th>High</th>
                        <th>Low</th>
                        <th>Close</th>
                        <th>Volume</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Create an array of indices sorted by timestamp in descending order
        const sortedIndices = historicalData.timestamps
            .map((timestamp, index) => ({timestamp, index}))
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(item => item.index);
        
        // Use the sorted indices to display data
        for (let i = 0; i < sortedIndices.length; i++) {
            const idx = sortedIndices[i];
            const date = new Date(historicalData.timestamps[idx] * 1000).toLocaleDateString();
            tableHTML += `
                <tr>
                    <td>${date}</td>
                    <td>$${historicalData.quotes.open[idx].toFixed(2)}</td>
                    <td>$${historicalData.quotes.high[idx].toFixed(2)}</td>
                    <td>$${historicalData.quotes.low[idx].toFixed(2)}</td>
                    <td>$${historicalData.quotes.close[idx].toFixed(2)}</td>
                    <td>${historicalData.quotes.volume[idx].toLocaleString()}</td>
                </tr>
            `;
        }

        tableHTML += `
                </tbody>
            </table>
        `;

        priceDataElement.innerHTML = tableHTML;
        
        // Create candlestick chart
        const candlestickData = historicalData.timestamps.map((timestamp, i) => ({
            x: new Date(timestamp * 1000),
            o: historicalData.quotes.open[i],
            h: historicalData.quotes.high[i],
            l: historicalData.quotes.low[i],
            c: historicalData.quotes.close[i]
        }));
        
        // Initialize financial chart with weekly intervals and proper spacing
        chart = new Chart(ctx, {
            type: 'candlestick',
            plugins: {
                id: 'candlestick',
                beforeInit: function(chart) {
                    const candlestick = require('chartjs-chart-financial').financial;
                    candlestick(chart);
                }
            },
            data: {
                datasets: [{
                    label: `${symbol} Price`,
                    data: candlestickData
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'week',
                            displayFormats: {
                                week: 'MMM d'
                            },
                            tooltipFormat: 'MMM d, yyyy',
                            isoWeekday: true
                        },
                        ticks: {
                            source: 'auto',
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: false
                        },
                        offset: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: {
                            display: true
                        }
                    }
                },
                elements: {
                    candlestick: {
                        borderColor: 'rgba(0, 0, 0, 1)',
                        borderWidth: 1,
                        width: 8,
                        color: {
                            up: 'rgba(0, 150, 0, 1)',
                            down: 'rgba(200, 0, 0, 1)',
                            unchanged: 'rgba(150, 150, 150, 1)'
                        }
                    }
                },
                datasets: {
                    barPercentage: 0.4,
                    categoryPercentage: 0.5
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
        
    } catch (err) {
        errorElement.textContent = `Error: ${err.message}`;
        priceDataElement.innerHTML = '';
        
        troubleshooting.innerHTML = `
            <p>Possible solutions:</p>
            <ul>
                <li>Check your internet connection</li>
                <li>Verify the stock symbol (e.g., AAPL, MSFT)</li>
                <li>Try a different date range</li>
                <li>Wait a moment and try again</li>
            </ul>
        `;
    }
}