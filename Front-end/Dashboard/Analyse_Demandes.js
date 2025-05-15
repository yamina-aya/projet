// summary-cards.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('Summary cards script loaded');

    // Configuration
    const API_BASE_URL = 'http://localhost:3000/api';
    
    // Récupérer les éléments DOM
    const periodFilter = document.getElementById('period-filter');
    const entityFilter = document.getElementById('entity-filter');
    const centerSelect = document.getElementById('center-select');
    const centerSelectContainer = document.getElementById('center-select-container');
    const userTypeFilter = document.getElementById('user-type-filter');
    const performerType = document.getElementById('performer-type');
    const performanceMetric = document.getElementById('performance-metric');
    const modal = document.getElementById('anomaly-modal');
    const closeModal = document.querySelector('.close-modal');
    const solveAnomalyForm = document.getElementById('solve-anomaly-form');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const centerColumn = document.getElementById('center-column');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const customDateRange = document.getElementById('custom-date-range');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const applyDateBtn = document.getElementById('apply-date-btn');
    
    // Debug: Check if elements exist
    const statElements = {
        totalDemands: document.getElementById('total-demands'),
        activeDemands: document.getElementById('active-demands'),
        expiredDemands: document.getElementById('expired-demands'),
        usedDemands: document.getElementById('used-demands')
    };

    // Variables for current user role and structure
    let userRole = '';
    let userStructure = null;
    let selectedCenterId = null;
    let centersData = [];

    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('sidebar-collapsed');
    });

    // Dropdown functionality
    const dropdownBtns = document.querySelectorAll('.dropdown-btn');
    
    dropdownBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const dropdownParent = this.closest('.dropdown');
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown').forEach(drop => {
                if (drop !== dropdownParent) {
                    drop.classList.remove('active');
                }
            });
            
            // Toggle current dropdown
            dropdownParent.classList.toggle('active');
        });
    });

    // Gestion des onglets
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Désactiver tous les onglets
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.style.display = 'none');
            
            // Activer l'onglet sélectionné
            const tabId = this.getAttribute('data-tab');
            this.classList.add('active');
            document.getElementById(tabId).style.display = 'block';
        });
    });

    // Show/hide date range inputs based on period selection
    if (periodFilter) {
        periodFilter.addEventListener('change', function() {
            if (this.value === 'personnalise') {
                customDateRange.style.display = 'flex';
            } else {
                customDateRange.style.display = 'none';
                loadDashboardData();
            }
        });
    }

    // Apply custom date range
    if (applyDateBtn) {
        applyDateBtn.addEventListener('click', function() {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            
            if (!startDate || !endDate) {
                showNotification('Veuillez sélectionner une date de début et de fin', 'error');
                return;
            }
            
            if (new Date(startDate) > new Date(endDate)) {
                showNotification('La date de début doit être antérieure à la date de fin', 'error');
                return;
            }
            
            loadDashboardData();
        });
    }

    // Center selection change event
    if (centerSelect) {
        centerSelect.addEventListener('change', function() {
            selectedCenterId = this.value;
            loadDashboardData();
        });
    }

    // Afficher/masquer la colonne Centre selon le type de performer
    if (performerType) {
        performerType.addEventListener('change', function() {
            if (this.value === 'chauffeur' || this.value === 'admin' || this.value === 'vehicule') {
                centerColumn.style.display = '';
            } else {
                centerColumn.style.display = 'none';
            }
            loadTopPerformers();
        });
    }

    // Initialize dashboard
    initializeUserInterface();
    loadDashboardData();

    // Function to initialize UI based on user role
    function initializeUserInterface() {
        // For now, load everything without user role checks
        // In a production environment, you'd add role-based checks here
        loadStats();
    }

    // Main function to load all dashboard data
    function loadDashboardData() {
        loadStats();
        loadTrendsChart();
        loadStatusChart();
        loadTopPerformers();
        loadAnomaliesCheck();
    }

    // Load stats function stays mostly the same
    function loadStats() {
        console.log('Starting loadStats function');
        console.log('Fetching stats from:', `${API_BASE_URL}/dashboard/demand/stats`);

        fetch(`${API_BASE_URL}/dashboard/demand/stats`)
            .then(response => {
                console.log('Response status:', response.status);
                console.log('Response headers:', [...response.headers.entries()]);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Stats data received:', data);
                
                if (!data) {
                    throw new Error('No data received from API');
                }

                // Update DOM elements
                updateStatCards(data);
            })
            .catch(error => {
                console.error('Error in loadStats:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                });

                // Use mock data as fallback
                const mockData = {
                    total: 1256,
                    actives: 742,
                    expirees: 215,
                    utilisees: 299
                };
                console.log('Using mock data:', mockData);
                updateStatCards(mockData);
            });
    }

    // Load trends chart
    loadTrendsChart();

    function loadTrendsChart(period = 'annee') {
        console.log('Loading trends chart data for period:', period);
        
        fetch(`${API_BASE_URL}/dashboard/demand/trend?period=${period}`)
            .then(response => {
                console.log('Trends chart response:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Trends data received:', data);
                createTrendsChart(data);
            })
            .catch(error => {
                console.error('Error loading trends data:', error);
                // Use mock data as fallback
                const mockData = generateMockTrendsData(period);
                console.log('Using mock trends data:', mockData);
                createTrendsChart(mockData);
            });
    }

    function createTrendsChart(data) {
        const ctx = document.getElementById('trend-chart');
        if (!ctx) {
            console.error('Trends chart canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (window.trendsChart) {
            window.trendsChart.destroy();
        }

        // Process data for chart
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const datasets = {
            valide: { label: 'Validées', color: '#4CAF50' },
            utilise: { label: 'Utilisées', color: '#2196F3' },
            expire: { label: 'Expirées', color: '#F44336' }
        };

        // Organize data by status
        const organizedData = {};
        Object.keys(datasets).forEach(status => {
            organizedData[status] = new Array(12).fill(0);
        });

        data.forEach(item => {
            const monthIndex = months.indexOf(item.period);
            if (monthIndex !== -1 && organizedData[item.statut]) {
                organizedData[item.statut][monthIndex] = item.count;
            }
        });

        // Create chart
        window.trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: Object.entries(datasets).map(([status, config]) => ({
                    label: config.label,
                    data: organizedData[status],
                    borderColor: config.color,
                    backgroundColor: `${config.color}20`,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 300 // Faster animations for better performance
                }
            }
        });
    }

    function generateMockTrendsData(period = 'annee') {
        let labels = [];
        const statuts = ['valide', 'utilise', 'expire'];
        
        // Generate appropriate labels based on period
        if (period === 'semaine') {
            labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        } else if (period === 'mois') {
            labels = Array.from({length: 30}, (_, i) => i + 1); // 1 to 30
        } else { // annee
            labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        }
        
        const mockData = [];
        
        labels.forEach(label => {
            const baseValue = 50 + Math.floor(Math.random() * 100);
            
            statuts.forEach(statut => {
                let value;
                switch(statut) {
                    case 'valide':
                        value = baseValue + Math.floor(Math.random() * 30);
                        break;
                    case 'utilise':
                        value = Math.floor(baseValue * 0.7 + Math.random() * 20);
                        break;
                    case 'expire':
                        value = Math.floor(baseValue * 0.3 + Math.random() * 10);
                        break;
                }
                
                mockData.push({
                    period: label.toString(),
                    count: value,
                    statut: statut
                });
            });
        });
        
        return mockData;
    }

    // Load status chart immediately after stats
    loadStatusChart();

    function loadStatusChart() {
        console.log('Loading status chart data');
        fetch(`${API_BASE_URL}/dashboard/demand/status`)
            .then(response => {
                console.log('Status chart response:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Status data received:', data);
                createStatusChart(data);
            })
            .catch(error => {
                console.error('Error loading status data:', error);
                // Use mock data as fallback
                const mockData = [
                    { label: 'valide', value: 742 },
                    { label: 'utilise', value: 299 },
                    { label: 'expire', value: 215 }
                ];
                console.log('Using mock status data:', mockData);
                createStatusChart(mockData);
            });
    }

    function createStatusChart(data) {
        const ctx = document.getElementById('status-chart');
        if (!ctx) {
            console.error('Status chart canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (window.statusChart) {
            window.statusChart.destroy();
        }

        // Prepare data
        const labels = data.map(item => formatStatusLabel(item.label));
        const values = data.map(item => item.value);
        const colors = {
            valide: '#4CAF50',  // Green
            utilise: '#2196F3',  // Blue
            expire: '#F44336'   // Red
        };

        // Create new chart
        window.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: data.map(item => colors[item.label] || '#999'),
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
                            font: {
                                size: 12
                            },
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '70%',
                animation: {
                    duration: 300 // Faster animations for better performance
                }
            }
        });

        // Update legend if needed
        updateStatusLegend(data);
    }

    function formatStatusLabel(status) {
        const labels = {
            valide: 'Validées',
            utilise: 'Utilisées',
            expire: 'Expirées'
        };
        return labels[status] || status;
    }

    function updateStatusLegend(data) {
        const legendContainer = document.getElementById('status-legend');
        if (!legendContainer) return;

        const total = data.reduce((sum, item) => sum + item.value, 0);
        
        legendContainer.innerHTML = data.map(item => `
            <div class="legend-item">
                <span class="legend-color" style="background-color: ${
                    item.label === 'valide' ? '#4CAF50' :
                    item.label === 'utilise' ? '#2196F3' : '#F44336'
                }"></span>
                <span class="legend-label">${formatStatusLabel(item.label)}</span>
                <span class="legend-value">${item.value}</span>
                <span class="legend-percentage">${((item.value/total)*100).toFixed(1)}%</span>
            </div>
        `).join('');
    }

    function updateStatCards(data) {
        console.log('Updating stat cards with data:', data);

        try {
            statElements.totalDemands.textContent = formatNumber(data.total || 0);
            statElements.activeDemands.textContent = formatNumber(data.actives || 0);
            statElements.expiredDemands.textContent = formatNumber(data.expirees || 0);
            statElements.usedDemands.textContent = formatNumber(data.utilisees || 0);
            
            console.log('Stat cards updated successfully');
        } catch (error) {
            console.error('Error updating stat cards:', error);
            showNotification('Error updating statistics display', 'error');
        }
    }

    // Add top performers table functionality
    function loadTopPerformers() {
        console.log('Loading top performers data');
        
        // Build the API URL with parameters
        let url = `${API_BASE_URL}/dashboard/demand/top-performers`;
        const params = getFilterParams();
        
        if (performerType) {
            params.type = performerType.value;
        }
        
        if (performanceMetric) {
            params.metric = performanceMetric.value;
        }
        
        const queryString = Object.keys(params)
            .filter(key => params[key] !== null && params[key] !== undefined)
            .map(key => `${key}=${params[key]}`)
            .join('&');
            
        if (queryString) {
            url += `?${queryString}`;
        }
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Top performers data received:', data);
                updateTopPerformersTable(data);
            })
            .catch(error => {
                console.error('Error loading top performers:', error);
                
                // Use mock data as fallback
                const mockData = generateMockPerformersData();
                console.log('Using mock performers data:', mockData);
                updateTopPerformersTable(mockData);
            });
    }

    function updateTopPerformersTable(data) {
        const tableBody = document.getElementById('top-performers-table')?.querySelector('tbody');
        
        if (!tableBody) {
            console.error('Top performers table body not found');
            return;
        }
        
        tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="5" class="empty-state">Aucune donnée disponible pour cette période</td>`;
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // Calculate the total for percentage calculation
        const total = data.reduce((sum, item) => sum + item.count, 0);
        
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            const percentage = ((item.count / total) * 100).toFixed(1);
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.center || '-'}</td>
                <td>${formatNumber(item.count)}</td>
                <td>${percentage}%</td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    function generateMockPerformersData() {
        const names = ['Centre Casablanca', 'Centre Rabat', 'Centre Marrakech', 'Centre Agadir', 'Centre Tanger'];
        const mockData = [];
        
        for (let i = 0; i < 5; i++) {
            mockData.push({
                name: names[i],
                center: null,
                count: Math.floor(Math.random() * 500) + 100
            });
        }
        
        return mockData;
    }

    // Add anomalies check functionality
    function loadAnomaliesCheck() {
        console.log('Loading anomalies check data');
        
        fetch(`${API_BASE_URL}/dashboard/demand/anomalies`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Anomalies data received:', data);
                updateAnomalyCheckList(data);
                updateAnomaliesTable(data);
            })
            .catch(error => {
                console.error('Error loading anomalies:', error);
                
                // Use mock data as fallback
                const mockData = generateMockAnomaliesData();
                console.log('Using mock anomalies data:', mockData);
                updateAnomalyCheckList(mockData);
                updateAnomaliesTable(mockData);
            });
    }

    function updateAnomalyCheckList(data) {
        const listContainer = document.getElementById('anomaly-check-list');
        
        if (!listContainer) {
            console.error('Anomaly check list container not found');
            return;
        }
        
        listContainer.innerHTML = '';
        
        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">Aucune anomalie détectée</div>';
            return;
        }
        
        // Display only the first 5 anomalies in the check list
        const limitedData = data.slice(0, 5);
        
        limitedData.forEach(anomaly => {
            const item = document.createElement('div');
            item.className = `anomaly-item ${getSeverityClass(anomaly.severity)}`;
            
            item.innerHTML = `
                <p><strong>${anomaly.type}</strong> - ${anomaly.description}</p>
                <p>Entité: ${anomaly.entity || 'N/A'} - Détectée le: ${formatDate(anomaly.date)}</p>
                <button class="action-btn solve-btn" data-id="${anomaly.id}">Résoudre</button>
            `;
            
            listContainer.appendChild(item);
        });
        
        // Add event listeners to solve buttons
        const solveButtons = listContainer.querySelectorAll('.solve-btn');
        solveButtons.forEach(button => {
            button.addEventListener('click', function() {
                const anomalyId = this.getAttribute('data-id');
                openAnomalyModal(anomalyId);
            });
        });
    }

    function updateAnomaliesTable(data) {
        const tableBody = document.getElementById('anomalies-table')?.querySelector('tbody');
        
        if (!tableBody) {
            console.error('Anomalies table body not found');
            return;
        }
        
        tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="8" class="empty-state">Aucune anomalie trouvée pour cette période</td>`;
            tableBody.appendChild(emptyRow);
            return;
        }
        
        data.forEach(anomaly => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${anomaly.id}</td>
                <td>${formatDate(anomaly.date)}</td>
                <td>${anomaly.type}</td>
                <td>${anomaly.description}</td>
                <td><span class="severity-badge ${getSeverityClass(anomaly.severity)}">${formatSeverity(anomaly.severity)}</span></td>
                <td>${anomaly.entity || 'N/A'}</td>
                <td><span class="status-badge status-${anomaly.status}">${formatStatus(anomaly.status)}</span></td>
                <td>
                    ${anomaly.status === 'pending' ?
                        `<button class="action-btn solve-btn" data-id="${anomaly.id}">Résoudre</button>` :
                        `<button class="action-btn view-btn" data-id="${anomaly.id}">Voir détails</button>`
                    }
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        const actionButtons = tableBody.querySelectorAll('.action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', function() {
                const anomalyId = this.getAttribute('data-id');
                if (this.classList.contains('solve-btn')) {
                    openAnomalyModal(anomalyId);
                } else {
                    // View details functionality can be added here
                    console.log('View details for anomaly ID:', anomalyId);
                }
            });
        });
    }

    function openAnomalyModal(anomalyId) {
        console.log('Opening anomaly modal for ID:', anomalyId);
        if (modal) {
            document.getElementById('anomaly-id').value = anomalyId;
            modal.style.display = 'flex';
        }
    }

    function generateMockAnomaliesData() {
        const types = ['Demande Expirée', 'Demande Non Utilisée', 'Doublon Détecté', 'Demande Suspecte'];
        const descriptions = [
            'Plusieurs demandes non utilisées détectées',
            'Demande expirée sans annulation',
            'Doublon de demande pour le même véhicule',
            'Fréquence de demande anormale'
        ];
        const entities = ['Centre Casablanca', 'Centre Rabat', 'Centre Marrakech', 'Centre Agadir'];
        const severities = ['high', 'medium', 'low'];
        const statuses = ['pending', 'resolved'];
        
        const mockData = [];
        
        for (let i = 0; i < 8; i++) {
            const typeIndex = Math.floor(Math.random() * types.length);
            mockData.push({
                id: 1000 + i,
                date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
                type: types[typeIndex],
                description: descriptions[typeIndex],
                severity: severities[Math.floor(Math.random() * severities.length)],
                entity: entities[Math.floor(Math.random() * entities.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)]
            });
        }
        
        return mockData;
    }

    // Helper functions for formatting
    function getSeverityClass(severity) {
        switch (severity) {
            case 'high': return 'high';
            case 'medium': return 'medium';
            case 'low': return 'low';
            default: return '';
        }
    }
    
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('fr-FR');
    }
    
    function formatSeverity(severity) {
        const labels = {
            high: 'Élevée',
            medium: 'Moyenne',
            low: 'Faible'
        };
        return labels[severity] || severity;
    }
    
    function formatStatus(status) {
        const labels = {
            pending: 'En attente',
            resolved: 'Résolu'
        };
        return labels[status] || status;
    }
    
    function getFilterParams() {
        const params = {};
        
        if (periodFilter) {
            params.period = periodFilter.value;
            
            if (periodFilter.value === 'personnalise') {
                params.startDate = startDateInput.value;
                params.endDate = endDateInput.value;
            }
        }
        
        if (entityFilter) {
            params.entity = entityFilter.value;
        }
        
        if (selectedCenterId) {
            params.centerId = selectedCenterId;
        }
        
        return params;
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function showNotification(message, type) {
        console.log('Notification:', { message, type });
        const notifContainer = document.querySelector('.notification-container');
        
        if (!notifContainer) {
            console.error('Notification container not found');
            return;
        }

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        
        notifContainer.appendChild(notif);
        
        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => notifContainer.removeChild(notif), 300);
        }, 3000);
    }
    
    // Modal functionality for resolving anomalies
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    if (solveAnomalyForm) {
        solveAnomalyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const anomalyId = document.getElementById('anomaly-id').value;
            const solution = document.getElementById('solution-description').value;
            
            console.log('Resolving anomaly:', { anomalyId, solution });
            
            fetch(`${API_BASE_URL}/dashboard/demand/anomalies/${anomalyId}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ solution }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Anomaly resolved:', data);
                showNotification('Anomalie résolue avec succès', 'success');
                modal.style.display = 'none';
                loadAnomaliesCheck(); // Reload anomalies data
            })
            .catch(error => {
                console.error('Error resolving anomaly:', error);
                showNotification('Erreur lors de la résolution de l\'anomalie', 'error');
                
                // For demo purposes, simulate successful resolution
                setTimeout(() => {
                    modal.style.display = 'none';
                    showNotification('Anomalie résolue avec succès (simulation)', 'success');
                    loadAnomaliesCheck(); // Reload anomalies data
                }, 1000);
            });
        });
    }

    // Add event listeners for new filter elements
    const anomalySeverityFilter = document.getElementById('anomaly-severity-filter');
    const anomalyStatusFilter = document.getElementById('anomaly-status-filter');
    const trendPeriodSelectors = document.querySelectorAll('.trend-period-selector');
    
    if (anomalySeverityFilter) {
        anomalySeverityFilter.addEventListener('change', function() {
            filterAnomaliesTable();
        });
    }
    
    if (anomalyStatusFilter) {
        anomalyStatusFilter.addEventListener('change', function() {
            filterAnomaliesTable();
        });
    }
    
    // Add event listeners for trend period selectors
    if (trendPeriodSelectors.length > 0) {
        trendPeriodSelectors.forEach(selector => {
            selector.addEventListener('click', function() {
                // Remove active class from all selectors
                trendPeriodSelectors.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked selector
                this.classList.add('active');
                
                // Reload trend chart with new period
                const period = this.getAttribute('data-period');
                loadTrendsChart(period);
            });
        });
    }
    
    // Function to filter anomalies based on severity and status
    function filterAnomaliesTable() {
        const severity = anomalySeverityFilter ? anomalySeverityFilter.value : 'all';
        const status = anomalyStatusFilter ? anomalyStatusFilter.value : 'all';
        
        const tableRows = document.querySelectorAll('#anomalies-table tbody tr');
        
        tableRows.forEach(row => {
            const rowSeverity = row.querySelector('.severity-badge').classList.contains(severity);
            const rowStatus = row.querySelector('.status-badge').classList.contains('status-' + status);
            
            const showBySeverity = severity === 'all' || rowSeverity;
            const showByStatus = status === 'all' || rowStatus;
            
            if (showBySeverity && showByStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        
        // Check if no visible rows and show empty state message if needed
        let visibleRows = 0;
        tableRows.forEach(row => {
            if (row.style.display !== 'none') visibleRows++;
        });
        
        const tbody = document.querySelector('#anomalies-table tbody');
        const existingEmptyRow = document.querySelector('#anomalies-table .empty-filtered');
        
        if (visibleRows === 0 && !existingEmptyRow) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-filtered';
            emptyRow.innerHTML = `<td colspan="8" class="empty-state">Aucune anomalie ne correspond aux filtres sélectionnés</td>`;
            tbody.appendChild(emptyRow);
        } else if (visibleRows > 0 && existingEmptyRow) {
            existingEmptyRow.remove();
        }
    }
});