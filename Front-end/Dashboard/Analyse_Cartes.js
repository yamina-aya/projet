// Global variables for charts
let trendChart = null;
let centersChart = null;

// Date range variables
let startDate = null;
let endDate = null;
let currentPeriod = 'month'; // Default period

// Colors for charts
const colors = [
  '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', 
  '#5a5c69', '#858796', '#6610f2', '#6f42c1', '#fd7e14'
];

$(document).ready(function() {
    // Initialize all components
    initSidebar();
    initDateRange();
    initTabButtons();
    initTrendPeriodSelectors();
    initPerformerTypeSelectors();
    initPerformerMetricSelectors();
    
    // Initialize DataTables with explicit dimensions
    $('#transactionsTable').DataTable({
        responsive: true,
        pageLength: 10,
        scrollX: true,
        autoWidth: false,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.10.22/i18n/French.json'
        }
    });

    $('#anomaliesTable').DataTable({
        responsive: true,
        pageLength: 5,
        scrollX: true,
        autoWidth: false,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.10.22/i18n/French.json'
        }
    });

    $('#performersTable').DataTable({
        responsive: true,
        pageLength: 5,
        scrollX: true,
        autoWidth: false,
        searching: false,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.10.22/i18n/French.json'
        }
    });

    // Initialize charts with a slight delay to ensure containers are ready
    setTimeout(() => {
        // Initialize trend chart with sample data
        const trendData = generateSampleTrendData('week');
        renderTrendChart(trendData);

        // Initialize centers chart with sample data
        const centersData = generateSampleCentersData();
        renderCentersChart(centersData);

        // Load initial data
        loadDashboardData('week');
    }, 300);

    // Handle tab switching
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        // Redraw charts and tables when switching tabs
        if (e.target.id === 'charts-tab') {
            if (trendChart) trendChart.resize();
            if (centersChart) centersChart.resize();
        }
        $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
    });
});

// Initialize sidebar functionalities
function initSidebar() {
    // Handle logout
    $('#logoutBtn').click(function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
}

// Initialize date range picker
function initDateRange() {
    $('#daterange').daterangepicker({
        opens: 'left',
        startDate: moment().subtract(7, 'days'),
        endDate: moment(),
        ranges: {
            'Aujourd\'hui': [moment(), moment()],
            'Hier': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            '7 Derniers Jours': [moment().subtract(6, 'days'), moment()],
            '30 Derniers Jours': [moment().subtract(29, 'days'), moment()],
            'Ce Mois': [moment().startOf('month'), moment().endOf('month')],
            'Mois Précédent': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
        locale: {
            format: 'DD/MM/YYYY',
            applyLabel: 'Appliquer',
            cancelLabel: 'Annuler',
            fromLabel: 'De',
            toLabel: 'À',
            customRangeLabel: 'Période Personnalisée',
            daysOfWeek: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
            monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
        }
    }, function(start, end, label) {
        // Reload data with new date range
        fetchAndRefreshData(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
    });
}

// Initialize tab buttons
function initTabButtons() {
    $('#dashboardTabs a').on('click', function(e) {
        e.preventDefault();
        $(this).tab('show');
    });
}

// Initialize trend period selectors
function initTrendPeriodSelectors() {
    $('.period-selector button').click(function() {
        $('.period-selector button').removeClass('active');
        $(this).addClass('active');
        loadTrendData($(this).data('period'));
    });
}

// Initialize performer type selectors
function initPerformerTypeSelectors() {
    $('#performerType').change(function() {
        loadTopConsumers();
    });
}

// Initialize performer metric selectors
function initPerformerMetricSelectors() {
    $('#performerMetric').change(function() {
        loadTopConsumers();
    });
}

// Load dashboard statistics
function loadStatistics() {
    const startDate = $('#daterange').data('daterangepicker').startDate.format('YYYY-MM-DD');
    const endDate = $('#daterange').data('daterangepicker').endDate.format('YYYY-MM-DD');
    
    fetchStats(startDate, endDate)
        .then(data => {
            updateStatistics(data);
        })
        .catch(error => {
            console.error('Error loading statistics:', error);
            // Show default values on error
            updateStatistics({
                active_cards: 0,
                total_liters: 0,
                total_amount: 0,
                avg_transaction: 0
            });
        });
}

// Update statistics on the dashboard
function updateStatistics(data) {
    $('#activeCards').text(formatNumber(data.active_cards));
    $('#totalLiters').text(formatNumber(data.total_liters) + ' L');
    $('#totalAmount').text(formatMoney(data.total_amount) + ' DA');
    $('#avgTransaction').text(formatNumber(data.avg_transaction) + ' L');
}

// Load trend data
function loadTrendData() {
    const startDate = $('#daterange').data('daterangepicker').startDate.format('YYYY-MM-DD');
    const endDate = $('#daterange').data('daterangepicker').endDate.format('YYYY-MM-DD');
    const period = $('.period-selector button.active').data('period') || 'week';
    
    fetchTrendData(period, startDate, endDate)
        .then(data => {
            renderTrendChart(data);
        })
        .catch(error => {
            console.error('Error loading trend data:', error);
            // Show sample data on error
            renderTrendChart(generateSampleTrendData(period));
        });
}

// Render trend chart
function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Consommation (L)',
                data: data.values,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// Load centers data
function loadCentersData() {
    const startDate = $('#daterange').data('daterangepicker').startDate.format('YYYY-MM-DD');
    const endDate = $('#daterange').data('daterangepicker').endDate.format('YYYY-MM-DD');
    
    fetchCentersData(startDate, endDate)
        .then(data => {
            renderCentersChart(data);
        })
        .catch(error => {
            console.error('Error loading centers data:', error);
            // Show sample data on error
            renderCentersChart(generateSampleCentersData());
        });
}

// Render centers chart
function renderCentersChart(data) {
    const ctx = document.getElementById('centersChart');
    
    if (centersChart) {
        centersChart.destroy();
    }
    
    centersChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.centers.map(center => center.name),
            datasets: [{
                data: data.centers.map(center => center.value),
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12
                    }
                }
            }
        }
    });
    
    // Render legend outside chart if needed
    renderCentersLegend(data.centers);
}

