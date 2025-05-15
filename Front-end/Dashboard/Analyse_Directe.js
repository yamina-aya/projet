// Initialize and manage the Direct Consumption Dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar
    initSidebar();
    
    // Initialize dashboard
    initDashboard();
});

// Global variables
let currentPeriod = 'week';
let trendChart = null;
let centersChart = null;
let comparisonChart = null;
let trendPeriod = 'semaine';
let comparisonPeriod = 'semaine';
let performerType = 'chauffeur';
let performerMetric = 'quantite';

// Initialize sidebar functionality
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    
    // Remove initializing classes after a short delay
    setTimeout(() => {
        sidebar.classList.remove('sidebar-initializing');
        mainContent.classList.remove('main-content-sidebar-initializing');
    }, 100);
    
    // Add toggle functionality if needed
    document.addEventListener('click', function(e) {
        if (e.target.closest('.sidebar-toggle')) {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('sidebar-collapsed');
        }
    });
}

// Initialize dashboard functionality
function initDashboard() {
    // Initialize period selector
    const periodSelector = document.getElementById('period-selector');
    periodSelector.addEventListener('change', function() {
        loadDashboardData(this.value);
    });
    
    // Initialize tab navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId + '-tab') {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Initialize chart period selectors
    const trendPeriodSelectors = document.querySelectorAll('.trend-period-selector');
    trendPeriodSelectors.forEach(selector => {
        selector.addEventListener('click', function() {
            trendPeriodSelectors.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            loadTrendChart(this.getAttribute('data-period'));
        });
    });
    
    const comparisonPeriodSelectors = document.querySelectorAll('.comparison-period-selector');
    comparisonPeriodSelectors.forEach(selector => {
        selector.addEventListener('click', function() {
            comparisonPeriodSelectors.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            loadComparisonChart(this.getAttribute('data-period'));
        });
    });
    
    // Initialize performers filters
    const performerTypeSelectors = document.querySelectorAll('.performer-type-selector');
    const performerMetricSelectors = document.querySelectorAll('.performer-metric-selector');
    
    performerTypeSelectors.forEach(selector => {
        selector.addEventListener('click', function() {
            performerTypeSelectors.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            loadPerformersTable();
        });
    });
    
    performerMetricSelectors.forEach(selector => {
        selector.addEventListener('click', function() {
            performerMetricSelectors.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            updateMetricHeader(this.getAttribute('data-metric'));
            loadPerformersTable();
        });
    });
    
    // Initialize export button
    const exportButton = document.querySelector('.export-button');
    exportButton.addEventListener('click', function() {
        exportData();
    });
    
    // Load initial data
    loadDashboardData(periodSelector.value);
}

// Update metric header based on selected metric
function updateMetricHeader(metric) {
    const metricHeader = document.getElementById('metric-header');
    switch(metric) {
        case 'quantite':
            metricHeader.textContent = 'Quantité (L)';
            break;
        case 'montant':
            metricHeader.textContent = 'Montant (DA)';
            break;
        case 'frequence':
            metricHeader.textContent = 'Fréquence';
            break;
        default:
            metricHeader.textContent = 'Quantité (L)';
    }
}

// Load all dashboard data
function loadDashboardData(period) {
    loadStatistics(period);
    loadTrendChart(document.querySelector('.trend-period-selector.active').getAttribute('data-period'));
    loadCentersChart(period);
    loadComparisonChart(document.querySelector('.comparison-period-selector.active').getAttribute('data-period'));
    loadAnomalies(period);
    loadPerformersTable();
}

