document.addEventListener('DOMContentLoaded', function() {
    let chart;
    const API_KEY = 'YOUR_YAHOO_FINANCE_API_KEY'; // Replace with your actual key
    
    document.getElementById('getChart').addEventListener('click', loadChartData);
    
    // Initialize with default data
    loadChartData();

    async function loadChartData() {
        const symbol = document.getElementById('symbol').value.trim().toUpperCase();
        const days = document.getElementById('timeHorizon').value;
        if (!symbol) return;

        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';

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
            document.getElementById('error').textContent = error.message;
            document.getElementById('error').style.display = 'block';
            console.error('Error:', error);
        } finally {
            document.getElementById('loading').style.display = 'none';
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
        const timeHorizonText = {
            '30': '1 Month',
            '90': '3 Months',
            '180': '6 Months',
            '365': '1 Year'
        };
        const days = document.getElementById('timeHorizon').value;
        document.querySelector('h1').textContent = 
            `Stock Price Viewer - ${stockData.symbol} (${timeHorizonText[days]})`;
        
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
                type: 'datetime'
            },
            yaxis: {
                labels: {
                    formatter: function(value) {
                        return '$' + value.toFixed(2);
                    }
                }
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
});