// Render centers legend (if needed)
function renderCentersLegend(centers) {
    // This function can be implemented if you want to customize the legend display
    // outside of the Chart.js default legend
}

// Load recent transactions
function loadRecentTransactions() {
    const startDate = $('#daterange').data('daterangepicker').startDate.format('YYYY-MM-DD');
    const endDate = $('#daterange').data('daterangepicker').endDate.format('YYYY-MM-DD');
    
    fetchTransactionsData(startDate, endDate)
        .then(data => {
            renderRecentTransactions(data);
        })
        .catch(error => {
            console.error('Error loading transactions:', error);
            // Show sample data on error
            renderRecentTransactions({transactions: generateSampleTransactionsData()});
        });
}

// Render recent transactions table
function renderRecentTransactions(data) {
    // Clear and update transactions table
    const table = $('#transactionsTable').DataTable();
    table.clear();
    
    data.transactions.forEach(transaction => {
        table.row.add([
            transaction.card_number,
            transaction.driver,
            transaction.center,
            formatDateDisplay(transaction.date),
            formatNumber(transaction.quantity) + ' L',
            formatMoney(transaction.amount) + ' DA'
        ]);
    });
    
    table.draw();
}

// Load top consumers data
function loadTopConsumers() {
    const startDate = $('#daterange').data('daterangepicker').startDate.format('YYYY-MM-DD');
    const endDate = $('#daterange').data('daterangepicker').endDate.format('YYYY-MM-DD');
    const type = $('#performerType').val();
    const metric = $('#performerMetric').val();
    
    fetchTopPerformers(startDate, endDate, type, metric)
        .then(data => {
            renderTopConsumers(data, type, metric);
        })
        .catch(error => {
            console.error('Error loading top consumers:', error);
            // Show sample data on error
            renderTopConsumers({performers: generateSamplePerformersData(type, metric)}, type, metric);
        });
}

// Render top consumers table
function renderTopConsumers(data, type, metric) {
    // Clear and update performers table
    const table = $('#performersTable').DataTable();
    table.clear();
    
    // Determine unit based on metric
    let unit = '';
    if (metric === 'quantity') {
        unit = ' L';
    } else if (metric === 'amount') {
        unit = ' DA';
    }
    
    data.performers.forEach(performer => {
        let formattedValue;
        if (metric === 'quantity') {
            formattedValue = formatNumber(performer.value) + unit;
        } else if (metric === 'amount') {
            formattedValue = formatMoney(performer.value) + unit;
        } else {
            formattedValue = formatNumber(performer.value);
        }
        
        table.row.add([
            performer.name,
            formattedValue
        ]);
    });
    
    table.draw();
}

