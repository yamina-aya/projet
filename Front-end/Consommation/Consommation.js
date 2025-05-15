document.addEventListener('DOMContentLoaded', function() {
    // Éléments DOM
    const tabButtons = document.querySelectorAll('.tab-btn');
    const pages = document.querySelectorAll('.page');
    const consommationTypeSelect = document.getElementById('consommationType');
    const directSection = document.getElementById('directSection');
    const demandeSection = document.getElementById('demandeSection');
    const bonSection = document.getElementById('bonSection');
    const consommationForm = document.getElementById('consommationForm');
    const cancelConsommationBtn = document.getElementById('cancelConsommation');
    const modal = document.getElementById('consommationDetailsModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const searchConsommation = document.getElementById('searchConsommation');
    const typeFilter = document.getElementById('typeFilter');
    const startDateFilter = document.getElementById('startDate');
    const endDateFilter = document.getElementById('endDate');
    const resetFilterBtn = document.getElementById('resetFilter');
    
    // Nouveaux éléments pour la sélection des chauffeurs et véhicules
    const driverSelect = document.createElement('select');
    driverSelect.id = 'driverSelect';
    driverSelect.name = 'driverSelect';
    driverSelect.required = true;
    
    const vehicleSelect = document.createElement('select');
    vehicleSelect.id = 'vehicleSelect';
    vehicleSelect.name = 'vehicleSelect';
    vehicleSelect.required = true;
    
    // Variables globales
    let currentAdminId = null;
    let currentCenterId = null;
    let currentAdminName = '';
    let currentCenterName = '';
    let driversData = [];
    let selectedDriverId = null;
    let selectedVehicleId = null;
    
    // Initialisation
    init();
    
    // Fonctions
    function init() {
        // Get admin data from global currentUser object
        if (window.currentUser) {
            console.log('Initializing from window.currentUser:', window.currentUser);
            currentAdminId = window.currentUser.id;
            currentAdminName = window.currentUser.nom;
            
            if (window.currentUser.centre) {
                currentCenterId = window.currentUser.centre.id;
                currentCenterName = window.currentUser.centre.nom;
                console.log('Current center info set:', {
                    id: currentCenterId,
                    name: currentCenterName
                });
                
                // Mettre à jour les champs du formulaire
                document.getElementById('currentAdmin').value = currentAdminName || 'Admin non défini';
                document.getElementById('currentCenter').value = currentCenterName || 'Centre non défini';
                
                // Après avoir chargé les infos admin, charger les chauffeurs
                loadDriversGroupedByCenter();
            } else {
                console.warn('Erreur: Aucune information de centre trouvée dans currentUser');
                showNotification('Erreur: Aucune information de centre trouvée', 'warning');
                
                // Still update the admin field
                document.getElementById('currentAdmin').value = currentAdminName || 'Admin non défini';
                document.getElementById('currentCenter').value = 'Centre non défini';
            }
        } else {
            // Listen for the userDataReady event if currentUser isn't available yet
            document.addEventListener('userDataReady', function(e) {
                console.log('userDataReady event received:', e.detail);
                currentAdminId = e.detail.id;
                currentAdminName = e.detail.nom;
                
                if (e.detail.centre) {
                    currentCenterId = e.detail.centre.id;
                    currentCenterName = e.detail.centre.nom;
                    console.log('Current center info set from event:', {
                        id: currentCenterId,
                        name: currentCenterName
                    });
                    
                    // Mettre à jour les champs du formulaire
                    document.getElementById('currentAdmin').value = currentAdminName || 'Admin non défini';
                    document.getElementById('currentCenter').value = currentCenterName || 'Centre non défini';
                    
                    // Après avoir chargé les infos admin, charger les chauffeurs
                    loadDriversGroupedByCenter();
                } else {
                    console.warn('Erreur: Aucune information de centre trouvée dans l\'événement');
                    showNotification('Erreur: Aucune information de centre trouvée', 'warning');
                    
                    // Still update the admin field
                    document.getElementById('currentAdmin').value = currentAdminName || 'Admin non défini';
                    document.getElementById('currentCenter').value = 'Centre non défini';
                }
            }, { once: true });
            
            // Set defaults in the meantime
            document.getElementById('currentAdmin').value = 'Chargement...';
            document.getElementById('currentCenter').value = 'Chargement...';
        }
        
        // Définir la date du jour par défaut
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
        const localDate = new Date(now.getTime() - tzOffset);
        document.getElementById('consommationDate').value = localDate.toISOString().split('T')[0];
    
        // Charger les consommations
        loadConsommations();
        
        // Ajouter les champs de sélection de chauffeur et véhicule au formulaire
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.innerHTML = `
            <label for="driverSelect">Chauffeur:</label>
        `;
        formGroup.appendChild(driverSelect);
        
        const vehicleFormGroup = document.createElement('div');
        vehicleFormGroup.className = 'form-group';
        vehicleFormGroup.innerHTML = `
            <label for="vehicleSelect">Véhicule:</label>
        `;
        vehicleFormGroup.appendChild(vehicleSelect);
        
        // Insérer après la section de type de consommation
        const typeFormGroup = consommationTypeSelect.closest('.form-group');
        if (typeFormGroup) {
            typeFormGroup.parentNode.insertBefore(formGroup, typeFormGroup.nextSibling);
            formGroup.parentNode.insertBefore(vehicleFormGroup, formGroup.nextSibling);
        } else {
            console.warn('Type form group not found, cannot append driver and vehicle selects');
        }
        
        // Ajouter les écouteurs d'événements
        setupEventListeners();
    }
    
    function loadConsommations() {
        // Récupérer les filtres
        const searchTerm = searchConsommation.value;
        const typeValue = typeFilter.value;
        const startDate = startDateFilter.value;
        const endDate = endDateFilter.value;
        
        // Récupérer le token d'authentification
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            console.error('Erreur: Token d\'authentification non trouvé');
            showNotification('Erreur d\'authentification. Veuillez vous reconnecter.', 'error');
            return;
        }
        
        // Construire l'URL avec les paramètres de filtre
        let url = 'http://localhost:3000/api/consommations';
        const params = new URLSearchParams();
        
        if (searchTerm) params.append('search', searchTerm);
        if (typeValue) params.append('type', typeValue);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        // Ajouter les paramètres à l'URL s'il y en a
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (response.status === 401) {
                    console.error('Erreur d\'authentification (401)');
                    showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'error');
                    throw new Error('Non autorisé');
                }
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des consommations');
                }
                return response.json();
            })
            .then(data => {
                // Vérifier si les données sont dans un format attendu
                const consommations = Array.isArray(data) ? data : [];
                renderConsommations(consommations);
            })
            .catch(error => {
                console.error('Erreur:', error);
                showNotification(error.message, 'error');
            });
    }
    
    function renderConsommations(consommations) {
        const consommationBody = document.getElementById('consommationBody');
        consommationBody.innerHTML = '';
        
        if (consommations.length === 0) {
            consommationBody.innerHTML = `
                <div class="consommation-row">
                    <div class="consommation-cell" style="text-align: center; width: 100%;">
                        Aucune consommation trouvée
                    </div>
                </div>
            `;
            return;
        }
        
        consommations.forEach(consommation => {
            const date = new Date(consommation.date_consommation);
            const formattedDate = date.toLocaleDateString('fr-FR');
            
            // Always display quantity in liters
            const quantite = parseFloat(consommation.quantite).toFixed(2);
            
            const row = document.createElement('div');
            row.className = 'consommation-row';
            row.innerHTML = `
                <div class="consommation-cell">${consommation.id}</div>
                <div class="consommation-cell">${consommation.type_consommation}</div>
                <div class="consommation-cell">${formattedDate}</div>
                <div class="consommation-cell">${consommation.admin_nom}</div>
                <div class="consommation-cell">${consommation.centre_nom}</div>
                <div class="consommation-cell">${quantite} L</div>
                <div class="consommation-cell">
                    <button class="btn-action view" data-id="${consommation.id}" title="Voir les détails">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            `;
            
            // Add event listener for details button
            row.querySelector('.view').addEventListener('click', function() {
                showConsommationDetails(this.getAttribute('data-id'));
            });
            
            consommationBody.appendChild(row);
        });
    }

    function loadDriversGroupedByCenter() {
        // Récupérer le token d'authentification
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            console.error('Erreur: Token d\'authentification non trouvé');
            showNotification('Erreur d\'authentification. Veuillez vous reconnecter.', 'error');
            return;
        }
        
        fetch('http://localhost:3000/api/drivers/grouped-by-center', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (response.status === 401) {
                    console.error('Erreur d\'authentification (401)');
                    showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'error');
                    throw new Error('Non autorisé');
                }
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des chauffeurs');
                }
                return response.json();
            })
            .then(data => {
                driversData = data;
                renderDriversGroupedByCenter();
            })
            .catch(error => {
                console.error('Erreur:', error);
                showNotification(error.message, 'error');
            });
    }
    
    function renderDriversGroupedByCenter() {
        // Vider la liste actuelle
        driverSelect.innerHTML = '<option value="">Sélectionner un chauffeur...</option>';
        
        if (!driversData || driversData.length === 0) {
            driverSelect.innerHTML += '<option value="" disabled>Aucun chauffeur disponible</option>';
            return;
        }
        
        // Trier les centres par nom
        driversData.sort((a, b) => a.nom.localeCompare(b.nom));
        
        // Ajouter les chauffeurs groupés par centre
        driversData.forEach(center => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = center.nom;
            
            // Trier les chauffeurs par nom dans chaque centre
            if (center.chauffeurs && center.chauffeurs.length > 0) {
                center.chauffeurs.sort((a, b) => a.nom.localeCompare(b.nom));
                
                center.chauffeurs.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = driver.nom;
                    option.dataset.centerId = center.id;
                    optgroup.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = "";
                option.disabled = true;
                option.textContent = "Aucun chauffeur dans ce centre";
                optgroup.appendChild(option);
            }
            
            driverSelect.appendChild(optgroup);
        });
    }
    
    function loadVehiclesByDriver(driverId) {
        if (!driverId) {
            vehicleSelect.innerHTML = '<option value="">Sélectionner d\'abord un chauffeur...</option>';
            return;
        }
        
        // Récupérer le token d'authentification
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            console.error('Erreur: Token d\'authentification non trouvé');
            showNotification('Erreur d\'authentification. Veuillez vous reconnecter.', 'error');
            return;
        }
        
        fetch(`http://localhost:3000/api/vehicles/by-driver?driverId=${driverId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (response.status === 401) {
                    console.error('Erreur d\'authentification (401)');
                    showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'error');
                    throw new Error('Non autorisé');
                }
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des véhicules');
                }
                return response.json();
            })
            .then(data => {
                renderVehicles(data);
            })
            .catch(error => {
                console.error('Erreur:', error);
                showNotification(error.message, 'error');
            });
    }
    
    function renderVehicles(vehicles) {
        // Vider la liste actuelle
        vehicleSelect.innerHTML = '<option value="">Sélectionner un véhicule...</option>';
        
        if (!vehicles || vehicles.length === 0) {
            vehicleSelect.innerHTML += '<option value="" disabled>Aucun véhicule disponible</option>';
            return;
        }
        
        // Trier les véhicules par marque/modèle
        vehicles.sort((a, b) => `${a.marque} ${a.modele}`.localeCompare(`${b.marque} ${b.modele}`));
        
        // Ajouter les véhicules
        vehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.id;
            option.textContent = `${vehicle.marque} ${vehicle.modele} (${vehicle.immatriculation})`;
            vehicleSelect.appendChild(option);
        });
    }
    
    function loadDemandesForConsommation() {
        // Get today's date at midnight UTC
        const now = new Date();
        const utcToday = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        )).toISOString().split('T')[0];
    
        console.log('Debug - Client date:', {
            rawDate: now,
            utcToday: utcToday,
            timezone: 'UTC'
        });
    
        if (!selectedDriverId || !selectedVehicleId) {
            const demandesContainer = document.getElementById('demandesContainer');
            demandesContainer.innerHTML = '<p class="no-data">Veuillez sélectionner un chauffeur et un véhicule</p>';
            return;
        }

        const demandesContainer = document.getElementById('demandesContainer');
        demandesContainer.innerHTML = '<p class="loading">Chargement des demandes...</p>';

        // Récupérer le token d'authentification
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            console.error('Erreur: Token d\'authentification non trouvé');
            showNotification('Erreur d\'authentification. Veuillez vous reconnecter.', 'error');
            // Rediriger vers la page de connexion si nécessaire
            // window.location.href = '../login/login.html';
            return;
        }

        const url = `http://localhost:3000/api/demandes/available?centerId=${currentCenterId}&driverId=${selectedDriverId}&vehicleId=${selectedVehicleId}`;
        
        console.log('Debug - Fetching URL:', url);

        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(async response => {
                console.log('Debug - Response status:', response.status);
                
                if (response.status === 401) {
                    // Problème d'authentification
                    console.error('Erreur d\'authentification (401)');
                    showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'error');
                    // Rediriger vers la page de connexion
                    // window.location.href = '../login/login.html';
                    throw new Error('Non autorisé');
                }
                
                const text = await response.text();
                console.log('Debug - Raw response:', text);
                
                try {
                    const data = JSON.parse(text);
                    return data;
                } catch (e) {
                    console.error('Debug - JSON parse error:', e);
                    throw new Error('Invalid JSON response');
                }
            })
            .then(data => {
                console.log('Debug - Processed data:', {
                    count: data.length,
                    currentDate: utcToday,
                    data: data
                });
                const demandes = Array.isArray(data) ? data : [];
                renderDemandesForConsommation(demandes);
            })
            .catch(error => {
                console.error('Debug - Error:', error);
                demandesContainer.innerHTML = '<p class="error">Erreur lors du chargement des demandes</p>';
                showNotification('Erreur lors du chargement des demandes', 'error');
            });
    }

    function renderDemandesForConsommation(demandes) {
        const demandesContainer = document.getElementById('demandesContainer');
        demandesContainer.innerHTML = '';
        
        if (demandes.length === 0) {
            demandesContainer.innerHTML = '<p class="no-data">Aucune demande disponible pour consommation</p>';
            return;
        }
        
        demandes.forEach(demande => {
            // Formater la date
            const date = new Date(demande.date_creation);
            const formattedDate = date.toLocaleDateString('fr-FR');
            
            const demandeItem = document.createElement('div');
            demandeItem.className = 'demande-item';
            demandeItem.innerHTML = `
                <input type="radio" name="demandeId" value="${demande.id}" id="demande-${demande.id}">
                <div class="demande-details">
                    <div class="demande-id">Demande #${demande.id}</div>
                    <div class="demande-info">
                        <span>Chauffeur: ${demande.chauffeur_nom || 'Non spécifié'}</span> | 
                        <span>Véhicule: ${demande.vehicule_marque} ${demande.vehicule_modele} (${demande.vehicule_immatriculation})</span> | 
                        <span>Quantité: ${demande.quantite} L</span> | 
                        <span>Date: ${formattedDate}</span>
                    </div>
                </div>
            `;
            
            demandesContainer.appendChild(demandeItem);
        });
    }
    
    function loadBonsForConsommation() {
        // Vérifier si un chauffeur est sélectionné
        if (!selectedDriverId) {
            const bonsContainer = document.getElementById('bonsContainer');
            bonsContainer.innerHTML = '<p class="no-data">Veuillez sélectionner un chauffeur</p>';
            return;
        }
        
        // Récupérer le token d'authentification
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            console.error('Erreur: Token d\'authentification non trouvé');
            showNotification('Erreur d\'authentification. Veuillez vous reconnecter.', 'error');
            // Rediriger vers la page de connexion si nécessaire
            // window.location.href = '../login/login.html';
            return;
        }
        
        console.log('Debug - Chargement des bons:', {
            url: `http://localhost:3000/api/consommations/bons/available?centreId=${currentCenterId}&chauffeurId=${selectedDriverId}`,
            token: token ? `${token.substring(0, 10)}...` : 'null', // Only show first part of token for security
            currentCenterId,
            selectedDriverId
        });
        
        fetch(`http://localhost:3000/api/consommations/bons/available?centreId=${currentCenterId}&chauffeurId=${selectedDriverId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.status === 401) {
                // Problème d'authentification
                console.error('Erreur d\'authentification (401)');
                showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'error');
                // Rediriger vers la page de connexion
                // window.location.href = '../login/login.html';
                throw new Error('Non autorisé');
            }
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des bons');
            }
            return response.json();
        })
        .then(data => {
            console.log('Bons disponibles reçus:', data);
            // Vérifier si les données sont dans un format attendu
            const bons = Array.isArray(data) ? data : [];
            renderBonsForConsommation(bons);
        })
        .catch(error => {
            console.error('Erreur:', error);
            const bonsContainer = document.getElementById('bonsContainer');
            bonsContainer.innerHTML = '<p class="error">Erreur lors du chargement des bons</p>';
            showNotification(error.message, 'error');
        });
    }
    
    function renderBonsForConsommation(bons) {
        const bonsContainer = document.getElementById('bonsContainer');
        bonsContainer.innerHTML = '';
        
        if (bons.length === 0) {
            bonsContainer.innerHTML = '<p class="no-data">Aucun bon disponible pour consommation</p>';
            return;
        }
        
        bons.forEach(bon => {
            // Formater la date
            const date = new Date(bon.date_attribution);
            const formattedDate = date.toLocaleDateString('fr-FR');
            
            const bonItem = document.createElement('div');
            bonItem.className = 'bon-item';
            bonItem.innerHTML = `
                <input type="radio" name="bonId" value="${bon.id_bon}" id="bon-${bon.id_bon}">
                <div class="bon-details">
                    <div class="bon-id">Bon #${bon.id_bon}</div>
                    <div class="bon-info">
                        <span>Type: ${bon.type_bon}</span> | 
                        <span>Chauffeur: ${bon.chauffeur_nom}</span> | 
                        <span>Date d'attribution: ${formattedDate}</span>
                    </div>
                </div>
            `;
            
            bonsContainer.appendChild(bonItem);
        });
    }
    
    function createConsommation(formData) {
        // Récupérer le token d'authentification
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            console.error('Erreur: Token d\'authentification non trouvé');
            showNotification('Erreur d\'authentification. Veuillez vous reconnecter.', 'error');
            return;
        }
        
        fetch('http://localhost:3000/api/consommations/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (response.status === 401) {
                console.error('Erreur d\'authentification (401)');
                showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'error');
                throw new Error('Non autorisé');
            }
            if (!response.ok) {
                throw new Error('Erreur lors de la création de la consommation');
            }
            return response.json();
        })
        .then(data => {
            showNotification('Consommation créée avec succès', 'success');
            resetForm();
            switchTab('suivi');
            loadConsommations();
        })
        .catch(error => {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        });
    }
    
    function resetForm() {
        consommationForm.reset();
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localDate = new Date(now.getTime() - tzOffset);
        document.getElementById('consommationDate').value = localDate.toISOString().split('T')[0];
        document.getElementById('currentAdmin').value = currentAdminName;
        document.getElementById('currentCenter').value = currentCenterName;
        hideAllConsommationSections();
        
        // Réinitialiser les sélections
        selectedDriverId = null;
        selectedVehicleId = null;
        
        // Recharger les chauffeurs
        loadDriversGroupedByCenter();
        
        // Réinitialiser la liste des véhicules
        vehicleSelect.innerHTML = '<option value="">Sélectionner d\'abord un chauffeur...</option>';
    }
    
    function setupEventListeners() {
        // Onglets
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                switchTab(tabName);
            });
        });
        
        // Type de consommation
        consommationTypeSelect.addEventListener('change', function() {
            const selectedType = this.value;
            hideAllConsommationSections();
            
            if (selectedType === 'direct') {
                directSection.style.display = 'block';
            } else if (selectedType === 'demande') {
                demandeSection.style.display = 'block';
                loadDemandesForConsommation();
            } else if (selectedType === 'bon') {
                bonSection.style.display = 'block';
                loadBonsForConsommation();
            }
        });
        
        // Sélection du chauffeur
        driverSelect.addEventListener('change', function() {
            selectedDriverId = this.value;
            
            if (selectedDriverId) {
                loadVehiclesByDriver(selectedDriverId);
                
                // Recharger les bons si la section est visible
                if (bonSection.style.display === 'block') {
                    loadBonsForConsommation();
                }
            } else {
                // Réinitialiser la liste des véhicules
                vehicleSelect.innerHTML = '<option value="">Sélectionner d\'abord un chauffeur...</option>';
                selectedVehicleId = null;
            }
        });
        
        // Sélection du véhicule
        vehicleSelect.addEventListener('change', function() {
            selectedVehicleId = this.value;
            
            // Recharger les demandes si la section est visible
            if (demandeSection.style.display === 'block') {
                loadDemandesForConsommation();
            }
        });
        
        // Soumission du formulaire
        consommationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const typeConsommation = consommationTypeSelect.value;
            
            if (!typeConsommation) {
                showNotification('Veuillez sélectionner un type de consommation', 'error');
                return;
            }
            
            if (!selectedDriverId) {
                showNotification('Veuillez sélectionner un chauffeur', 'error');
                return;
            }
            
            const formData = {
                id_admin: currentAdminId,
                id_centre: currentCenterId,
                date_consommation: document.getElementById('consommationDate').value,
                type_consommation: typeConsommation,
                id_chauffeur: selectedDriverId,
                id_vehicule: selectedVehicleId
            };
            
            if (typeConsommation === 'direct') {
                const quantite = document.getElementById('directQuantity').value;
                if (!quantite || quantite <= 0) {
                    showNotification('Veuillez entrer une quantité valide', 'error');
                    return;
                }
                formData.quantite = parseFloat(quantite);
            } else if (typeConsommation === 'demande') {
                const selectedDemande = document.querySelector('input[name="demandeId"]:checked');
                if (!selectedDemande) {
                    showNotification('Veuillez sélectionner une demande', 'error');
                    return;
                }
                formData.reference_id = selectedDemande.value;
            } else if (typeConsommation === 'bon') {
                const selectedBon = document.querySelector('input[name="bonId"]:checked');
                if (!selectedBon) {
                    showNotification('Veuillez sélectionner un bon', 'error');
                    return;
                }
                formData.reference_id = selectedBon.value;
            }
            
            createConsommation(formData);
        });
        
        // Annulation du formulaire
        cancelConsommationBtn.addEventListener('click', function() {
            resetForm();
            switchTab('suivi');
        });
        
        // Filtres
        searchConsommation.addEventListener('input', debounce(function() {
            loadConsommations();
        }, 300));
        
        typeFilter.addEventListener('change', function() {
            loadConsommations();
        });
        
        startDateFilter.addEventListener('change', function() {
            if (endDateFilter.value && new Date(this.value) > new Date(endDateFilter.value)) {
                showNotification('La date de début doit être antérieure à la date de fin', 'warning');
                this.value = '';
                return;
            }
            loadConsommations();
        });
        
        endDateFilter.addEventListener('change', function() {
            if (startDateFilter.value && new Date(startDateFilter.value) > new Date(this.value)) {
                showNotification('La date de fin doit être postérieure à la date de début', 'warning');
                this.value = '';
                return;
            }
            loadConsommations();
        });
        
        resetFilterBtn.addEventListener('click', function() {
            resetFilters();
            loadConsommations();
        });
        
        // Modal
        closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    function switchTab(tabName) {
        // Mettre à jour les boutons d'onglet
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Afficher la page correspondante
        pages.forEach(page => {
            if (page.id === `${tabName}Page`) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });
        
        // Actions spécifiques selon l'onglet
        if (tabName === 'suivi') {
            loadConsommations();
        } else if (tabName === 'creation') {
            resetForm();
        }
    }
    
    function hideAllConsommationSections() {
        directSection.style.display = 'none';
        demandeSection.style.display = 'none';
        bonSection.style.display = 'none';
    }
    
    function openModal() {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    function resetFilters() {
        searchConsommation.value = '';
        typeFilter.value = '';
        startDateFilter.value = '';
        endDateFilter.value = '';
        loadConsommations();
    }
    
    function showNotification(message, type = 'info') {
        const notificationContainer = document.querySelector('.notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon} notification-icon"></i>
            <div class="notification-content">${message}</div>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Supprimer la notification après 5 secondes
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    
    // Fonction utilitaire pour limiter les appels de fonction
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    function showConsommationDetails(consommationId) {
        // Récupérer le token d'authentification
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            console.error('Erreur: Token d\'authentification non trouvé');
            showNotification('Erreur d\'authentification. Veuillez vous reconnecter.', 'error');
            return;
        }
        
        fetch(`http://localhost:3000/api/consommations/${consommationId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (response.status === 401) {
                    console.error('Erreur d\'authentification (401)');
                    showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'error');
                    throw new Error('Non autorisé');
                }
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération des détails de la consommation');
                }
                return response.json();
            })
            .then(data => {
                renderConsommationDetails(data);
                openModal();
            })
            .catch(error => {
                console.error('Erreur:', error);
                showNotification(error.message, 'error');
            });
    }
    
    function renderConsommationDetails(consommation) {
        const generalInfoSection = document.getElementById('consommationGeneralInfo');
        const specificInfoSection = document.getElementById('consommationSpecificInfo');
        
        // Formater la date
        const date = new Date(consommation.date_consommation);
        const formattedDate = date.toLocaleDateString('fr-FR');
        
        // Traduire le type de consommation
        let typeConsommation = '';
        switch(consommation.type_consommation) {
            case 'direct': typeConsommation = 'Direct'; break;
            case 'demande': typeConsommation = 'Demande'; break;
            case 'bon': typeConsommation = 'Bon'; break;
            default: typeConsommation = consommation.type_consommation;
        }
        
        // Informations générales
        generalInfoSection.innerHTML = `
            <div class="details-row">
                <div class="details-label">ID:</div>
                <div class="details-value">${consommation.id}</div>
            </div>
            <div class="details-row">
                <div class="details-label">Type:</div>
                <div class="details-value">${typeConsommation}</div>
            </div>
            <div class="details-row">
                <div class="details-label">Date:</div>
                <div class="details-value">${formattedDate}</div>
            </div>
            <div class="details-row">
                <div class="details-label">Administrateur:</div>
                <div class="details-value">${consommation.admin_nom}</div>
            </div>
            <div class="details-row">
                <div class="details-label">Centre:</div>
                <div class="details-value">${consommation.centre_nom}</div>
            </div>
        `;
        
        // Informations spécifiques selon le type
        specificInfoSection.innerHTML = '';
        
        if (consommation.type_consommation === 'direct') {
            specificInfoSection.innerHTML = `
                <div class="details-row">
                    <div class="details-label">Quantité:</div>
                    <div class="details-value">${consommation.quantite} Litres</div>
                </div>
            `;
        } else if (consommation.type_consommation === 'demande') {
            specificInfoSection.innerHTML = `
                <div class="details-row">
                    <div class="details-label">ID Demande:</div>
                    <div class="details-value">${consommation.reference_id || 'N/A'}</div>
                </div>
                <div class="details-row">
                    <div class="details-label">Chauffeur:</div>
                    <div class="details-value">${consommation.chauffeur_nom || 'Non spécifié'}</div>
                </div>
                <div class="details-row">
                    <div class="details-label">Véhicule:</div>
                    <div class="details-value">${consommation.vehicule_immatriculation || 'Non spécifié'}</div>
                </div>
                <div class="details-row">
                    <div class="details-label">Quantité:</div>
                    <div class="details-value">${consommation.quantite || 'N/A'} Litres</div>
                </div>
            `;
        } else if (consommation.type_consommation === 'bon') {
            specificInfoSection.innerHTML = `
                <div class="details-row">
                    <div class="details-label">ID Bon:</div>
                    <div class="details-value">${consommation.reference_id || 'N/A'}</div>
                </div>
                <div class="details-row">
                    <div class="details-label">Type de Bon:</div>
                    <div class="details-value">${consommation.type_bon || 'Non spécifié'}</div>
                </div>
                <div class="details-row">
                    <div class="details-label">Chauffeur:</div>
                    <div class="details-value">${consommation.chauffeur_nom || 'Non spécifié'}</div>
                </div>
            `;
        }
    }
});


