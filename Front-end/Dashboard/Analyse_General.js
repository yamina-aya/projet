document.addEventListener("DOMContentLoaded", function() {
    // Toggle sidebar
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.main-content');
    const toggleBtn = document.getElementById('sidebarToggle');

    // Configuration de l'API
    const API_BASE_URL = 'http://localhost:3000';
    
    // Initialize sidebar
    initializeSidebar();
    
    // Initialize filters
    initializeFilters();
    
    // Load initial dashboard data
    loadDashboardData();
    
    // Add event listeners for filters
    addFilterEventListeners();

    function initializeSidebar() {
        sidebar.classList.add('sidebar-initializing');
        content.classList.add('sidebar-initializing');
        
        setTimeout(function() {
            sidebar.classList.remove('sidebar-initializing');
            content.classList.remove('sidebar-initializing');
        }, 50);
        
        const savedState = localStorage.getItem('sidebarCollapsed');
        setSidebarState(savedState === 'true');
        
        toggleBtn.addEventListener('click', function() {
            const currentState = sidebar.classList.contains('collapsed');
            setSidebarState(!currentState);
        });
    }

    function setSidebarState(isCollapsed) {
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            content.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            content.classList.remove('sidebar-collapsed');
        }
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }

    function initializeFilters() {
        // Get filter elements
        const timeFilter = document.getElementById('timeFilterCharts');
        const periodFilter = document.getElementById('periodFilter');
        const entityFilter = document.getElementById('entityFilter');
        const yearFilter = document.getElementById('yearFilter');
        
        // Initialize year filter
        if (yearFilter) {
            const currentYear = new Date().getFullYear();
            for (let year = currentYear; year >= currentYear - 4; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            }
        }
    }

    function addFilterEventListeners() {
        const timeFilterCharts = document.getElementById('timeFilterCharts');
        const yearFilter = document.getElementById('yearFilter');
        const entityFilter = document.getElementById('entityFilter');
        const performanceTypeFilter = document.getElementById('performanceTypeFilter');
        const performanceMetricFilter = document.getElementById('performanceMetricFilter');
        
        if (timeFilterCharts) timeFilterCharts.addEventListener('change', loadDashboardData);
        if (yearFilter) yearFilter.addEventListener('change', loadDashboardData);
        if (entityFilter) entityFilter.addEventListener('change', loadDashboardData);
        if (performanceTypeFilter) performanceTypeFilter.addEventListener('change', loadPerformanceData);
        if (performanceMetricFilter) performanceMetricFilter.addEventListener('change', loadPerformanceData);
    }

    function loadDashboardData() {
        const params = getFilterParams();
        
        // Load all dashboard components
        loadSummaryCards(params);
        updateTypeDistribution(params);
        updateMonthlyConsumption(params);
        updateTypeComparison(params);
        loadPerformanceData();
        loadTransactionsData();
    }

    function getFilterParams() {
        const params = new URLSearchParams();
        const timeFilter = document.getElementById('timeFilterCharts');
        const yearFilter = document.getElementById('yearFilter');
        const entityFilter = document.getElementById('entityFilter');
        
        if (timeFilter) params.append('timeFilter', timeFilter.value);
        if (yearFilter) params.append('year', yearFilter.value);
        if (entityFilter) params.append('entityId', entityFilter.value);
        
        return params;
    }

    function loadSummaryCards(params) {
        fetchWithAuth(`${API_BASE_URL}/api/dashboard/general/summary?${params}`)
            .then(data => {
                updateSummaryCards(data);
            })
            .catch(error => {
                console.error('Error loading summary:', error);
                // Use mock data as fallback
                const mockData = {
                    totalLiters: 12500,
                    totalCost: 1800000,
                    yearlyEvolution: 15.3,
                    mostUsedType: 'Demandes',
                    averageCost: 144,
                    consumptionChange: 5.2,
                    yearlyChange: 15.3,
                    typePercentage: 67.8,
                    costChange: -2.4
                };
                updateSummaryCards(mockData);
            });
    }

    function updateSummaryCards(data) {
        // Update summary card values
        document.getElementById('totalConsumptionLiters').textContent = `${data.totalLiters.toLocaleString()} L`;
        document.getElementById('totalConsumptionCost').textContent = `${data.totalCost.toLocaleString()} DA`;
        document.getElementById('yearlyEvolution').textContent = `${data.yearlyEvolution}%`;
        document.getElementById('mostUsedType').textContent = data.mostUsedType;
        document.getElementById('averageCost').textContent = `${data.averageCost.toLocaleString()} DA`;

        // Update change indicators
        updateChangeIndicator('consumptionChange', data.consumptionChange);
        updateChangeIndicator('yearlyChange', data.yearlyChange);
        updateChangeIndicator('typePercentage', data.typePercentage);
        updateChangeIndicator('costChange', data.costChange);
    }

    function updateChangeIndicator(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            const icon = value >= 0 ? '↑' : '↓';
            const colorClass = value >= 0 ? 'positive-change' : 'negative-change';
            element.textContent = `${icon} ${Math.abs(value)}%`;
            element.className = `change-indicator ${colorClass}`;
        }
    }

    function updateTypeDistribution(params) {
        fetchWithAuth(`${API_BASE_URL}/api/dashboard/general/type-distribution?${params}`)
            .then(data => {
                renderTypeDistribution(data);
            })
            .catch(error => {
                console.error('Error loading type distribution:', error);
                // Use mock data as fallback
                const mockData = {
                    labels: ['Essence', 'Diesel', 'Gasoil', 'Autre'],
                    values: [4500, 3200, 2800, 1000]
                };
                renderTypeDistribution(mockData);
            });
    }

    function renderTypeDistribution(data) {
        // Store the data for later use
        window.typeDistributionChartData = data;
        window.typeDistributionChartConfig = {
            type: 'pie',
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        };

        // Update chart if it's visible
        const chartElement = document.querySelector('#typeDistributionChart');
        if (chartElement && chartElement.classList.contains('active')) {
            updateChart('typeDistribution', data, window.typeDistributionChartConfig);
        }

        // Update table view
        updateTypeDistributionTable(data);
    }

    function updateTypeDistributionTable(data) {
        const tbody = document.querySelector('#typeDistributionTable tbody');
        if (tbody) {
            tbody.innerHTML = '';
            const total = data.values.reduce((a, b) => a + b, 0);
            
            data.labels.forEach((label, index) => {
                const value = data.values[index];
                const percentage = ((value / total) * 100).toFixed(1);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${label}</td>
                    <td>${value.toLocaleString()}</td>
                    <td>${percentage}%</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    function updateMonthlyConsumption(params) {
        fetchWithAuth(`${API_BASE_URL}/api/dashboard/general/monthly-consumption?${params}`)
            .then(data => {
                renderMonthlyConsumption(data);
            })
            .catch(error => {
                console.error('Error loading monthly consumption:', error);
                // Use mock data as fallback
                const mockData = {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                    values: [1200, 1350, 1100, 1500, 1650, 1700],
                    datasets: [{
                        label: 'Consommation mensuelle',
                        data: [1200, 1350, 1100, 1500, 1650, 1700],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        tension: 0.1
                    }]
                };
                renderMonthlyConsumption(mockData);
            });
    }

    function renderMonthlyConsumption(data) {
        // Transform the data for Chart.js
        const chartData = {
            labels: data.map(item => item.month),
            datasets: [{
                label: 'Consommation mensuelle',
                data: data.map(item => item.total),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1,
                fill: true
            }]
        };

        // Store the data for later use
        window.monthlyConsumptionChartData = chartData;
        window.monthlyConsumptionChartConfig = {
            type: 'line',
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Litres'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mois'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y.toLocaleString()} L`;
                            }
                        }
                    }
                }
            }
        };

        // Update chart if it's visible
        const chartElement = document.querySelector('#monthlyConsumptionChart');
        if (chartElement && chartElement.classList.contains('active')) {
            updateChart('monthlyConsumption', chartData, window.monthlyConsumptionChartConfig);
        }

        // Update table view
        updateMonthlyConsumptionTable(data);
    }

    function updateMonthlyConsumptionTable(data) {
        const tbody = document.querySelector('#monthlyConsumptionTable tbody');
        if (tbody) {
            tbody.innerHTML = '';
            
            data.forEach((item, index) => {
                const prevTotal = index > 0 ? data[index - 1].total : item.total;
                const evolution = index === 0 ? '-' : 
                    ((item.total - prevTotal) / prevTotal * 100).toFixed(1) + '%';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.month}</td>
                    <td>${item.total.toLocaleString()} L</td>
                    <td class="${evolution !== '-' ? (parseFloat(evolution) >= 0 ? 'positive-change' : 'negative-change') : ''}">${evolution}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    function updateTypeComparison(params) {
        fetchWithAuth(`${API_BASE_URL}/api/dashboard/general/type-comparison?${params}`)
            .then(data => {
                renderTypeComparison(data);
            })
            .catch(error => {
                console.error('Error loading type comparison:', error);
                // Use mock data as fallback
                const mockData = {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                    datasets: [
                        {
                            label: 'Direct',
                            data: [500, 600, 550, 700, 650, 800],
                            backgroundColor: 'rgba(54, 162, 235, 0.5)'
                        },
                        {
                            label: 'Bons',
                            data: [300, 350, 250, 400, 450, 500],
                            backgroundColor: 'rgba(255, 99, 132, 0.5)'
                        },
                        {
                            label: 'Demandes',
                            data: [200, 250, 150, 200, 300, 250],
                            backgroundColor: 'rgba(255, 206, 86, 0.5)'
                        },
                        {
                            label: 'Cartes',
                            data: [200, 150, 150, 200, 250, 150],
                            backgroundColor: 'rgba(75, 192, 192, 0.5)'
                        }
                    ]
                };
                renderTypeComparison(mockData);
            });
    }

    function renderTypeComparison(data) {
        // Store the data for later use
        window.typeComparisonChartData = data;
        window.typeComparisonChartConfig = {
            type: 'bar',
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };

        // Update chart if it's visible
        const chartElement = document.querySelector('#typeComparisonChart');
        if (chartElement && chartElement.classList.contains('active')) {
            updateChart('typeComparison', data, window.typeComparisonChartConfig);
        }

        // Update table view
        updateTypeComparisonTable(data);
    }

    function updateTypeComparisonTable(data) {
        const tbody = document.querySelector('#typeComparisonTable tbody');
        if (tbody) {
            tbody.innerHTML = '';
            
            data.labels.forEach((label, index) => {
                const values = data.datasets.map(ds => ds.data[index]);
                const total = values.reduce((a, b) => a + b, 0);
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${label}</td>
                    ${values.map(v => `<td>${v.toLocaleString()}</td>`).join('')}
                    <td>${total.toLocaleString()}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    function loadPerformanceData() {
        const params = new URLSearchParams();
        const performanceTypeFilter = document.getElementById('performanceTypeFilter');
        const performanceMetricFilter = document.getElementById('performanceMetricFilter');
        
        if (performanceTypeFilter) params.append('type', performanceTypeFilter.value);
        if (performanceMetricFilter) params.append('metric', performanceMetricFilter.value);
        
        // Add filter params
        const filterParams = getFilterParams();
        filterParams.forEach((value, key) => {
            params.append(key, value);
        });
        
        fetchWithAuth(`${API_BASE_URL}/api/dashboard/general/performance?${params}`)
            .then(data => {
                renderPerformanceData(data);
            })
            .catch(error => {
                console.error('Error loading performance data:', error);
                // Use mock data as fallback
                const mockData = [
                    { name: 'Ahmed Bennabi', type: 'Chauffeur', center: 'Centre Alger', total: 1250, percentage: 12.5 },
                    { name: 'Mohamed Khalil', type: 'Chauffeur', center: 'Centre Alger', total: 1100, percentage: 11.0 },
                    { name: 'Toyota Hilux', type: 'Véhicule', center: 'Centre Oran', total: 950, percentage: 9.5 },
                    { name: 'Lamine Zeroual', type: 'Administrateur', center: 'Centre Constantine', total: 800, percentage: 8.0 },
                    { name: 'Mercedes Sprinter', type: 'Véhicule', center: 'Centre Alger', total: 780, percentage: 7.8 }
                ];
                renderPerformanceData(mockData);
            });
    }

    function renderPerformanceData(data) {
        const tbody = document.querySelector('#performanceTable tbody');
        if (tbody) {
            tbody.innerHTML = '';

            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.name}</td>
                    <td>${row.type}</td>
                    <td>${row.center || '-'}</td>
                    <td>${row.total.toLocaleString()}</td>
                    <td>${row.percentage.toFixed(1)}%</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    function loadTransactionsData() {
        const params = new URLSearchParams();
        const transactionTypeFilter = document.getElementById('transactionTypeFilter');
        const transactionEntityFilter = document.getElementById('transactionEntityFilter');
        
        if (transactionTypeFilter) params.append('type', transactionTypeFilter.value);
        if (transactionEntityFilter) params.append('entity', transactionEntityFilter.value);
        
        // Add filter params
        const filterParams = getFilterParams();
        filterParams.forEach((value, key) => {
            params.append(key, value);
        });
        
        fetchWithAuth(`${API_BASE_URL}/api/dashboard/general/transactions?${params}`)
            .then(data => {
                renderTransactionsData(data);
            })
            .catch(error => {
                console.error('Error loading transactions data:', error);
                // Use mock data as fallback
                const mockData = [
                    { date: '2025-04-28', type: 'Direct', entity: 'Ahmed Bennabi', description: 'Ravitaillement véhicule', quantity: '50L', amount: 7500 },
                    { date: '2025-04-27', type: 'Bon', entity: 'Mohamed Khalil', description: 'Mission transport', quantity: '30L', amount: 4500 },
                    { date: '2025-04-26', type: 'Carte', entity: 'Toyota Hilux', description: 'Carburant hebdomadaire', quantity: '45L', amount: 6750 },
                    { date: '2025-04-25', type: 'Demande', entity: 'Karim Boudiaf', description: 'Déplacement urgence', quantity: '25L', amount: 3750 },
                    { date: '2025-04-24', type: 'Direct', entity: 'Lamine Zeroual', description: 'Approvisionnement', quantity: '60L', amount: 9000 }
                ];
                renderTransactionsData(mockData);
            });
    }

    function renderTransactionsData(data) {
        const tbody = document.querySelector('#transactionsTable tbody');
        if (tbody) {
            tbody.innerHTML = '';

            data.forEach(transaction => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(transaction.date).toLocaleDateString()}</td>
                    <td>${transaction.type}</td>
                    <td>${transaction.entity}</td>
                    <td>${transaction.description}</td>
                    <td>${transaction.quantity}</td>
                    <td>${transaction.amount.toLocaleString()} DA</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    function refreshVisibleCharts() {
        // Check and refresh each chart if it's visible
        const charts = [
            { id: 'typeDistribution', data: window.typeDistributionChartData, config: window.typeDistributionChartConfig },
            { id: 'monthlyConsumption', data: window.monthlyConsumptionChartData, config: window.monthlyConsumptionChartConfig },
            { id: 'typeComparison', data: window.typeComparisonChartData, config: window.typeComparisonChartConfig }
        ];
        
        charts.forEach(chart => {
            if (chart.data && chart.config) {
                const chartElement = document.querySelector(`#${chart.id}Chart`);
                if (chartElement && chartElement.classList.contains('active')) {
                    updateChart(chart.id, chart.data, chart.config);
                }
            }
        });
    }

    // View toggle functionality (chart/table) for each section
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-target');
            const view = button.getAttribute('data-view');
            const parent = button.closest('.chart-card');
            
            // Update button states
            const toggles = parent.querySelectorAll('.toggle-btn');
            toggles.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update view content visibility
            const chartView = parent.querySelector(`#${target}Chart`);
            const tableView = parent.querySelector(`#${target}Table`);
            
            if (view === 'chart' && chartView) {
                chartView.classList.add('active');
                if (tableView) tableView.classList.remove('active');
                // Refresh chart if data exists
                const chartData = window[`${target}ChartData`];
                const chartConfig = window[`${target}ChartConfig`];
                if (chartData && chartConfig) {
                    updateChart(target, chartData, chartConfig);
                }
            } else if (view === 'table' && tableView) {
                tableView.classList.add('active');
                if (chartView) chartView.classList.remove('active');
            }
        });
    });

    // Add CSS class to ensure initial state
    const defaultViews = document.querySelectorAll('.chart-view.active');
    defaultViews.forEach(view => {
        const tableView = view.parentElement.querySelector('.table-view');
        if (tableView) {
            tableView.classList.remove('active');
        }
    });

    // Ensure charts are properly sized on initial load
    refreshVisibleCharts();

    function updateChart(chartName, data, config) {
        const canvas = document.querySelector(`#${chartName}Chart canvas`);
        if (!canvas) return; // Exit if canvas doesn't exist
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (window[`${chartName}ChartInstance`]) {
            window[`${chartName}ChartInstance`].destroy();
        }
        
        // Create new chart
        window[`${chartName}ChartInstance`] = new Chart(ctx, {
            type: config.type,
            data: {
                labels: data.labels,
                datasets: config.type === 'pie' ? [{
                    data: data.values,
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ]
                }] : data.datasets
            },
            options: config.options
        });
    }
    
    // Initialize tables
    initializeTables();
    
    // Initialize tab switching
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabButtons.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // Refresh charts if switching to charts tab
                if (targetId === 'charts') {
                    refreshVisibleCharts();
                }
            }
        });
    });

    function initializeTables() {
        // Initialize Performance Table
        if (document.getElementById('performanceTable')) {
            $('#performanceTable').DataTable({
                responsive: true,
                pageLength: 10,
                order: [[3, 'desc']], // Sort by total column descending
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/fr-FR.json'
                }
            });
        }

        // Initialize Transactions Table
        if (document.getElementById('transactionsTable')) {
            $('#transactionsTable').DataTable({
                responsive: true,
                pageLength: 10,
                order: [[0, 'desc']], // Sort by date column descending
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/fr-FR.json'
                }
            });
        }
    }

    function getAuthToken() {
        return localStorage.getItem('token');
    }

    async function fetchWithAuth(url, options = {}) {
        const token = getAuthToken();
        // if (!token) {
        //     window.location.href = '../login/login.html';
        //     return;
        // }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            // if (response.status === 401) {
            //     // Token expired or invalid
            //     localStorage.removeItem('token');
            //     window.location.href = '../login/login.html';
            //     return;
            // }
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
});

// Authentication check
function checkAuthentication() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login/login.html';
        return false;
    }
    return token;
}

// Initialize all components
function initializeTables() {
    // const token = checkAuthentication();
    // if (!token) return;

    // Set up headers for all fetch requests
    window.fetchConfig = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    // Initialize filters
    setupFilters();
    
    // Load initial data
    loadSummaryData();
    loadTypeDistribution();
    loadMonthlyConsumption();
    loadTypeComparison();
    loadPerformanceData();
    loadTransactionsData();
}

// Initialize tables when document is ready
document.addEventListener('DOMContentLoaded', initializeTables);