// Export dashboard data
function exportData() {
    const startDate = $('#daterange').data('daterangepicker').startDate.format('YYYY-MM-DD');
    const endDate = $('#daterange').data('daterangepicker').endDate.format('YYYY-MM-DD');
    exportDashboardData(startDate, endDate);
}

// Format date for API requests
function formatDate(date) {
    if (date instanceof Date) {
        return date.toISOString().split('T')[0];
    }
    return date;
}

// Format date for display
function formatDateDisplay(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return moment(date).format('DD/MM/YYYY HH:mm');
}

// Format number with thousand separators
function formatNumber(number) {
    return parseFloat(number).toLocaleString('fr-FR');
}

// Format monetary values
function formatMoney(amount) {
    return parseFloat(amount).toLocaleString('fr-FR');
}

// Fetch and refresh all dashboard data
function fetchAndRefreshData(startDate, endDate) {
    loadStatistics();
    loadTrendData();
    loadCentersData();
    loadRecentTransactions();
    loadTopConsumers();
    loadAnomalies(startDate, endDate);
}

// Fetch statistics data from API
function fetchStats(startDate, endDate) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/dashboard/cards/stats?start_date=${startDate}&end_date=${endDate}`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            success: function(response) {
                resolve(response);
            },
            error: function(xhr) {
                console.error('Error fetching statistics:', xhr.responseText);
                if (xhr.status === 401 || xhr.status === 403) {
                    // Redirect to login on authentication error
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                }
                reject(xhr);
            }
        });
    });
}

// Fetch trend data from API
function fetchTrendData(period, startDate, endDate) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/dashboard/cards/trend?start_date=${startDate}&end_date=${endDate}&period=${period}`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            success: function(response) {
                resolve(response);
            },
            error: function(xhr) {
                console.error('Error fetching trend data:', xhr.responseText);
                reject(xhr);
            }
        });
    });
}

// Fetch centers data from API
function fetchCentersData(startDate, endDate) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/dashboard/cards/centers?start_date=${startDate}&end_date=${endDate}`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            success: function(response) {
                resolve(response);
            },
            error: function(xhr) {
                console.error('Error fetching centers data:', xhr.responseText);
                reject(xhr);
            }
        });
    });
}

// Fetch transactions data from API
function fetchTransactionsData(startDate, endDate) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/dashboard/cards/transactions?start_date=${startDate}&end_date=${endDate}`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            success: function(response) {
                resolve(response);
            },
            error: function(xhr) {
                console.error('Error fetching transactions data:', xhr.responseText);
                reject(xhr);
            }
        });
    });
}

// Fetch top performers data from API
function fetchTopPerformers(startDate, endDate, type, metric) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/dashboard/cards/performers?start_date=${startDate}&end_date=${endDate}&type=${type}&metric=${metric}`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            success: function(response) {
                resolve(response);
            },
            error: function(xhr) {
                console.error('Error fetching performers data:', xhr.responseText);
                reject(xhr);
            }
        });
    });
}

// Fetch anomalies data from API
function fetchAnomaliesData(startDate, endDate) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/dashboard/cards/anomalies?start_date=${startDate}&end_date=${endDate}`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            success: function(response) {
                resolve(response);
            },
            error: function(xhr) {
                console.error('Error fetching anomalies data:', xhr.responseText);
                reject(xhr);
            }
        });
    });
}

// Export dashboard data to Excel
function exportDashboardData(startDate, endDate) {
    const token = localStorage.getItem('token');
    window.location.href = `/api/dashboard/cards/export?start_date=${startDate}&end_date=${endDate}&token=${token}`;
}

// Load anomalies data and render the table
function loadAnomalies(startDate, endDate) {
    fetchAnomaliesData(startDate, endDate)
        .then(data => {
            renderAnomalies(data);
        })
        .catch(error => {
            console.error('Error loading anomalies:', error);
            // Show sample data on error
            renderAnomalies({anomalies: generateSampleAnomaliesData()});
        });
}

// Render anomalies table
function renderAnomalies(data) {
    // Clear and update anomalies table
    const table = $('#anomaliesTable').DataTable();
    table.clear();
    
    data.anomalies.forEach(anomaly => {
        table.row.add([
            anomaly.card_number,
            anomaly.driver,
            formatNumber(anomaly.quantity) + ' L',
            formatDateDisplay(anomaly.date)
        ]);
    });
    
    table.draw();
}

