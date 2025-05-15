document.addEventListener('DOMContentLoaded', function() {
  
  
    

   
  
  
  
  
    // Variables globales
    let currentAdmin = null;
    let currentCenter = null;
    let availableBons = [];
    let assignedBons = [];

    // Éléments du DOM
    const tabBtns = document.querySelectorAll('.tab-btn');
    const pages = document.querySelectorAll('.page');
    const searchBon = document.getElementById('searchBon');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const bonsBody = document.getElementById('bonsBody');
    const attributionForm = document.getElementById('attributionForm');
    const restitutionForm = document.getElementById('restitutionForm');
    const driverAttribution = document.getElementById('driverAttribution');
    const driverRestitution = document.getElementById('driverRestitution');
    const bonsChecklist = document.getElementById('bonsChecklist');
    const restitutionChecklist = document.getElementById('restitutionChecklist');
    const searchBonAttribution = document.getElementById('searchBonAttribution');
    const typeBonAttribution = document.getElementById('typeBonAttribution');
    const modal = document.getElementById('bonDetailsModal');
    const closeModal = document.querySelector('.close-modal');
    const cancelAttribution = document.getElementById('cancelAttribution');
    const cancelRestitution = document.getElementById('cancelRestitution');
    const attributionDate = document.getElementById('attributionDate');
    const restitutionDate = document.getElementById('restitutionDate');

    // Ajouter une configuration pour l'URL de base de l'API
    const API_BASE_URL = 'http://localhost:3000';

    // Fonction utilitaire pour les appels API
    // async function fetchApi(endpoint, options = {}) {
    //     try {

    //         const token = Auth.getToken();
    //         if (!token) {
    //             throw new Error('No authentication token found');
    //             window.location.href = '../login/login.html';
    //              return;  
    //         }


    //         const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    //             ...options,
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${Auth.getToken()}`,
    //                 ...options.headers
    //             }
    //         });

    //         if (!response.ok) {

    //             if (response.status === 401) {
    //                 console.error('Authentication failed, redirecting to login');
    //                 window.location.href = '../login/login.html';
    //                 return;
    //             }

    //             const error = await response.json();
    //             throw new Error(error.error || 'Erreur serveur');
    //         }

    //         return await response.json();
    //     } catch (error) {
    //         if (error.message === 'Failed to fetch') {
    //             throw new Error('Impossible de se connecter au serveur. Veuillez vérifier que le serveur est démarré.');
    //         }
    //         throw error;
    //     }
    // }


    // Update the fetchApi function
async function fetchApi(endpoint, options = {}) {
    try {
        const token = Auth.getToken();
        if (!token) {
            console.error('No authentication token found');
            window.location.href = '../login/login.html';
            return;
        }

        // console.log('Making API request with token:', token);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('Authentication failed');
                window.location.href = '../login/login.html';
                return;
            }
            const error = await response.json();
            throw new Error(error.message ||error.error|| 'Server error');
        }

        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}




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

    // Fonction pour afficher l'ID admin actuel dans l'interface
    function displayCurrentAdminId() {
        // Vérifier si l'élément existe déjà
        let adminIdDisplay = document.getElementById('currentAdminIdDisplay');
        
        if (adminIdDisplay) {
            // Mettre à jour le contenu
            adminIdDisplay.innerHTML = `
                <span class="admin-id-label">ID Admin actuel:</span>
                <span class="admin-id-value">${currentAdmin?.id || 'N/A'}</span>
                <button id="changeAdminIdBtn" class="btn-change-admin">
                    <i class="fas fa-edit"></i>
                </button>
            `;
            
            // Ajouter un gestionnaire d'événements pour le bouton de modification
            const changeBtn = document.getElementById('changeAdminIdBtn');
            if (changeBtn) {
                changeBtn.addEventListener('click', promptChangeAdminId);
            }
        }
    }
    
    // Fonction pour demander un nouvel ID admin
    function promptChangeAdminId() {
        const newId = prompt('Entrez un nouvel ID administrateur:', currentAdmin?.id || '');
        
        if (newId !== null && newId.trim() !== '') {
            const numericId = parseInt(newId.trim(), 10);
            
            if (!isNaN(numericId) && numericId > 0) {
                // Réinitialiser avec le nouvel ID
                window.location.href = `?adminId=${numericId}`;
            } else {
                showNotification('L\'ID administrateur doit être un nombre positif', 'error');
            }
        }
    }

    // Gestionnaire d'onglets
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Activer l'onglet
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Afficher la page correspondante
            pages.forEach(page => {
                page.classList.remove('active');
            });
            
            document.getElementById(`${tabName}Page`).classList.add('active');
            
            // Charger les données spécifiques à l'onglet
            if (tabName === 'suivi') {
                loadBons();
            } else if (tabName === 'attribution') {
                initializeAttributionForm();
            } else if (tabName === 'restitution') {
                initializeRestitutionForm();
            }
        });
    });

    // Gestionnaires de filtres pour le suivi des bons
    [searchBon, typeFilter, statusFilter, startDate, endDate].forEach(filter => {
        filter.addEventListener('change', loadBons);
    });
    
    searchBon.addEventListener('keyup', loadBons);

    // Gestionnaires de filtres pour l'attribution des bons
    [searchBonAttribution, typeBonAttribution].forEach(filter => {
        filter.addEventListener('change', filterAvailableBons);
        filter.addEventListener('keyup', filterAvailableBons);
    });

    // Gestionnaire pour le changement de chauffeur dans la restitution
    driverRestitution.addEventListener('change', loadDriverAssignedBons);

    // Fermer le modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Annuler l'attribution
    cancelAttribution.addEventListener('click', () => {
        attributionForm.reset();
        document.querySelector('[data-tab="suivi"]').click();
    });

    // Annuler la restitution
    cancelRestitution.addEventListener('click', () => {
        restitutionForm.reset();
        document.querySelector('[data-tab="suivi"]').click();
    });

    // Définir la date du jour par défaut
    const today = new Date().toISOString().split('T')[0];
    attributionDate.value = today;
    restitutionDate.value = today;

    // Charger les bons



    async function loadBons() {
        try {
            const searchTerm = searchBon.value;
            const type = typeFilter.value;
            const status = statusFilter.value;
            const start = startDate.value;
            const end = endDate.value;
    
            const params = new URLSearchParams({
                ...(searchTerm && { search: searchTerm }),
                ...(type && { type }),
                ...(status && { status }),
                ...(start && { startDate: start }),
                ...(end && { endDate: end })
            });
    
            const data = await fetchApi(`/api/bons?${params}`);
            renderBons(data.data);
        } catch (error) {
            console.error('Error loading bons:', error);
            showNotification(error.message, 'error');
        }
    }



    // async function loadBons() {
    //     try {
    //         const searchTerm = searchBon.value;
    //         const type = typeFilter.value;
    //         const status = statusFilter.value;
    //         const start = startDate.value;
    //         const end = endDate.value;

    //         // Construire les paramètres de requête
    //         const queryParams = new URLSearchParams({
    //             ...(searchTerm && { search: searchTerm }),
    //             ...(type && { type: type }),
    //             ...(status && { status: status }),
    //             ...(start && { startDate: start }),
    //             ...(end && { endDate: end })
    //         });

    //         const response = await fetch(`http://localhost:3000/api/bons?${queryParams}`);
            
    //         if (!response.ok) {
    //             throw new Error('Erreur lors de la récupération des bons');
    //         }

    //         const data = await response.json();
    //         renderBons(data.data);
    //     } catch (error) {
    //         console.error('Erreur:', error);
    //         showNotification(error.message, 'error');
    //     }
    // }

    // Fonction pour afficher les bons
    function renderBons(bons) {
        // console.log('Rendu des bons:', bons);
        bonsBody.innerHTML = '';

        if (!bons || bons.length === 0) {
            bonsBody.innerHTML = `
                <div class="bon-row empty">
                    <div class="bon-cell">Aucun bon attribué trouvé</div>
                </div>
            `;
            return;
        }

        bons.forEach(bon => {
            const row = document.createElement('div');
            row.className = 'bon-row';

            const dateAttribution = new Date(bon.date_attribution).toLocaleDateString('fr-FR');
            const consommationClass = bon.statut_consommation === 'consommé' ? 'consomme' : 'non-consomme';

            row.innerHTML = `
                <div class="bon-cell">#${bon.id_bon}</div>
                <div class="bon-cell">${bon.type_bon}</div>
                <div class="bon-cell">${consommationClass}</div>
                <div class="bon-cell">${dateAttribution}</div>
                <div class="bon-cell">
                    <span class="status ${bon.chauffeur_nom}">
                        ${bon.chauffeur_nom }
                    </span>
                </div>
                <div class="bon-cell">
                    <span class="status ${bon.centre_nom}">
                        ${bon.centre_nom}
                    </span>
                </div>
                <div class="bon-cell actions">
                    <button class="btn-icon" onclick="showBonDetails(${bon.id_bon})" title="Voir les détails">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            `;

            bonsBody.appendChild(row);
        });
    }

    // Initialiser le formulaire d'attribution
    async function initializeAttributionForm() {
        try {
            // Remplir les champs en lecture seule
            document.getElementById('currentCenterAttribution').value = currentCenter?.nom || '';
            document.getElementById('currentAdminAttribution').value = currentAdmin?.nom || '';

            // Charger les chauffeurs du centre actuel
            await loadDriversForAttribution();
            
            // Charger les bons disponibles
            await loadAvailableBons();
        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur lors de l\'initialisation du formulaire d\'attribution', 'error');
        }
    }

    // Charger les chauffeurs pour l'attribution
    async function loadDriversForAttribution() {
        try {
            if (!currentCenter?.id) {
                driverAttribution.innerHTML = '<option value="">Aucun centre sélectionné</option>';
                showNotification('Veuillez d\'abord sélectionner un centre', 'warning');
                return;
            }

            const data = await fetchApi(`/api/drivers?centerId=${currentCenter.id}`);
            
            driverAttribution.innerHTML = '<option value="">Sélectionner un chauffeur...</option>';
            
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = driver.nom;
                    driverAttribution.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Impossible de charger les chauffeurs', 'error');
            driverAttribution.innerHTML = '<option value="">Erreur de chargement</option>';
        }
    }

    // Charger les bons disponibles
    // async function loadAvailableBons() {
    //     try {
    //         console.log('Chargement des bons disponibles...');

    //         const response = await fetch(`/api/bon/available`);
            
    //         if (!response.ok) {
    //             const error = await response.json();
    //             throw new Error(error.error || 'Erreur lors du chargement des bons disponibles');
    //         }

    //         const data = await response.json();
    //         console.log('Bons disponibles reçus:', data);
            
    //         // if (!data.data) {
    //         //     throw new Error('Format de données invalide');
    //         // }

    //         availableBons = data.data || data;
    //         renderAvailableBons(availableBons);
    //     } catch (error) {
    //         console.error('Erreur:', error);
    //         showNotification(error.message, 'error');
    //         bonsChecklist.innerHTML = '<p class="no-data">Erreur lors du chargement des bons</p>';
    //     }
    // }



    async function loadAvailableBons() {
        try {
            console.log('Loading available bons...');
            const data = await fetchApi('/api/bon/available');
            availableBons = data.data || data;
            renderAvailableBons(availableBons);
        } catch (error) {
            console.error('Error loading available bons:', error);
            showNotification(error.message, 'error');
            bonsChecklist.innerHTML = '<p class="no-data">Error loading bons</p>';
        }
    }
    



    // Afficher les bons disponibles pour l'attribution
    function renderAvailableBons(bons) {
        // console.log('Rendu des bons disponibles:', bons);
        bonsChecklist.innerHTML = '';

        if (!bons || bons.length === 0) {
            bonsChecklist.innerHTML = '<p class="no-data">Aucun bon disponible</p>';
            return;
        }

        bons.forEach(bon => {
            const item = document.createElement('div');
            item.className = 'bon-checkbox';
            
            item.innerHTML = `
                <input type="checkbox" id="bon-${bon.id_bon}" name="bons" value="${bon.id_bon}">
                <label for="bon-${bon.id_bon}" class="bon-info">
                    <span class="bon-id">#${bon.id_bon}</span>
                    <span class="bon-type">${bon.type_bon}</span>
                </label>
            `;

            bonsChecklist.appendChild(item);
        });
    }

    // Filtrer les bons disponibles
    function filterAvailableBons() {
        const searchTerm = searchBonAttribution.value.toLowerCase();
        const type = typeBonAttribution.value;

        const filteredBons = availableBons.filter(bon => {
            const matchesSearch = searchTerm === '' || 
                                 bon.id_bon.toString().includes(searchTerm);
            const matchesType = type === '' || bon.type_bon === type;

            return matchesSearch && matchesType;
        });

        renderAvailableBons(filteredBons);
    }

    // Charger les chauffeurs pour la restitution
    // async function loadDriversForRestitution() {
    //     try {
    //         const centreId = currentAdmin?.centre_id || 1; // Utilisez l'ID du centre de l'admin connecté
    //         const response = await fetch(`http://localhost:3000/api/drivers/centre/${centreId}`);
            
    //         if (!response.ok) {
    //             throw new Error(`Erreur HTTP: ${response.status}`);
    //         }

    //         const { data } = await response.json();
            
    //         // Clear existing options except the first one
    //         while (driverRestitution.options.length > 1) {
    //             driverRestitution.remove(1);
    //         }

    //         // Add new options
    //         data.forEach(driver => {
    //             const option = document.createElement('option');
    //             option.value = driver.id;
    //             option.textContent = `${driver.nom_complet} (${driver.telephone || 'No tel'})`;
    //             driverRestitution.appendChild(option);
    //         });
    //     } catch (error) {
    //         console.error('Erreur lors du chargement des chauffeurs:', error);
    //         showNotification('Erreur lors du chargement des chauffeurs', 'error');
    //     }
    // }



    async function loadDriversForRestitution() {
        try {
            const centreId = currentAdmin?.centre_id || 1;
            const data = await fetchApi(`/api/drivers/centre/${centreId}`);
            
            // Update select options
            driverRestitution.innerHTML = '<option value="">Sélectionner un chauffeur...</option>';
            
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = `${driver.nom_complet} (${driver.telephone || 'No tel'})`;
                    driverRestitution.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading drivers:', error);
            showNotification('Error loading drivers', 'error');
            driverRestitution.innerHTML = '<option value="">Error loading drivers</option>';
        }
    }

    // Initialiser le formulaire de restitution
    async function initializeRestitutionForm() {
        try {
            // Remplir les champs en lecture seule
            document.getElementById('currentCenterRestitution').value = currentCenter?.nom || '';
            document.getElementById('currentAdminRestitution').value = currentAdmin?.nom || '';

            // Charger les chauffeurs du centre actuel
            await loadDriversForRestitution();
            
            // Réinitialiser la liste des bons à restituer
            restitutionChecklist.innerHTML = '<p class="no-data">Sélectionnez un chauffeur pour voir ses bons</p>';
        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur lors de l\'initialisation du formulaire de restitution', 'error');
        }
    }

    // Charger les bons attribués à un chauffeur
    // async function loadDriverAssignedBons(driverId) {
    //     try {
    //         // If driverId is an event, extract the value from the target
    //         if (driverId && driverId.target && driverId.target.value) {
    //             driverId = driverId.target.value;
    //         }
            
    //         // Ensure driverId is a valid number
    //         if (!driverId || isNaN(parseInt(driverId))) {
    //             console.log('ID chauffeur invalide:', driverId);
    //             return;
    //         }
            
    //         driverId = parseInt(driverId);
    //         console.log('Chargement des bons attribués pour le chauffeur:', driverId);
            
    //         const response = await fetch(`/api/bons/assigned/${parseInt(driverId)}`);
            
    //         if (!response.ok) {
    //             throw new Error(`Erreur HTTP: ${response.status}`);
    //         }

    //         const data = await response.json();
    //         console.log('Bons attribués reçus:', data);
            
    //         // Mettre à jour l'affichage des bons attribués pour la restitution
    //         const restitutionChecklist = document.getElementById('restitutionChecklist');
    //         if (restitutionChecklist) {
    //             restitutionChecklist.innerHTML = '';

    //             if (!data.data || data.data.length === 0) {
    //                 restitutionChecklist.innerHTML = '<p class="no-data">Aucun bon attribué à ce chauffeur</p>';
    //                 return;
    //             }

    //             // Créer une div pour contenir tous les bons
    //             const bonsContainer = document.createElement('div');
    //             bonsContainer.className = 'bons-grid';

    //             data.data.forEach(bon => {
    //                 const item = document.createElement('div');
    //                 item.className = 'bon-checkbox';
    //                 item.innerHTML = `
    //                     <input type="checkbox" id="restitution_bon_${bon.id_bon}" name="restitutionBons" value="${bon.id_bon}">
    //                     <label for="restitution_bon_${bon.id_bon}">
    //                         Bon #${bon.id_bon} - ${bon.type_bon} DA
    //                         <br>
    //                         <small>Attribué le: ${new Date(bon.date_attribution).toLocaleDateString()}</small>
    //                     </label>
    //                 `;
    //                 bonsContainer.appendChild(item);
    //             });

    //             restitutionChecklist.appendChild(bonsContainer);
    //         }
    //     } catch (error) {
    //         console.error('Erreur lors du chargement des bons attribués:', error);
    //         showNotification('Erreur lors du chargement des bons attribués', 'error');
    //     }
    // }
 

    async function loadDriversForRestitution() {
        try {
            const centreId = currentAdmin?.centre_id || 1; // Utilisez l'ID du centre de l'admin connecté
            const response = await fetch(`http://localhost:3000/api/drivers/centre/${centreId}`);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const { data } = await response.json();
            
            // Clear existing options except the first one
            while (driverRestitution.options.length > 1) {
                driverRestitution.remove(1);
            }

            // Add new options
            data.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = `${driver.nom_complet} (${driver.telephone || 'No tel'})`;
                driverRestitution.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des chauffeurs:', error);
            showNotification('Erreur lors du chargement des chauffeurs', 'error');
        }
    }

    // Initialiser le formulaire de restitution
    async function initializeRestitutionForm() {
        try {
            // Remplir les champs en lecture seule
            document.getElementById('currentCenterRestitution').value = currentCenter?.nom || '';
            document.getElementById('currentAdminRestitution').value = currentAdmin?.nom || '';

            // Charger les chauffeurs du centre actuel
            await loadDriversForRestitution();
            
            // Réinitialiser la liste des bons à restituer
            restitutionChecklist.innerHTML = '<p class="no-data">Sélectionnez un chauffeur pour voir ses bons</p>';
        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur lors de l\'initialisation du formulaire de restitution', 'error');
        }
    }

    // Charger les bons attribués à un chauffeur
    async function loadDriverAssignedBons(driverId) {
        try {
            // If driverId is an event, extract the value from the target
            if (driverId && driverId.target && driverId.target.value) {
                driverId = driverId.target.value;
            }
            
            // Ensure driverId is a valid number
            if (!driverId || isNaN(parseInt(driverId))) {
                console.log('ID chauffeur invalide:', driverId);
                return;
            }
            
            driverId = parseInt(driverId);
         //   console.log('Chargement des bons attribués pour le chauffeur:', driverId);
            
            const response = await fetch(`${API_BASE_URL}/api/bons/assigned/${driverId}`,{
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                     'Authorization': `Bearer ${Auth.getToken()}`
            }});
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
         //   console.log('Bons attribués reçus:', data);
            
            // Mettre à jour l'affichage des bons attribués pour la restitution
            const restitutionChecklist = document.getElementById('restitutionChecklist');
            if (restitutionChecklist) {
                restitutionChecklist.innerHTML = '';

                if (!data.data || data.data.length === 0) {
                    restitutionChecklist.innerHTML = '<p class="no-data">Aucun bon attribué à ce chauffeur</p>';
                    return;
                }

                // Créer une div pour contenir tous les bons
                const bonsContainer = document.createElement('div');
                bonsContainer.className = 'bons-grid';

                data.data.forEach(bon => {
                    const item = document.createElement('div');
                    item.className = 'bon-checkbox';
                    item.innerHTML = `
                        <input type="checkbox" id="restitution_bon_${bon.id_bon}" name="restitutionBons" value="${bon.id_bon}">
                        <label for="restitution_bon_${bon.id_bon}">
                            Bon #${bon.id_bon} - ${bon.type_bon} DA
                            <br>
                            <small>Attribué le: ${new Date(bon.date_attribution).toLocaleDateString()}</small>
                        </label>
                    `;
                    bonsContainer.appendChild(item);
                });

                restitutionChecklist.appendChild(bonsContainer);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des bons attribués:', error);
            showNotification('Erreur lors du chargement des bons attribués', 'error');
        }
    }







    // Soumettre le formulaire d'attribution
    document.getElementById('submitAttribution').addEventListener('click', async (event) => {
        event.preventDefault();
        
        try {
            const selectedBons = Array.from(document.querySelectorAll('input[name="bons"]:checked'))
                .map(checkbox => parseInt(checkbox.value));
            
            const chauffeurId = parseInt(document.getElementById('driverAttribution').value);
            const date = document.getElementById('attributionDate').value;

            if (!selectedBons.length || !chauffeurId || !date) {
                showNotification('Veuillez remplir tous les champs requis', 'error');
                return;
            }
            
            const attributionData = {
                chauffeurId,
                adminId: currentAdmin?.id,
                centreId: currentCenter?.id,
                bons: selectedBons,
                date
            };

         //   console.log('Envoi des données d\'attribution:', attributionData);
            
            const response = await fetch('http://localhost:3000/api/attribution/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify(attributionData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Erreur lors de l\'attribution');
            }
            
            showNotification('Bons attribués avec succès', 'success');
            
            // Réinitialiser le formulaire et recharger les bons
            attributionForm.reset();
            await Promise.all([
                loadBons(),
                loadAvailableBons()
            ]);
            
            // Revenir à l'onglet de suivi
            document.querySelector('[data-tab="suivi"]').click();
        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        }
    });

    // Fonction pour charger les chauffeurs avec leurs bons
    async function loadDriversWithBons() {
        try {
            const centerId = currentAdmin?.centre_id || 1; // Utilisez l'ID du centre de l'admin connecté
            const response = await fetch(`http://localhost:3000/api/drivers/with-bons?centerId=${centerId}`);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const { data } = await response.json();
            
            // Mettre à jour le select des chauffeurs
            const driverSelect = document.getElementById('driverSelect');
            driverSelect.innerHTML = '<option value="">Sélectionnez un chauffeur</option>';
            
            data.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = `${driver.nom_complet} (${driver.nombre_bons} bons)`;
                driverSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des chauffeurs:', error);
            showNotification('Erreur lors du chargement des chauffeurs', 'error');
        }
    }

    // Fonction pour afficher les détails d'un bon
    window.showBonDetails = async (bonId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bons/${bonId}`,{
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                     'Authorization': `Bearer ${Auth.getToken()}`
            }});
            if (!response.ok) throw new Error('Erreur lors de la récupération des détails');

            const bon = await response.json();
            
            // Afficher le modal avec les détails
            const modal = document.getElementById('bonDetailsModal');
            const modalContent = modal.querySelector('.modal-body');
            
            // Format dates
            const formatDate = (dateString) => {
                if (!dateString) return 'Non disponible';
                return new Date(dateString).toLocaleDateString('fr-FR');
            };
            
            modalContent.innerHTML = `
                <div class="details-grid">
                    <div class="details-section">
                        <h3>Informations Générales</h3>
                        <div class="detail-item">
                            <span class="detail-label">ID Bon:</span>
                            <span class="detail-value">#${bon.id_bon}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Type:</span>
                            <span class="detail-value">${bon.type_bon}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Statut:</span>
                            <span class="detail-value ${bon.statut_disponibilite === 'attribué' ? 'status-attributed' : bon.statut_disponibilite === 'disponible' ? 'status-available' : 'status-other'}">${bon.statut_disponibilite}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Consommation:</span>
                            <span class="detail-value ${bon.statut_consommation === 'consommé' ? 'status-consumed' : 'status-not-consumed'}">${bon.statut_consommation}</span>
                        </div>
                    </div>

                    ${bon.date_attribution ? `
                        <div class="details-section">
                            <h3>Attribution</h3>
                            <div class="detail-item">
                                <span class="detail-label">Date:</span>
                                <span class="detail-value">${formatDate(bon.date_attribution)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Chauffeur:</span>
                                <span class="detail-value">${bon.chauffeur_nom || 'Non disponible'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Centre:</span>
                                <span class="detail-value">${bon.centre_nom || 'Non disponible'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Admin:</span>
                                <span class="detail-value">${bon.admin_attribution_nom || 'Non disponible'}</span>
                            </div>
                        </div>
                    ` : ''}

                    ${bon.date_restitution ? `
                        <div class="details-section">
                            <h3>Restitution</h3>
                            <div class="detail-item">
                                <span class="detail-label">Date:</span>
                                <span class="detail-value">${formatDate(bon.date_restitution)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Admin:</span>
                                <span class="detail-value">${bon.admin_restitution_nom || 'Non disponible'}</span>
                            </div>
                        </div>
                    ` : ''}

                    ${bon.statut_consommation === 'consommé' ? `
                        <div class="details-section">
                            <h3>Consommation</h3>
                            <div class="detail-item">
                                <span class="detail-label">Date:</span>
                                <span class="detail-value">${formatDate(bon.date_consommation)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Centre:</span>
                                <span class="detail-value">${bon.centre_consommation_nom || 'Non disponible'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Localisation:</span>
                                <span class="detail-value">${bon.centre_consommation_localisation || 'Non disponible'}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="details-actions">
                    ${bon.statut_disponibilite === 'attribué' ? `
                        <button class="btn btn-primary" onclick="prepareRestitution(${bon.id_bon}, ${bon.chauffeur_id})">
                            <i class="fas fa-undo"></i> Restituer
                        </button>
                    ` : ''}
                    
                    ${bon.statut_disponibilite === 'disponible' && bon.statut_consommation === 'non consommé' ? `
                        <button class="btn btn-success" onclick="prepareAttribution(${bon.id_bon})">
                            <i class="fas fa-share"></i> Attribuer
                        </button>
                    ` : ''}
                </div>
            `;

            modal.style.display = 'block';
        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur lors de la récupération des détails', 'error');
        }
    };
    
    // Fonction pour préparer l'attribution d'un bon depuis les détails
    window.prepareAttribution = (bonId) => {
        // Fermer le modal
        document.getElementById('bonDetailsModal').style.display = 'none';
        
        // Aller à l'onglet attribution
        document.querySelector('[data-tab="attribution"]').click();
        
        // Sélectionner le bon dans la liste
        const checkbox = document.querySelector(`#bonsChecklist input[value="${bonId}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
        
        // Remplir les informations automatiquement
        attributionDate.value = new Date().toISOString().split('T')[0];
        
        // Sélectionner le premier chauffeur si aucun n'est sélectionné
        if (driverAttribution.value === '') {
            const firstOption = driverAttribution.querySelector('option:not([value=""])');
            if (firstOption) {
                driverAttribution.value = firstOption.value;
            }
        }
    };
    
    // Fonction pour préparer la restitution d'un bon depuis les détails
    window.prepareRestitution = (bonId, chauffeurId) => {
        // Fermer le modal
        document.getElementById('bonDetailsModal').style.display = 'none';
        
        // Aller à l'onglet restitution
        document.querySelector('[data-tab="restitution"]').click();
        
        // Sélectionner le chauffeur
        if (chauffeurId) {
            driverRestitution.value = chauffeurId;
            
            // Déclencher l'événement change pour charger les bons du chauffeur
            const event = new Event('change');
            driverRestitution.dispatchEvent(event);
            
            // Attendre que les bons soient chargés puis sélectionner le bon
            setTimeout(() => {
                const checkbox = document.querySelector(`#restitutionChecklist input[value="${bonId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            }, 500);
        }
        
        // Remplir la date automatiquement
        restitutionDate.value = new Date().toISOString().split('T')[0];
    };

    // Fonction pour gérer la soumission du formulaire de restitution
    async function handleRestitutionSubmit(event) {
        if (event) event.preventDefault();
        
        try {
            // Récupérer les bons sélectionnés
            const selectedBons = Array.from(document.querySelectorAll('input[name="restitutionBons"]:checked'))
                .map(checkbox => parseInt(checkbox.value));
            
            const driverId = parseInt(document.getElementById('driverRestitution').value);
            const dateRestitution = document.getElementById('restitutionDate').value;
            
            if (!selectedBons.length) {
                showNotification('Veuillez sélectionner au moins un bon à restituer', 'warning');
                return;
            }
            
            if (!driverId) {
                showNotification('Veuillez sélectionner un chauffeur', 'warning');
                return;
            }
            
            if (!dateRestitution) {
                showNotification('Veuillez sélectionner une date de restitution', 'warning');
                return;
            }
            
            // Afficher un message de chargement
            showNotification('Traitement de la restitution en cours...', 'info');
            
            // Préparer les données pour la requête
            const adminId = currentAdmin?.id || 1; // Utiliser l'ID de l'admin connecté ou 1 par défaut
            const centreId = currentAdmin?.centre_id || 1; // Utiliser l'ID du centre de l'admin connecté ou 1 par défaut
            
            // Envoyer la requête au serveur
            const response = await fetch(`${API_BASE_URL}/api/restitution/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_admin: adminId,
                    id_chauffeur: driverId,
                    id_centre: centreId,
                    date_restitution: dateRestitution,
                    bons: selectedBons
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la restitution');
            }
            
            const result = await response.json();
            
            // Afficher un message de succès
            showNotification(`Restitution effectuée avec succès: ${selectedBons.length} bon(s) restitué(s)`, 'success');
            
            // Réinitialiser le formulaire
            document.getElementById('restitutionForm').reset();
            
            // Recharger les données
            await Promise.all([
                loadBons(),
                loadDriverAssignedBons(driverId) // Recharger les bons du chauffeur actuel
            ]);
            
      // Switch to suivi tab
      const suiviTab = document.querySelector('[data-tab="suivi"]');
      if (suiviTab) {
          suiviTab.click();
      }

        } catch (error) {
            console.error('Erreur lors de la restitution:', error);
            showNotification(`Erreur: ${error.message}`, 'error');
        }
    }

    // Event listener for restitution form submission
    const restitutionButton = document.getElementById('restitutionButton');
    if (restitutionButton) {
        restitutionButton.addEventListener('click', handleRestitutionSubmit);
    }
    
    // Event listener for driver selection in restitution form
    const driverRestitutionSelect = document.getElementById('driverRestitution');
    if (driverRestitutionSelect) {
        driverRestitutionSelect.addEventListener('change', function() {
            const driverId = this.value;
            if (driverId) {
                loadDriverAssignedBons(driverId);
            }
        });
    }

    // Event listener for cancel button
    document.getElementById('resetFilter').addEventListener('click', () => {
        searchBon.value ='';
        typeFilter.value = '';  
        statusFilter.value = '';
        startDate.value = '';
        endDate.value = '';
        loadBons();
    });

    // Event listener for cancel attribution button
    document.getElementById('cancelAttribution').addEventListener('click', () => {
        // Reset the form
        const attributionForm = document.getElementById('attributionForm');
        if (attributionForm) {
            attributionForm.reset();
            
            // Clear the bons checklist
            const bonsChecklist = document.getElementById('bonsChecklist');
            if (bonsChecklist) {
                bonsChecklist.innerHTML = '<p class="no-data">Sélectionnez des filtres pour voir les bons disponibles</p>';
            }
            
            // Show notification
            showNotification('Attribution annulée', 'success');
        }
    });

    // Event listener for cancel restitution button
    const cancelRestitutionButton = document.getElementById('cancelRestitution');
    if (cancelRestitutionButton) {
        cancelRestitutionButton.addEventListener('click', () => {
            // Reset the form
            const restitutionForm = document.getElementById('restitutionForm');
            if (restitutionForm) {
                restitutionForm.reset();
                
                // Clear the bons checklist
                const restitutionChecklist = document.getElementById('restitutionChecklist');
                if (restitutionChecklist) {
                    restitutionChecklist.innerHTML = '<p class="no-data">Sélectionnez un chauffeur pour voir ses bons</p>';
                }
                
                // Show notification
                showNotification('Restitution annulée', 'success');
            }
        });
    }

    // Initialisation
    async function initialize() {
        try {


           //  Get current user data
            const user = Auth.getCurrentUser();
            if (!user) {
                throw new Error('No user data available');
            }

            // Set current admin data from the global currentUser object
            if (window.currentUser) {
             //   console.log('Initializing from window.currentUser:', window.currentUser);
                currentAdmin = {
                    id: window.currentUser.id,
                    nom: window.currentUser.nom,
                    role: window.currentUser.role,
                    centre_id: window.currentUser.centre ? window.currentUser.centre.id : null
                };
                
                if (window.currentUser.centre) {
                    currentCenter = window.currentUser.centre;
                 //   console.log('Current center set:', currentCenter);
                } else {
                    console.warn('No center information found in currentUser');
                }
            } else {
                // Listen for the userDataReady event
                await new Promise(resolve => {
                    document.addEventListener('userDataReady', function(e) {
                      //  console.log('userDataReady event received:', e.detail);
                        currentAdmin = {
                            id: e.detail.id,
                            nom: e.detail.nom,
                            role: e.detail.role,
                            centre_id: e.detail.centre ? e.detail.centre.id : null
                        };
                        
                        if (e.detail.centre) {
                            currentCenter = e.detail.centre;
                        //    console.log('Current center set from event:', currentCenter);
                        } else {
                            console.warn('No center information found in event data');
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
            
            // Check if we have admin and center info after initialization
            if (!currentAdmin || !currentAdmin.id) {
                console.error('No valid admin information available');
                showNotification('Erreur: Informations administrateur non disponibles', 'error');
            }
            
            if (!currentCenter || !currentCenter.id) {
                console.error('No valid center information available');
                showNotification('Erreur: Informations centre non disponibles', 'error');
            }
            
            // Update fields for attribution and restitution forms
            updateUiWithAdminInfo();
            
            // Load initial data
            try {
                await loadBons();
            } catch (error) {
                console.warn('Erreur lors du chargement des bons:', error);
                showNotification('Impossible de charger les bons', 'error');
            }
            
            // Load drivers for attribution and restitution
            await Promise.all([
                loadDriversForAttribution(),
                loadDriversForRestitution()
            ]);
            
            // Load available bons
            await loadAvailableBons();
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            showNotification(error.message, 'error');
        }
    }




    // async function initialize() {
    //     try {
    //         // Get current user data
    //         const user = Auth.getCurrentUser();
    //         if (!user) {
    //             throw new Error('No user data available');
    //         }
    
    //         currentAdmin = {
    //             id: user.id,
    //             nom: user.nom,
    //             role: user.role,
    //             centre_id: user.structure?.centre?.id
    //         };
    
    //         currentCenter = user.structure?.centre;
    
    //         if (!currentAdmin || !currentCenter) {
    //             throw new Error('Missing admin or center information');
    //         }
    
    //         console.log('Initialized with:', { currentAdmin, currentCenter });
            
    //         updateUiWithAdminInfo();
            
    //         // Load initial data in parallel
    //         await Promise.all([
    //             loadBons(),
    //             loadDriversForAttribution(),
    //             loadDriversForRestitution(),
    //             loadAvailableBons()
    //         ]).catch(error => {
    //             console.error('Error loading data:', error);
    //             showNotification('Error loading some data', 'error');
    //         });
    
    //     } catch (error) {
    //         console.error('Initialization error:', error);
    //         showNotification(error.message, 'error');
    //     }
    // }



    
    // Update UI with admin information
    function updateUiWithAdminInfo() {
       // console.log('Updating UI with admin info:', currentAdmin, currentCenter);
        if (currentAdmin && currentCenter) {
            // Update fields in attribution form
            const currentCenterAttribution = document.getElementById('currentCenterAttribution');
            const currentAdminAttribution = document.getElementById('currentAdminAttribution');
            if (currentCenterAttribution) currentCenterAttribution.value = currentCenter.nom || 'Centre non défini';
            if (currentAdminAttribution) currentAdminAttribution.value = currentAdmin.nom || 'Admin non défini';
            
            // Update fields in restitution form
            const currentCenterRestitution = document.getElementById('currentCenterRestitution');
            const currentAdminRestitution = document.getElementById('currentAdminRestitution');
            if (currentCenterRestitution) currentCenterRestitution.value = currentCenter.nom || 'Centre non défini';
            if (currentAdminRestitution) currentAdminRestitution.value = currentAdmin.nom || 'Admin non défini';
        } else {
            console.warn('Cannot update UI: missing admin or center info');
        }
    }

    // Check authentication first
    if (!Auth.isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        window.location.href = '../login/login.html';
        return;
    }

    // Check permission
    if (!Auth.hasPermission('attribuer_bons')) {
        console.log('User lacks permission, redirecting to profile');
        window.location.href = '../profile/profil.html';
        return;
    }

    // Initialize after auth check
    initialize();
});