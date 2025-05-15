document.addEventListener('DOMContentLoaded', function() {
    // // Check for Auth object first
    // if (typeof window.Auth === 'undefined') {
    //     console.error('Auth object is not defined. Make sure auth.js is loaded before this script.');
    // }
    
    // // Shorthand reference to the Auth object
    // const Auth = window.Auth;
    
    // Diagnostic function to check permissions
    function checkPermissions() {
        console.log('--- Permission Diagnostic ---');
        const user = Auth.getCurrentUser();
        
        if (!user) {
            console.error('No user data available from Auth.getCurrentUser()');
            return;
        }
        
        console.log('User ID:', user.id);
        console.log('User Name:', user.nom);
        console.log('User Permissions:', user.permissions);
        
        // Check specific permissions
        const permissions = [
            'creer_admin',
            'attribuer_bons',
            'envoyer_demande',
            'remplir_formulaire_consommation',
            'consultation'
        ];
        
        permissions.forEach(permission => {
            const hasPermission = Auth.hasPermission(permission);
            console.log(`Has ${permission}: ${hasPermission}`);
        });
        
        console.log('------------------------');
    }
    
    // Run diagnostic
    checkPermissions();
    
    // Éléments du DOM
    const tabBtns = document.querySelectorAll('.tab-btn');
    const createDemandBtn = document.querySelector('.create-demand-btn');
    const backBtn = document.querySelector('.back-btn');
    const createDemandForm = document.getElementById('createDemandForm');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const demandsList = document.getElementById('demandsList');
    const demandsListPage = document.getElementById('demandsListPage');
    const createDemandPage = document.getElementById('createDemandPage');
    const modal = document.getElementById('demandDetailsModal');
    const closeModal = document.querySelector('.close-modal');
    const editModal = document.getElementById('editDemandModal');
    const editForm = document.getElementById('editDemandForm');
    const resetFilterBtn = document.getElementById('resetFilter');

    // Variables globales
    let currentAdmin = null;
    let currentCenter = null;
    let currentTab = 'received';
    let currentDemandId = null;

    // Fonction pour afficher les notifications
    function showNotification(message, type = 'success') {
        const container = document.querySelector('.notification-container');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Gestionnaire d'onglets
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            loadDemands();
        });
    });

    // Navigation entre les pages
    createDemandBtn.addEventListener('click', () => {
        demandsListPage.style.display = 'none';
        createDemandPage.style.display = 'block';
        initializeCreateForm();
    });

    backBtn.addEventListener('click', () => {
        createDemandPage.style.display = 'none';
        demandsListPage.style.display = 'block';
        createDemandForm.reset();
    });

    // Gestionnaires de filtres
    [searchInput, statusFilter, startDate, endDate].forEach(filter => {
        filter.addEventListener('change', loadDemands);
    });

    resetFilterBtn.addEventListener('click', function() {
        resetFilters();
        loadDemands();
    });

    function resetFilters() {
        searchInput.value = '';
        statusFilter.value = '';
        startDate.value = '';
        endDate.value = '';
        loadDemands();
    }
    

    // Close modal when clicking the close button or outside the modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Close edit modal
    editModal.querySelector('.close-modal').addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    editModal.querySelector('.btn-cancel').addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });

    // Function to show demand details in modal
    function showDemandDetails(demand) {
        const generalInfo = document.getElementById('generalInfo');
        const centerInfo = document.getElementById('centerInfo');
        const transportInfo = document.getElementById('transportInfo');
        const adminInfo = document.getElementById('adminInfo');

        // General Information
        generalInfo.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">ID Demande:</span>
                <span class="detail-value">#${demand.id}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Quantité:</span>
                <span class="detail-value">${demand.quantite}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date Création:</span>
                <span class="detail-value">${new Date(demand.date_creation).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date Consommation:</span>
                <span class="detail-value">${new Date(demand.date_consommation).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Statut:</span>
                <span class="detail-value status ${demand.statut}">${demand.statut}</span>
            </div>
        `;

        // Center Information
        centerInfo.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Centre Actuel:</span>
                <span class="detail-value">${demand.actual_center}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Centre Récepteur:</span>
                <span class="detail-value">${demand.receiving_center}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">District:</span>
                <span class="detail-value">${demand.district_nom || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Branche:</span>
                <span class="detail-value">${demand.branche_nom || 'N/A'}</span>
            </div>
        `;

        // Transport Information
        transportInfo.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Chauffeur:</span>
                <span class="detail-value">${demand.driver_name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Téléphone:</span>
                <span class="detail-value">${demand.driver_phone || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Véhicule:</span>
                <span class="detail-value">${demand.vehicle_name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Matricule:</span>
                <span class="detail-value">${demand.vehicle_matricule}</span>
            </div>
        `;

        // Admin Information
        adminInfo.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Administrateur:</span>
                <span class="detail-value">${demand.admin_name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Rôle:</span>
                <span class="detail-value">${demand.admin_role || 'N/A'}</span>
            </div>
        `;

        modal.style.display = 'block';
    }

    // Initialisation du formulaire de création
    async function initializeCreateForm() {
        try {
            // Try to get current user from Auth service
            const user = Auth.getCurrentUser();
            if (user) {
                console.log('User data from Auth.getCurrentUser():', user);
                currentAdmin = {
                    id: user.id,
                    nom: user.nom,
                    role: user.role
                };
                
                if (user.structure && user.structure.centre) {
                    currentCenter = user.structure.centre;
                    console.log('Current center set from Auth.getCurrentUser():', currentCenter);
                }
            } else {
                console.log('Waiting for userDataReady event...');
                // Create a Promise that resolves when userDataReady event fires
                await new Promise(resolve => {
                    document.addEventListener('userDataReady', function(e) {
                        console.log('userDataReady event received:', e.detail);
                        currentAdmin = {
                            id: e.detail.id,
                            nom: e.detail.nom,
                            role: e.detail.role
                        };
                        
                        if (e.detail.centre) {
                            currentCenter = e.detail.centre;
                            console.log('Current center set from event:', currentCenter);
                        }
                        resolve();
                    }, { once: true });
                    
                    // Set a timeout in case the event never fires
                    setTimeout(() => {
                        console.warn('Timeout waiting for userDataReady event');
                        resolve();
                    }, 2000);
                });
            }

            if (!currentAdmin || !currentAdmin.id) {
                console.error('Failed to get user data');
                showNotification('Erreur lors de la récupération des données utilisateur', 'error');
                return;
            }

            // Remplir les champs en lecture seule
            document.getElementById('currentCenter').value = currentCenter?.nom || 'Centre non défini';
            document.getElementById('currentAdmin').value = currentAdmin?.nom || 'Admin non défini';
            document.getElementById('creationDate').value = new Date().toLocaleDateString('fr-FR');

            // Charger les centres
            console.log('Fetching centers...');
            const centersRes = await fetch('http://localhost:3000/api/centers');
            if (!centersRes.ok) {
                const errorData = await centersRes.json();
                console.error('Centers error:', errorData);
                throw new Error('Erreur lors du chargement des centres');
            }
            const centersData = await centersRes.json();
            console.log('Centers data received:', centersData);
            if (!centersData || !centersData.data || !Array.isArray(centersData.data)) {
                throw new Error('Format de données des centres invalide');
            }
            populateSelect('receivingCenter', centersData.data);

            // Charger les chauffeurs du centre actuel
            console.log('Fetching drivers for center:', currentCenter?.id);
            if (!currentCenter || !currentCenter.id) {
                console.warn('No current center ID available for filtering drivers');
            }
            const driversRes = await fetch(`http://localhost:3000/api/drivers?centerId=${currentCenter?.id || ''}`);
            if (!driversRes.ok) {
                const errorData = await driversRes.json();
                console.error('Drivers error:', errorData);
                throw new Error('Erreur lors du chargement des chauffeurs');
            }
            const driversData = await driversRes.json();
            console.log('Drivers data received:', driversData);
            if (!driversData || !driversData.data || !Array.isArray(driversData.data)) {
                throw new Error('Format de données des chauffeurs invalide');
            }
            populateSelect('driver', driversData.data);

            // Charger les véhicules du centre actuel
            console.log('Fetching vehicles for center:', currentCenter?.id);
            if (!currentCenter || !currentCenter.id) {
                console.warn('No current center ID available for filtering vehicles');
            }
            const vehiclesRes = await fetch(`http://localhost:3000/api/vehicles?centerId=${currentCenter?.id || ''}`);
            if (!vehiclesRes.ok) {
                const errorData = await vehiclesRes.json();
                console.error('Vehicles error:', errorData);
                throw new Error('Erreur lors du chargement des véhicules');
            }
            const vehiclesData = await vehiclesRes.json();
            console.log('Vehicles data received:', vehiclesData);
            if (!vehiclesData || !vehiclesData.data || !Array.isArray(vehiclesData.data)) {
                throw new Error('Format de données des véhicules invalide');
            }
            populateSelect('vehicle', vehiclesData.data);

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            showNotification('Erreur lors du chargement des données', 'error');
        }
    }

    // Remplir les listes déroulantes
    function populateSelect(elementId, items) {
        if (!Array.isArray(items)) {
            console.error('Les données reçues ne sont pas un tableau:', items);
            return;
        }

        const select = document.getElementById(elementId);
        if (!select) {
            console.error(`Élément select avec l'id ${elementId} non trouvé`);
            return;
        }

        select.innerHTML = '<option value="">Sélectionner...</option>';
        
        items.forEach(item => {
            if (!item || !item.id || !item.nom) {
                console.error('Item invalide:', item);
                return;
            }

            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.nom;
            select.appendChild(option);
        });
    }

    // Charger les demandes
    async function loadDemands() {
        if (!currentAdmin || !currentAdmin.id) {
            console.warn('Admin information not available yet, trying to get it first');
            try {
                const user = Auth.getCurrentUser();
                if (user && user.id) {
                    currentAdmin = {
                        id: user.id,
                        nom: user.nom,
                        role: user.role
                    };
                    
                    if (user.structure && user.structure.centre) {
                        currentCenter = user.structure.centre;
                    }
                } else {
                    console.warn('Could not get user data, using default ID');
                }
            } catch (error) {
                console.error('Error getting user data:', error);
            }
        }

        const searchTerm = searchInput.value;
        const status = statusFilter.value;
        const start = startDate.value;
        const end = endDate.value;

        try {
            const queryParams = new URLSearchParams({
                type: currentTab,
                userId: currentAdmin?.id || '', // Don't use hardcoded ID
                ...(searchTerm && { search: searchTerm }),
                ...(status && { status }),
                ...(start && { startDate: start }),
                ...(end && { endDate: end })
            });

            console.log('Fetching demands with params:', queryParams.toString());

            const response = await fetch(`http://localhost:3000/api/demands?${queryParams}`);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server error details:', errorData);
                throw new Error(`Erreur lors de la récupération des demandes: ${errorData.error}`);
            }

            const responseData = await response.json();
            console.log('Received data:', responseData);
            
            if (!responseData || !responseData.data || !Array.isArray(responseData.data)) {
                console.error('Invalid data format received:', responseData);
                throw new Error('Format de données invalide');
            }

            renderDemands(responseData.data);
        } catch (error) {
            console.error('Erreur lors du chargement des demandes:', error);
            showNotification('Erreur lors du chargement des demandes', 'error');
        }
    }

    // Afficher les demandes
    function renderDemands(demands) {
        if (!Array.isArray(demands)) {
            console.error('Les données reçues ne sont pas un tableau:', demands);
            return;
        }

        const demandsBody = document.querySelector('.demands-body');
        demandsBody.innerHTML = '';

        demands.forEach(demand => {
            const row = document.createElement('div');
            row.className = 'demand-row';
            
            // Use the actual status value directly
            const statusClass = demand.statut || '';

            row.innerHTML = `
                <div class="demand-cell">#${demand.id}</div>
                <div class="demand-cell">${currentTab === 'sent' ? demand.receiving_center : demand.actual_center}</div>
                <div class="demand-cell">${demand.quantite}</div>
                <div class="demand-cell">${new Date(demand.date_creation).toLocaleDateString('fr-FR')}</div>
                <div class="demand-cell"><span class="status ${statusClass}">${demand.statut}</span></div>
                <div class="demand-cell">${demand.driver_name || 'N/A'}</div>
                <div class="demand-cell">${demand.vehicle_name || 'N/A'}</div>
                <div class="demand-cell">
                    <div class="action-buttons">
                        <button class="btn-icon btn-details" onclick="showDetails(${demand.id})" title="Voir les détails">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        ${demand.statut === 'valide' ? `
                            <button class="btn-icon btn-edit" onclick="editDemand(${demand.id})" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="deleteDemand(${demand.id})" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;

            demandsBody.appendChild(row);
        });
    }

    // Créer une nouvelle demande
    createDemandForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentAdmin || !currentAdmin.id) {
            showNotification('Information administrateur non disponible', 'error');
            return;
        }

        const formData = {
            centre_recepteur_id: document.getElementById('receivingCenter').value,
            chauffeur_id: document.getElementById('driver').value,
            vehicule_id: document.getElementById('vehicle').value,
            quantite: document.getElementById('quantity').value,
            date_consommation: document.getElementById('consumptionDate').value,
            admin_id: currentAdmin.id
        };

        try {
            const response = await fetch('http://localhost:3000/api/demand/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la création de la demande');
            }

            showNotification('Demande créée avec succès');
            createDemandPage.style.display = 'none';
            demandsListPage.style.display = 'block';
            createDemandForm.reset();
            loadDemands();
        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        }
    });

    // Mettre à jour le statut d'une demande
    window.updateDemandStatus = async (demandId, newStatus) => {
        try {
            const response = await fetch(`http://localhost:3000/api/demands/${demandId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ statut: newStatus })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour du statut');
            }

            showNotification('Statut mis à jour avec succès');
            loadDemands();
        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        }
    };

    // Supprimer une demande
    window.deleteDemand = async (demandId) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/demands/${demandId}/delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression de la demande');
            }

            showNotification('Demande supprimée avec succès');
            loadDemands();
        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        }
    };

    // Add showDetails function to window
    window.showDetails = async (demandId) => {
        try {
            const response = await fetch(`http://localhost:3000/api/demands/${demandId}`, {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des détails');
            }
            const demand = await response.json();
            showDemandDetails(demand);
        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        }
    };

    // Edit demand function
    window.editDemand = async (demandId) => {
        currentDemandId = demandId;
        try {
            const response = await fetch(`http://localhost:3000/api/demands/${demandId}`, {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des détails');
            }
            const demand = await response.json();
            
            // Load centers, drivers, and vehicles
            await Promise.all([
                loadCenters(),
                loadDrivers(),
                loadVehicles()
            ]);

            // Populate form with current values
            document.getElementById('editCurrentCenter').value = demand.actual_center;
            document.getElementById('editQuantity').value = demand.quantite;
            document.getElementById('editConsumptionDate').value = new Date(demand.date_consommation).toISOString().split('T')[0];
            
            // Set selected values for dropdowns
            setSelectValue('editReceivingCenter', demand.centre_recepteur_id);
            setSelectValue('editDriver', demand.chauffeur_id);
            setSelectValue('editVehicle', demand.vehicule_id);

            // Show edit modal
            editModal.style.display = 'block';
        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        }
    };

    // Helper function to set select value
    function setSelectValue(selectId, value) {
        const select = document.getElementById(selectId);
        if (select) {
            select.value = value;
        }
    }

    // Load data for edit form
    async function loadCenters() {
        const response = await fetch('http://localhost:3000/api/centers', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        const data = await response.json();
        populateSelect('editReceivingCenter', data.data);
    }

    async function loadDrivers() {
        console.log('Loading drivers for center:', currentCenter?.id);
        if (!currentCenter || !currentCenter.id) {
            console.warn('No current center ID available for filtering drivers in edit form');
        }
        const response = await fetch(`http://localhost:3000/api/drivers?centerId=${currentCenter?.id || ''}`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        const data = await response.json();
        populateSelect('editDriver', data.data);
    }

    async function loadVehicles() {
        console.log('Loading vehicles for center:', currentCenter?.id);
        if (!currentCenter || !currentCenter.id) {
            console.warn('No current center ID available for filtering vehicles in edit form');
        }
        const response = await fetch(`http://localhost:3000/api/vehicles?centerId=${currentCenter?.id || ''}`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        const data = await response.json();
        populateSelect('editVehicle', data.data);
    }

    // Handle edit form submission
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            centre_recepteur_id: document.getElementById('editReceivingCenter').value,
            chauffeur_id: document.getElementById('editDriver').value,
            vehicule_id: document.getElementById('editVehicle').value,
            quantite: document.getElementById('editQuantity').value,
            date_consommation: document.getElementById('editConsumptionDate').value
        };

        try {
            const response = await fetch(`http://localhost:3000/api/demands/${currentDemandId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la modification de la demande');
            }

            showNotification('Demande modifiée avec succès');
            editModal.style.display = 'none';
            loadDemands();
        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        }
    });

    // Initialisation
    async function initialize() {
        try {
            // Try to get user from Auth service directly
            const user = Auth.getCurrentUser();
            if (user && user.id) {
                console.log('User found from Auth.getCurrentUser():', user);
                currentAdmin = {
                    id: user.id,
                    nom: user.nom,
                    role: user.role
                };
                
                if (user.structure && user.structure.centre) {
                    currentCenter = user.structure.centre;
                }
                
                // Load demands with the admin data
                loadDemands();
            } else {
                // If Auth.getCurrentUser() fails, wait for userDataReady event
                console.log('No user data from Auth.getCurrentUser(), waiting for userDataReady event');
                document.addEventListener('userDataReady', function(e) {
                    console.log('userDataReady event received:', e.detail);
                    currentAdmin = {
                        id: e.detail.id,
                        nom: e.detail.nom,
                        role: e.detail.role
                    };
                    
                    if (e.detail.centre) {
                        currentCenter = e.detail.centre;
                    }
                    
                    // Load demands with the admin data
                    loadDemands();
                }, { once: true });
                
                // Set a timeout in case the event never fires
                setTimeout(() => {
                    if (!currentAdmin || !currentAdmin.id) {
                        console.warn('Timeout waiting for user data, trying Auth.getCurrentUser() again');
                        const user = Auth.getCurrentUser();
                        if (user && user.id) {
                            currentAdmin = {
                                id: user.id,
                                nom: user.nom,
                                role: user.role
                            };
                            
                            if (user.structure && user.structure.centre) {
                                currentCenter = user.structure.centre;
                            }
                            
                            loadDemands();
                        } else {
                            console.error('Failed to get user data');
                            showNotification('Erreur lors de la récupération des données utilisateur', 'error');
                        }
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            showNotification('Erreur lors de l\'initialisation', 'error');
        }
    }

    initialize();
});