// Load statistics cards
function loadStatistics(period) {
    fetch(`/api/dashboard/direct/statistics?period=${period}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('total-quantity').textContent = formatNumber(data.totalQuantity) + ' L';
            document.getElementById('total-amount').textContent = formatNumber(data.totalAmount) + ' DA';
            document.getElementById('average-per-vehicle').textContent = formatNumber(data.averagePerVehicle) + ' L';
            document.getElementById('total-transactions').textContent = formatNumber(data.totalTransactions);
        })
        .catch(error => {
            console.error('Error fetching statistics:', error);
            // Set default values in case of error
            document.getElementById('total-quantity').textContent = '0 L';
            document.getElementById('total-amount').textContent = '0 DA';
            document.getElementById('average-per-vehicle').textContent = '0 L';
            document.getElementById('total-transactions').textContent = '0';
        });
}

// Modify loadTrendChart function
function loadTrendChart(period) {
    // Mock data instead of fetch
    const mockData = {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        values: [150, 230, 180, 200, 250, 190, 170]
    };

    const ctx = document.getElementById('trend-chart').getContext('2d');
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mockData.labels,
            datasets: [{
                label: 'Consommation (L)',
                data: mockData.values,
                backgroundColor: 'rgba(74, 144, 226, 0.2)',
                borderColor: 'rgba(74, 144, 226, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(74, 144, 226, 1)',
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Modify loadCentersChart function
function loadCentersChart(period) {
    // Mock data instead of fetch
    const mockData = {
        labels: ['Centre A', 'Centre B', 'Centre C', 'Centre D'],
        values: [300, 250, 200, 150]
    };

    const ctx = document.getElementById('centers-chart').getContext('2d');
    const colors = generateColors(mockData.labels.length);
    
    if (centersChart) {
        centersChart.destroy();
    }
    
    centersChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: mockData.labels,
            datasets: [{
                data: mockData.values,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Update legend
    const legendContainer = document.getElementById('centers-legend');
    legendContainer.innerHTML = '';
    mockData.labels.forEach((label, i) => {
        const item = document.createElement('div');
        item.className = 'center-legend-item';
        item.innerHTML = `
            <span class="center-legend-color" style="background-color: ${colors[i]}"></span>
            <span>${label}</span>
        `;
        legendContainer.appendChild(item);
    });
}

// Modify loadComparisonChart function
function loadComparisonChart(period) {
    // Mock data instead of fetch
    const mockData = {
        labels: ['District 1', 'District 2', 'District 3', 'District 4'],
        currentValues: [400, 350, 300, 250],
        previousValues: [380, 330, 310, 280]
    };

    const ctx = document.getElementById('comparison-chart').getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mockData.labels,
            datasets: [
                {
                    label: 'Période Actuelle',
                    data: mockData.currentValues,
                    backgroundColor: 'rgba(74, 144, 226, 0.7)',
                    borderColor: 'rgba(74, 144, 226, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Période Précédente',
                    data: mockData.previousValues,
                    backgroundColor: 'rgba(160, 174, 192, 0.7)',
                    borderColor: 'rgba(160, 174, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

// Load anomalies
function loadAnomalies(period) {
    fetch(`/api/dashboard/direct/anomalies?period=${period}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const anomaliesContainer = document.getElementById('anomalies-list');
            anomaliesContainer.innerHTML = '';
            
            if (data.length === 0) {
                const noAnomalies = document.createElement('div');
                noAnomalies.className = 'no-anomalies';
                noAnomalies.textContent = 'Aucune anomalie détectée pour cette période';
                anomaliesContainer.appendChild(noAnomalies);
                return;
            }
            
            data.forEach(anomaly => {
                const anomalyItem = document.createElement('div');
                anomalyItem.className = `anomaly-item ${anomaly.severity}`;
                
                const anomalyHeader = document.createElement('div');
                anomalyHeader.className = 'anomaly-header';
                
                const anomalyTitle = document.createElement('div');
                anomalyTitle.className = 'anomaly-title';
                anomalyTitle.textContent = anomaly.title;
                
                const anomalyDate = document.createElement('div');
                anomalyDate.className = 'anomaly-date';
                anomalyDate.textContent = anomaly.date;
                
                anomalyHeader.appendChild(anomalyTitle);
                anomalyHeader.appendChild(anomalyDate);
                
                const anomalyDescription = document.createElement('div');
                anomalyDescription.className = 'anomaly-description';
                anomalyDescription.textContent = anomaly.description;
                
                const anomalyEntity = document.createElement('div');
                anomalyEntity.className = 'anomaly-entity';
                anomalyEntity.textContent = anomaly.entity;
                
                anomalyItem.appendChild(anomalyHeader);
                anomalyItem.appendChild(anomalyDescription);
                anomalyItem.appendChild(anomalyEntity);
                
                anomaliesContainer.appendChild(anomalyItem);
            });
        })
        .catch(error => {
            console.error('Error fetching anomalies:', error);
            // Display an error message if needed
        });
}

// Load performers table
function loadPerformersTable() {
    const period = document.getElementById('period-selector').value;
    const type = document.querySelector('.performer-type-selector.active').getAttribute('data-type');
    const metric = document.querySelector('.performer-metric-selector.active').getAttribute('data-metric');
    
    fetch(`/api/dashboard/direct/performers?period=${period}&type=${type}&metric=${metric}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const tableBody = document.getElementById('performers-table-body');
            tableBody.innerHTML = '';
            
            if (data.length === 0) {
                const noDataRow = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.colSpan = 5;
                noDataCell.textContent = 'Aucune donnée disponible';
                noDataCell.style.textAlign = 'center';
                noDataRow.appendChild(noDataCell);
                tableBody.appendChild(noDataRow);
                return;
            }
            
            data.forEach((performer, index) => {
                const row = document.createElement('tr');
                
                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                
                const nameCell = document.createElement('td');
                nameCell.textContent = performer.name;
                
                const centerCell = document.createElement('td');
                centerCell.textContent = performer.center || '-';
                
                const valueCell = document.createElement('td');
                if (metric === 'quantite') {
                    valueCell.textContent = formatNumber(performer.value) + ' L';
                } else if (metric === 'montant') {
                    valueCell.textContent = formatNumber(performer.value) + ' DA';
                } else {
                    valueCell.textContent = formatNumber(performer.value);
                }
                
                const percentageCell = document.createElement('td');
                const total = data.reduce((sum, p) => sum + p.value, 0);
                const percentage = total > 0 ? Math.round((performer.value / total) * 1000) / 10 : 0;
                percentageCell.textContent = percentage + '%';
                
                row.appendChild(rankCell);
                row.appendChild(nameCell);
                row.appendChild(centerCell);
                row.appendChild(valueCell);
                row.appendChild(percentageCell);
                
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching performers data:', error);
            // Display an error message if needed
        });
}

// Export data
function exportData() {
    const period = document.getElementById('period-selector').value;
    window.location.href = `/api/dashboard/direct/export?period=${period}&format=csv`;
}

// Utility function to format numbers with thousands separators
function formatNumber(number) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(number));
}

// Generate colors for charts
function generateColors(count) {
    const baseColors = [
        '#4299e1', // blue
        '#48bb78', // green
        '#ed8936', // orange
        '#9f7aea', // purple
        '#f56565', // red
        '#38b2ac', // teal
        '#ecc94b', // yellow
        '#667eea', // indigo
        '#ed64a6', // pink
        '#a0aec0'  // gray
    ];
    
    // If we need more colors than in our base array, generate them
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    } else {
        const colors = [...baseColors];
        for (let i = baseColors.length; i < count; i++) {
            // Generate random colors with a decent brightness/saturation
            const h = Math.floor(Math.random() * 360);
            const s = Math.floor(50 + Math.random() * 30); // 50-80%
            const l = Math.floor(45 + Math.random() * 15); // 45-60%
            colors.push(`hsl(${h}, ${s}%, ${l}%)`);
        }
        return colors;
    }
}
