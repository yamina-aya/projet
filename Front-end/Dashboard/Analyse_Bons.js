document.addEventListener('DOMContentLoaded', function() {
   // Vérifier si l'utilisateur est authentifié
    // if (!isAuthenticated()) {
    //     window.location.href = '../login/login.html';
    //     return;
    // }

  // Debug authentication
  const token = localStorage.getItem('authToken');
  const user = Auth.getCurrentUser();
  console.log('Debug Auth:', {
      token: !!token,
      user: user,
      hasConsultation: user?.permissions?.includes('consultation')
  });

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
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const centerColumn = document.getElementById('center-column');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const customDateRange = document.getElementById('custom-date-range');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const applyDateBtn = document.getElementById('apply-date-btn');
    
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

    // Configuration de l'API
    const API_BASE_URL = 'http://localhost:3000/api';

    // Initialize based on user role and structure
    initializeUserInterface();

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

    // Initialize tabs
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.style.display = 'none');
            
            // Add active class to clicked button and show corresponding content
            const tabId = this.getAttribute('data-tab');
            this.classList.add('active');
            document.getElementById(tabId).style.display = 'block';

            // Load data specific to the selected tab
            if (tabId === 'tables') {
                loadTopPerformers();
            }
        });
    });

    // Show first tab by default
    if (tabButtons.length > 0) {
        const firstTabId = tabButtons[0].getAttribute('data-tab');
        tabButtons[0].classList.add('active');
        document.getElementById(firstTabId).style.display = 'block';
    }

    // Show/hide date range inputs based on period selection
    periodFilter.addEventListener('change', function() {
        if (this.value === 'personnalise') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
            loadDashboardData();
        }
    });

    // Apply custom date range
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

    // Center selection change event
    centerSelect.addEventListener('change', function() {
        selectedCenterId = this.value;
        loadDashboardData();
    });

    // Afficher/masquer la colonne Centre selon le type de performer
    performerType.addEventListener('change', function() {
        if (this.value === 'chauffeur' || this.value === 'admin' || this.value === 'vehicule') {
            centerColumn.style.display = '';
        } else {
            centerColumn.style.display = 'none';
        }
        loadTopPerformers();
    });

    // Function to initialize UI based on user role
    function initializeUserInterface() {
        const user = Auth.getCurrentUser();
        if (!user) {
            console.warn('User not authenticated or user data not available');
            return;
        }

        userRole = user.role;
        userStructure = user.structure;

        // Configure UI based on role
        if (userRole === 'Administrateur Centre' && userStructure?.centre) {
            // Centre admin - hide entity filter and center select, only show data for their center
            entityFilter.style.display = 'none';
            centerSelectContainer.style.display = 'none';
            selectedCenterId = userStructure.centre.id;
            
            // Set a visual indicator that we're looking at a specific center
            const centerIndicator = document.createElement('div');
            centerIndicator.className = 'center-indicator';
            centerIndicator.textContent = `Centre: ${userStructure.centre.nom}`;
            centerSelectContainer.parentNode.appendChild(centerIndicator);
            
            // Load dashboard with preselected center
            loadDashboardData();
        } 
        else if (userRole === 'Administrateur District' && userStructure?.district) {
            // District admin - show center select with centers from their district
            entityFilter.style.display = 'none';
            centerSelectContainer.style.display = 'block';
            
            // Load centers for this district
            loadCenters(null, userStructure.district.id);
        }
        else if (userRole === 'Administrateur Branche' && userStructure?.branche) {
            // Branch admin - show center select with all centers from branch
            entityFilter.style.display = 'none';
            centerSelectContainer.style.display = 'block';
            
            // Load centers for this branch
            loadCenters(userStructure.branche.id, null);
        }
        else {
            // Super admin or unknown role - show all options
            entityFilter.style.display = 'inline-block';
            centerSelectContainer.style.display = 'block';
            
            // Load all centers
            loadCenters();
        }
    }

    // Function to load centers based on user role
    function loadCenters(branchId = null, districtId = null) {
        let url = `${API_BASE_URL}/dashboard/bon/centers`;
        const params = {};
        
        if (branchId) params.branchId = branchId;
        if (districtId) params.districtId = districtId;
        
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
                    throw new Error('Erreur lors du chargement des centres');
                }
                return response.json();
            })
            .then(centers => {
                centersData = centers;
                
                // Clear existing options
                centerSelect.innerHTML = '';
                
                // Add placeholder if no centers
                if (centers.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'Aucun centre disponible';
                    centerSelect.appendChild(option);
                    showNotification('Aucun centre n\'est disponible pour votre profil', 'warning');
                    return;
                }
                
                // Add options for each center
                centers.forEach(center => {
                    const option = document.createElement('option');
                    option.value = center.id;
                    option.textContent = center.nom;
                    centerSelect.appendChild(option);
                });
                
                // Select first center by default
                selectedCenterId = centers[0].id;
                centerSelect.value = selectedCenterId;
                
                // Load dashboard data with selected center
                loadDashboardData();
            })
            .catch(error => {
                console.error('Erreur lors du chargement des centres:', error);
                showNotification('Erreur lors du chargement des centres', 'error');
            });
    }

    // Chargement initial des données
    loadDashboardData();
    
    // Écouteurs d'événements pour les filtres
    periodFilter.addEventListener('change', loadDashboardData);
    entityFilter.addEventListener('change', loadDashboardData);
    userTypeFilter.addEventListener('change', loadUserActivity);
    performerType.addEventListener('change', loadTopPerformers);
    performanceMetric.addEventListener('change', loadTopPerformers);

    // Gestion du modal
    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    solveAnomalyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        resolveAnomaly();
    });

    // Fonctions principales
    function loadDashboardData() {
        loadStats();
        loadConsumptionTrend();
        loadCouponTypes();
        loadUserActivity();
        loadAnomalyCheck();
        loadTopPerformers();
        loadAnomaliesTable();
    }

    function loadStats() {
        const params = getFilterParams();
        const queryString = Object.keys(params)
            .filter(key => params[key] !== null && params[key] !== undefined)
            .map(key => `${key}=${params[key]}`)
            .join('&');
            
        fetch(`${API_BASE_URL}/dashboard/bon/stats${queryString ? '?' + queryString : ''}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des statistiques');
                }
                return response.json();
            })
            .then(data => {
              
                document.getElementById('total-bons').textContent = data.total || 0;
                document.getElementById('bons-attribues').textContent = data.attribues || 0;
                document.getElementById('bons-retournes').textContent = data.retournes || 0;
                document.getElementById('bons-utilises').textContent = data.utilises || 0;
                document.getElementById('bons-disponibles').textContent = data.disponibles || 0;
                
                // Remove up/down indicators since they're not being properly calculated
                document.querySelectorAll('.card-change').forEach(elem => {
                    elem.style.display = 'none';
                });
            })
            .catch(error => {
                console.error('Erreur lors du chargement des statistiques:', error);
                showNotification('Erreur lors du chargement des statistiques', 'error');
            });
           
    }

    function loadConsumptionTrend() {
        const params = getFilterParams();
        const queryString = Object.keys(params)
            .filter(key => params[key] !== null && params[key] !== undefined)
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        fetch(`${API_BASE_URL}/dashboard/bon/trend${queryString ? '?' + queryString : ''}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des tendances');
                }
                return response.json();
            })
            .then(data => {
                // Préparer les données pour le graphique
                const labels = data.map(item => item.period);
                const values = data.map(item => item.count);
                const amounts = data.map(item => item.amount);
                
                // Créer le graphique
                const ctx = document.getElementById('consumption-trend-chart').getContext('2d');
                
                // Détruire le graphique s'il existe déjà
                if (window.consumptionChart) {
                    window.consumptionChart.destroy();
                }
                
                window.consumptionChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Nombre de bons',
                            data: values,
                            borderColor: '#4a90e2',
                            backgroundColor: 'rgba(74, 144, 226, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            yAxisID: 'y'
                        }, {
                            label: 'Montant (DA)',
                            data: amounts,
                            borderColor: '#48bb78',
                            backgroundColor: 'rgba(72, 187, 120, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            yAxisID: 'y1'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Nombre de bons'
                                }
                            },
                            y1: {
                                beginAtZero: true,
                                position: 'right',
                                title: {
                                    display: true,
                                    text: 'Montant (DA)'
                                },
                                grid: {
                                    drawOnChartArea: false
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Période'
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Erreur lors du chargement des tendances:', error);
                showNotification('Erreur lors du chargement des tendances', 'error');
            });
    }

    function loadCouponTypes() {
        const params = getFilterParams();
        const queryString = Object.keys(params)
            .filter(key => params[key] !== null && params[key] !== undefined)
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        fetch(`${API_BASE_URL}/dashboard/bon/types${queryString ? '?' + queryString : ''}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des types de bons');
                }
                return response.json();
            })
            .then(data => {
                // Préparer les données pour le graphique
                const labels = data.map(item => item.label);
                const values = data.map(item => item.value);
                
                // Créer le graphique
                const ctx = document.getElementById('coupon-types-chart').getContext('2d');
                
                // Détruire le graphique s'il existe déjà
                if (window.couponTypesChart) {
                    window.couponTypesChart.destroy();
                }
                
                window.couponTypesChart = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: [
                                'rgba(74, 144, 226, 0.7)',
                                'rgba(72, 187, 120, 0.7)',
                                'rgba(237, 137, 54, 0.7)'
                            ],
                            borderColor: [
                                'rgba(74, 144, 226, 1)',
                                'rgba(72, 187, 120, 1)',
                                'rgba(237, 137, 54, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${label}: ${percentage}%`;
                                    }
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Erreur lors du chargement des types de bons:', error);
                showNotification('Erreur lors du chargement des types de bons', 'error');
            });
    }

    function loadUserActivity() {
        const userType = userTypeFilter.value;
        const params = getFilterParams();
        params.userType = userType;

        // const params = getFilterParams();
        // params.userType = userTypeFilter.value;
        // params.period = periodFilter.value;

        
        const queryString = Object.keys(params)
            .filter(key => params[key] !== null && params[key] !== undefined)
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        fetch(`${API_BASE_URL}/dashboard/bon/activity?${queryString}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération de l\'activité des utilisateurs');
                }
                return response.json();
            })
            .then(data => {
                // Organiser les données pour un graphique empilé
                const labels = [...new Set(data.map(item => item.label))];
                const userNames = [...new Set(data.map(item => item.user_name))];
                const datasets = [];
                
                // Couleurs pour les différents utilisateurs
                const colors = [
                    { bg: 'rgba(74, 144, 226, 0.7)', border: 'rgba(74, 144, 226, 1)' },
                    { bg: 'rgba(72, 187, 120, 0.7)', border: 'rgba(72, 187, 120, 1)' },
                    { bg: 'rgba(237, 137, 54, 0.7)', border: 'rgba(237, 137, 54, 1)' },
                    { bg: 'rgba(160, 174, 192, 0.7)', border: 'rgba(160, 174, 192, 1)' },
                    { bg: 'rgba(213, 63, 140, 0.7)', border: 'rgba(213, 63, 140, 1)' },
                    { bg: 'rgba(104, 211, 145, 0.7)', border: 'rgba(104, 211, 145, 1)' }
                ];
                
                // Créer un dataset pour chaque utilisateur
                userNames.forEach((userName, index) => {
                    const userData = [];
                    
                    // Pour chaque label, trouver les données correspondantes pour cet utilisateur
                    labels.forEach(label => {
                        const item = data.find(d => d.label === label && d.user_name === userName);
                        userData.push(item ? item.count : 0);
                    });
                    
                    // Ajouter le dataset avec la couleur correspondante
                    const colorIndex = index % colors.length;
                    datasets.push({
                        label: userName,
                        data: userData,
                        backgroundColor: colors[colorIndex].bg,
                        borderColor: colors[colorIndex].border,
                        borderWidth: 1
                    });
                });
                
                // Créer le graphique
                const ctx = document.getElementById('user-activity-chart').getContext('2d');
                
                // Détruire le graphique s'il existe déjà
                if (window.userActivityChart) {
                    window.userActivityChart.destroy();
                }
                
                window.userActivityChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                stacked: false,
                                title: {
                                    display: true,
                                    text: getPeriodXAxisLabel(periodFilter.value)
                                }
                            },
                            y: {
                                stacked: false,
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Nombre de bons'
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: getUserActivityTitle(userType)
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Erreur lors du chargement de l\'activité des utilisateurs:', error);
                showNotification('Erreur lors du chargement de l\'activité des utilisateurs', 'error');
            });
    }




    function getUserActivityTitle(userType) {
        switch(userType) {
            case 'admin':
                return 'Bons attribués par administrateur';
            case 'chauffeur':
                return 'Bons consommés par chauffeur';
            case 'vehicule':
                return 'Bons consommés par véhicule';
            default:
                return 'Activité des utilisateurs';
        }
    }

    function loadAnomalyCheck() {
        fetch(`${API_BASE_URL}/dashboard/bon/anomalies/check`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des anomalies');
                }
                return response.json();
            })
            .then(anomalies => {
                // Mettre à jour le DOM
                const anomalyList = document.getElementById('anomaly-check-list');
                anomalyList.innerHTML = '';
                
                if (anomalies.length === 0) {
                    anomalyList.innerHTML = '<p>Aucune anomalie détectée.</p>';
                    return;
                }
                
                anomalies.forEach(anomaly => {
                    const severityClass = anomaly.severite === 'elevee' ? 'high' : 
                                        anomaly.severite === 'moyenne' ? 'medium' : 'low';
                    
                    const anomalyItem = document.createElement('div');
                    anomalyItem.className = `anomaly-item ${severityClass}`;
                    
                    let buttonHtml = '';
                    if (anomaly.statut === 'en_attente') {
                        buttonHtml = `<button class="action-btn solve-btn" data-id="${anomaly.id}">Résoudre</button>`;
                    }
                    
                    anomalyItem.innerHTML = `
                        <p><strong>Type:</strong> ${formatAnomalyType(anomaly.type_anomalie)}</p>
                        <p><strong>Problème:</strong> ${anomaly.description}</p>
                        <p><strong>Sévérité:</strong> ${formatSeverity(anomaly.severite)}</p>
                        <p><strong>Statut:</strong> ${formatStatus(anomaly.statut)}</p>
                        ${buttonHtml}
                    `;
                    
                    if (anomaly.solution) {
                        anomalyItem.innerHTML += `<p><strong>Solution:</strong> ${anomaly.solution}</p>`;
                    }
                    
                    anomalyList.appendChild(anomalyItem);
                });
                
                // Ajouter des écouteurs d'événements pour les boutons de résolution
                const solveButtons = document.querySelectorAll('.solve-btn');
                solveButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const anomalyId = this.getAttribute('data-id');
                        openAnomalyModal(anomalyId);
                    });
                });
            })
            .catch(error => {
                console.error('Erreur lors du chargement des anomalies:', error);
                showNotification('Erreur lors du chargement des anomalies', 'error');
            });
    }

    function loadTopPerformers() {
        const type = performerType.value;
        const metric = performanceMetric.value;
        const params = getFilterParams();
        params.type = type;
        params.metric = metric;
        
        const queryString = Object.keys(params)
            .filter(key => params[key] !== null && params[key] !== undefined)
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        fetch(`${API_BASE_URL}/dashboard/bon/performers?${queryString}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des top performers');
                }
                return response.json();
            })
            .then(performers => {
                // Mettre à jour le DOM
                const tableBody = document.querySelector('#top-performers-table tbody');
                tableBody.innerHTML = '';
                
                // Afficher/masquer la colonne Centre selon le type
                if (type === 'chauffeur' || type === 'admin' || type === 'vehicule') {
                    centerColumn.style.display = '';
                } else {
                    centerColumn.style.display = 'none';
                }
                
                performers.forEach((performer, index) => {
                    const row = document.createElement('tr');
                    
                    let centerCell = '';
                    if (type === 'chauffeur' || type === 'admin' || type === 'vehicule') {
                        centerCell = `<td>${performer.center || 'N/A'}</td>`;
                    }
                    
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${performer.name}</td>
                        ${centerCell}
                        <td>${performer.count}</td>
                        <td>${performer.percentage.toFixed(1)}%</td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Erreur lors du chargement des top performers:', error);
                showNotification('Erreur lors du chargement des top performers', 'error');
            });
    }

    function loadAnomaliesTable() {
        fetch(`${API_BASE_URL}/dashboard/bon/anomalies`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des anomalies');
                }
                return response.json();
            })
            .then(anomalies => {
                // Mettre à jour le DOM
                const tableBody = document.querySelector('#anomalies-table tbody');
                tableBody.innerHTML = '';
                
                anomalies.forEach(anomaly => {
                    const row = document.createElement('tr');
                    
                    let actionButton = '';
                    if (anomaly.statut === 'en_attente') {
                        actionButton = `<button class="action-btn solve-btn" data-id="${anomaly.id}">Résoudre</button>`;
                    } else {
                        actionButton = `<button class="action-btn view-btn" data-id="${anomaly.id}" data-solution="${anomaly.solution || ''}">Voir détails</button>`;
                    }
                    
                    row.innerHTML = `
                        <td>${anomaly.id}</td>
                        <td>${formatDate(anomaly.date_detection)}</td>
                        <td>${formatAnomalyType(anomaly.type_anomalie)}</td>
                        <td>${anomaly.description}</td>
                        <td><span class="severity-badge ${anomaly.severite}">${formatSeverity(anomaly.severite)}</span></td>
                        <td>${anomaly.entity}</td>
                        <td><span class="status-badge ${anomaly.statut === 'en_attente' ? 'status-pending' : 'status-resolved'}">${formatStatus(anomaly.statut)}</span></td>
                        <td>${actionButton}</td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Ajouter des écouteurs d'événements pour les boutons de résolution
                const solveButtons = document.querySelectorAll('#anomalies-table .solve-btn');
                solveButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const anomalyId = this.getAttribute('data-id');
                        openAnomalyModal(anomalyId);
                    });
                });
                
                // Ajouter des écouteurs d'événements pour les boutons de visualisation
                const viewButtons = document.querySelectorAll('#anomalies-table .view-btn');
                viewButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const solution = this.getAttribute('data-solution');
                        if (solution) {
                            alert(`Solution: ${solution}`);
                        } else {
                            alert('Aucune solution documentée pour cette anomalie.');
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Erreur lors du chargement des anomalies:', error);
                showNotification('Erreur lors du chargement des anomalies', 'error');
            });
    }

    function openAnomalyModal(anomalyId) {
        document.getElementById('anomaly-id').value = anomalyId;
        modal.style.display = 'block';
    }

    function resolveAnomaly() {
        const anomalyId = document.getElementById('anomaly-id').value;
        const solutionDescription = document.getElementById('solution-description').value;
        const adminId = getCurrentAdminId(); // Fonction pour obtenir l'ID admin actuel
        
        if (!solutionDescription.trim()) {
            showNotification('Veuillez entrer une description de la solution', 'error');
            return;
        }
        
        fetch(`${API_BASE_URL}/dashboard/bon/anomalies/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                anomalyId,
                solutionDescription,
                adminId
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de la résolution de l\'anomalie');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                modal.style.display = 'none';
                document.getElementById('solution-description').value = '';
                
                // Recharger les anomalies
                loadAnomalyCheck();
                loadAnomaliesTable();
                
                showNotification('Anomalie résolue avec succès!', 'success');
            } else {
                throw new Error(data.error || 'Échec de la résolution');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la résolution de l\'anomalie:', error);
            showNotification('Erreur lors de la résolution: ' + error.message, 'error');
        });
    }

    // Fonctions utilitaires
    function getFilterParams() {
        const params = {};
        const period = periodFilter.value;
        params.period = period;
        
        // Ajouter les dates personnalisées si nécessaire
        if (period === 'personnalise' && startDateInput.value && endDateInput.value) {
            params.startDate = startDateInput.value;
            params.endDate = endDateInput.value;
        }
        
        // Add center ID if selected
        if (selectedCenterId) {
            params.centerId = selectedCenterId;
        }
        // Fallback to structure filtering only if no center is selected
        else {
            // Ajouter les filtres de structure
            const entity = entityFilter.value;
            const user = Auth.getCurrentUser();
            
            if (entity === 'centre' && user?.structure?.centre?.id) {
                params.centerId = user.structure.centre.id;
            } else if (entity === 'district' && user?.structure?.district?.id) {
                params.districtId = user.structure.district.id;
            } else if (entity === 'branche' && user?.structure?.branche?.id) {
                params.branchId = user.structure.branche.id;
            }
        }
        
        return params;
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('fr-FR', options);
    }

    function formatAnomalyType(type) {
        switch (type) {
            case 'consommation_excessive':
                return 'Consommation excessive';
            case 'delai_utilisation':
                return 'Délai d\'utilisation dépassé';
            case 'retour_tardif':
                return 'Retour tardif';
            default:
                return type;
        }
    }

    function formatSeverity(severity) {
        switch (severity) {
            case 'elevee':
            case 'high':
                return 'Élevée';
            case 'moyenne':
            case 'medium':
                return 'Moyenne';
            case 'faible':
            case 'low':
                return 'Faible';
            default:
                return severity;
        }
    }

    function formatStatus(status) {
        switch (status) {
            case 'en_attente':
            case 'pending':
                return 'En attente';
            case 'resolue':
            case 'resolved':
                return 'Résolue';
            default:
                return status;
        }
    }

    function showNotification(message, type) {
        const notifContainer = document.querySelector('.notification-container');
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        
        notifContainer.appendChild(notif);
        
        // Faire disparaître après 3 secondes
        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => {
                notifContainer.removeChild(notif);
            }, 300);
        }, 3000);
    }

    function getPeriodXAxisLabel(period) {
        switch(period) {
            case 'semaine':
                return 'Jour de la semaine';
            case 'mois':
                return 'Jour du mois';
            case 'annee':
                return 'Mois de l\'année';
            case 'personnalise':
                return 'Période personnalisée';
            default:
                return 'Période';
        }
    }

    function getCurrentAdminId() {
        // Cette fonction devrait récupérer l'ID de l'admin connecté
        const user = Auth.getCurrentUser();
        return user?.id || 1; // Valeur par défaut pour le développement
    }

    function getAuthToken() {
        // Cette fonction devrait récupérer le token d'authentification
        return localStorage.getItem('authToken') || '';
    }
});
