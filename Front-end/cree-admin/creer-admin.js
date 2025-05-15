document.addEventListener('DOMContentLoaded', function() {
   
     // Check authentication first
     if (!Auth.isAuthenticated()) {
        console.error('User not authenticated');
        window.location.href = '../login/login.html';
        return;
    }

    // Check permission
    if (!Auth.hasPermission('créer_admin')) {
        console.error('User lacks créer_admin permission');
        window.location.href = '../profile/profil.html';
        return;
    }
   
   
   
   
   
   
   
    // Éléments du formulaire
    const form = document.getElementById('createAdminForm');
    const roleSelect = document.getElementById('role');
    const structureContainers = {
        centre: document.getElementById('centreContainer'),
        branche: document.getElementById('brancheContainer'),
        district: document.getElementById('districtContainer')
    };
    const permissionCheckboxes = document.querySelectorAll('input[name="permissions"]');

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

    // Charger les structures depuis le serveur
    async function loadStructures() {
        try {


             // Get the authentication token
        const token = Auth.getToken();
        if (!token) {
            console.error('No authentication token found');
            window.location.href = '../login/login.html';
            return;
        }




            const headers = {
                'Authorization': `Bearer ${Auth.getToken()}`,
                'Content-Type': 'application/json'
            };



            const [centresRes, branchesRes, districtsRes] = await Promise.all([
                fetch('http://localhost:3000/api/structures/centres', { headers }),
                fetch('http://localhost:3000/api/structures/branches', { headers }),
                fetch('http://localhost:3000/api/structures/districts', { headers })
            ]);

            if (!centresRes.ok || !branchesRes.ok || !districtsRes.ok) {
                throw new Error('Erreur lors de la récupération des structures');
            }

            const [centresData, branchesData, districtsData] = await Promise.all([
                centresRes.json(),
                branchesRes.json(),
                districtsRes.json()
            ]);

            // Vérifier que les données sont présentes et dans le bon format
            if (!centresData.data || !branchesData.data || !districtsData.data) {
                throw new Error('Format de données invalide');
            }

            populateSelect('centre', centresData.data);
            populateSelect('branche', branchesData.data);
            populateSelect('district', districtsData.data);
        } catch (error) {
            console.error('Erreur lors du chargement des structures:', error);
            showNotification('Erreur lors du chargement des structures', 'error');
        }
    }

    // Remplir les listes déroulantes
    function populateSelect(type, items) {
        if (!Array.isArray(items)) {
            console.error(`Les données pour ${type} ne sont pas un tableau`);
            return;
        }

        const select = document.getElementById(type);
        if (!select) {
            console.error(`Élément select pour ${type} non trouvé`);
            return;
        }

        select.innerHTML = '<option value="">Sélectionner un ' + type + '</option>';
        
        items.forEach(item => {
            if (item && item.id && item.nom) {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.nom} (${item.localisation})`;
                select.appendChild(option);
            }
        });
    }

    // Gérer les permissions selon le rôle
    function updatePermissions(role) {
        // Réinitialiser toutes les permissions
        permissionCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.disabled = false;
        });

        // Définir les permissions par défaut selon le rôle
        switch(role) {
            case 'Administrateur Centre':
                // Toutes les permissions sauf "créer_admin"
                permissionCheckboxes.forEach(checkbox => {
                    if (checkbox.value !== 'creer_admin') {
                        checkbox.checked = true;
                    }
                });
                break;
            case 'Administrateur Branche':
            case 'Administrateur District':
                // Uniquement "consultation"
                const consultationCheckbox = document.getElementById('consultation');
                if (consultationCheckbox) {
                    consultationCheckbox.checked = true;
                }
                break;
        }
    }

    // Gérer l'affichage des sélecteurs de structure
    roleSelect.addEventListener('change', function() {
        // Cacher tous les conteneurs
        Object.values(structureContainers).forEach(container => {
            if (container) {
                container.style.display = 'none';
                const select = container.querySelector('select');
                if (select) select.required = false;
            }
        });

        // Afficher le conteneur approprié
        switch(this.value) {
            case 'Administrateur Centre':
                if (structureContainers.centre) {
                    structureContainers.centre.style.display = 'block';
                    const select = structureContainers.centre.querySelector('select');
                    if (select) select.required = true;
                }
                break;
            case 'Administrateur Branche':
                if (structureContainers.branche) {
                    structureContainers.branche.style.display = 'block';
                    const select = structureContainers.branche.querySelector('select');
                    if (select) select.required = true;
                }
                break;
            case 'Administrateur District':
                if (structureContainers.district) {
                    structureContainers.district.style.display = 'block';
                    const select = structureContainers.district.querySelector('select');
                    if (select) select.required = true;
                }
                break;
        }

        updatePermissions(this.value);
    });

    // Gérer la soumission du formulaire
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validation du mot de passe
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            showNotification('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        // Récupérer les permissions sélectionnées
        const selectedPermissions = Array.from(permissionCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        // Construire l'objet de données
        const formData = {
            nom: document.getElementById('nom').value,
            email: document.getElementById('email').value,
            mot_de_passe: password,
            role: roleSelect.value,
            permissions: selectedPermissions,
            centre_id: null,
            district_id: null,
            branche_id: null
        };

        // Ajouter l'ID de la structure selon le rôle
        switch(roleSelect.value) {
            case 'Administrateur Centre':
                formData.centre_id = document.getElementById('centre').value;
                break;
            case 'Administrateur Branche':
                formData.branche_id = document.getElementById('branche').value;
                break;
            case 'Administrateur District':
                formData.district_id = document.getElementById('district').value;
                break;
        }

        try {
            const response = await fetch('http://localhost:3000/api/admin/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la création');
            }

            showNotification('Administrateur créé avec succès');
            // setTimeout(() => window.location.href = 'admin.html', 2000);
        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message || "Erreur lors de la création de l'administrateur", 'error');
        }
    });

    // Charger les structures au chargement de la page
    loadStructures();
}); 