// Generate sample trend data for fallback
function generateSampleTrendData(period) {
    const result = {
        labels: [],
        values: []
    };
    
    if (period === 'week') {
        result.labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        for (let i = 0; i < 7; i++) {
            result.values.push(Math.floor(Math.random() * 1000) + 200);
        }
    } else if (period === 'month') {
        for (let i = 1; i <= 30; i++) {
            result.labels.push(`${i < 10 ? '0' + i : i}/04`);
            result.values.push(Math.floor(Math.random() * 800) + 150);
        }
    } else if (period === 'year') {
        result.labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        for (let i = 0; i < 12; i++) {
            result.values.push(Math.floor(Math.random() * 10000) + 2000);
        }
    }
    
    return result;
}

// Generate sample centers data for fallback
function generateSampleCentersData() {
    return {
        centers: [
            { name: 'Centre Alger', value: 4500 },
            { name: 'Centre Oran', value: 3200 },
            { name: 'Centre Constantine', value: 2800 },
            { name: 'Centre Annaba', value: 2100 },
            { name: 'Centre Blida', value: 1800 }
        ]
    };
}

// Generate sample transactions data for fallback
function generateSampleTransactionsData() {
    const transactions = [];
    const centers = ['Centre Alger', 'Centre Oran', 'Centre Constantine', 'Centre Annaba', 'Centre Blida'];
    const drivers = ['Ahmed Ali', 'Karim Benzema', 'Mohamed Safi', 'Sofiane Belarbi', 'Rachid Taha'];
    
    for (let i = 0; i < 10; i++) {
        const quantity = Math.floor(Math.random() * 80) + 20;
        const price = 30; // Example price per liter
        transactions.push({
            card_number: `CARD-${1000 + Math.floor(Math.random() * 9000)}`,
            driver: drivers[Math.floor(Math.random() * drivers.length)],
            center: centers[Math.floor(Math.random() * centers.length)],
            date: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
            quantity: quantity,
            amount: quantity * price
        });
    }
    
    return transactions;
}

// Generate sample performers data for fallback
function generateSamplePerformersData(type, metric) {
    const performers = [];
    const drivers = ['Ahmed Ali', 'Karim Benzema', 'Mohamed Safi', 'Sofiane Belarbi', 'Rachid Taha'];
    const centers = ['Centre Alger', 'Centre Oran', 'Centre Constantine', 'Centre Annaba', 'Centre Blida'];
    const districts = ['District Nord', 'District Sud', 'District Est', 'District Ouest', 'District Centre'];
    
    let names;
    if (type === 'driver') {
        names = drivers;
    } else if (type === 'center') {
        names = centers;
    } else if (type === 'district') {
        names = districts;
    }
    
    for (let i = 0; i < names.length; i++) {
        let value;
        if (metric === 'quantity') {
            value = Math.floor(Math.random() * 1000) + 200;
        } else if (metric === 'amount') {
            value = Math.floor(Math.random() * 30000) + 6000;
        } else { // count
            value = Math.floor(Math.random() * 50) + 10;
        }
        
        performers.push({
            name: names[i],
            value: value
        });
    }
    
    // Sort by value in descending order
    performers.sort((a, b) => b.value - a.value);
    
    return performers;
}

// Generate sample anomalies data for fallback
function generateSampleAnomaliesData() {
    const anomalies = [];
    const drivers = ['Ahmed Ali', 'Karim Benzema', 'Mohamed Safi', 'Sofiane Belarbi', 'Rachid Taha'];
    
    for (let i = 0; i < 5; i++) {
        anomalies.push({
            card_number: `CARD-${1000 + Math.floor(Math.random() * 9000)}`,
            driver: drivers[Math.floor(Math.random() * drivers.length)],
            quantity: Math.floor(Math.random() * 200) + 100,
            date: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    
    return anomalies;
}

// Initialize DataTables with proper configuration
function initializeTables() {
    $('#transactionsTable').DataTable({
        responsive: true,
        pageLength: 10,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.10.22/i18n/French.json'
        },
        drawCallback: function() {
            $(this).find('tbody tr').slice(-3).find('td').css('border-bottom', 'none');
        }
    });

    $('#anomaliesTable').DataTable({
        responsive: true,
        pageLength: 5,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.10.22/i18n/French.json'
        }
    });

    $('#performersTable').DataTable({
        responsive: true,
        pageLength: 5,
        searching: false,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.10.22/i18n/French.json'
        }
    });
}
