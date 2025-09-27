document.addEventListener('DOMContentLoaded', function() {
    let chart;
    const API_KEY = 'YOUR_YAHOO_FINANCE_API_KEY'; // Your existing key
    
    document.getElementById('getChart').addEventListener('click', loadChartData);
    
    // Initialize with default data
    loadChartData();

    async function loadChartData() {
        const symbol = document.getElementById('symbol').value.trim().toUpperCase();
        const days = document.getElementById('timeHorizon').value;
        if (!symbol) return;

        showLoading(true);
        hideError();

        try {
            const period1 = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000);
            const period2 = Math.floor(Date.now() / 1000);
            const url = `https://corsproxy.io/?${encodeURIComponent(
                `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`
            )}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('API request failed');
            
            const data = await response.json();
            const result = data.chart?.result?.[0];
            if (!result) throw new Error('No data available');
            
            renderCandlestickChart(transformData(result));
        } catch (error) {
            showError(error.message);
            console.error('Error:', error);
        } finally {
            showLoading(false);
        }
    }

    function transformData(result) {
        const quotes = result.indicators.quote[0];
        return {
            symbol: result.meta.symbol,
            prices: result.timestamp.map((ts, i) => ({
                date: new Date(ts * 1000).toISOString().split('T')[0],
                open: quotes.open[i],
                high: quotes.high[i],
                low: quotes.low[i],
                close: quotes.close[i]
            }))
        };
    }

    function renderCandlestickChart(stockData) {
        // Update stock info title
        const timeHorizonText = {
            '30': '1 Month',
            '90': '3 Months',
            '180': '6 Months',
            '365': '1 Year'
        };
        const days = document.getElementById('timeHorizon').value;
        document.getElementById('stockTitle').innerHTML = `
            ${stockData.symbol} 
            <span>${timeHorizonText[days]} View</span>
        `;
        
        // Update price table
        updatePriceTable(stockData.prices);
        
        const seriesData = stockData.prices.map(price => ({
            x: new Date(price.date),
            y: [price.open, price.high, price.low, price.close]
        }));

        const options = {
            series: [{
                data: seriesData
            }],
            chart: {
                type: 'candlestick',
                height: '100%',
                width: '100%',
                background: 'white'
            },
            plotOptions: {
                candlestick: {
                    colors: {
                        upward: '#26a69a',
                        downward: '#ef5350'
                    },
                    wick: {
                        useFillColor: true
                    }
                }
            },
            xaxis: {
                type: 'datetime',
                labels: {
                    datetimeUTC: false,
                    formatter: function(value) {
                        return new Date(value).toLocaleDateString();
                    }
                }
            },
            yaxis: {
                labels: {
                    formatter: function(value) {
                        return '$' + value.toFixed(2);
                    }
                },
                tooltip: {
                    enabled: true,
                    formatter: function(value) {
                        return '$' + value.toFixed(2);
                    }
                }
            },
            grid: {
                borderColor: '#f1f1f1'
            }
        };

        if (chart) {
            chart.updateOptions(options);
        } else {
            chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
        }
    }

    function updatePriceTable(prices) {
        const tableBody = document.querySelector('#price-table tbody');
        tableBody.innerHTML = '';
        
        prices.forEach(price => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${price.date}</td>
                <td>$${price.high.toFixed(2)}</td>
                <td>$${price.low.toFixed(2)}</td>
                <td>$${price.close.toFixed(2)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    function showError(message) {
        const errorElement = document.getElementById('error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    function hideError() {
        document.getElementById('error').style.display = 'none';
    }
});