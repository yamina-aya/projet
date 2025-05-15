// // Check for Auth object first
// if (typeof window.Auth === 'undefined') {
//     console.error('Auth object is not defined. Make sure auth.js is loaded before this script.');
// }

// // Shorthand reference to the Auth object
// const Auth = window.Auth;

// Diagnostic function to check permissions
function checkPermissions() {
    console.log('--- Permission Diagnostic (profil.js) ---');
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

// Run diagnostic when DOM is loaded
document.addEventListener('DOMContentLoaded', checkPermissions);

// Fonction pour afficher les notifications
function showNotification(message, type = 'success') {
    const container = document.querySelector('.notification-container');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Get admin ID from Auth service
let adminId;

// Mapping des permissions en français
const PERMISSIONS_MAPPING = {
    'creer_admin': 'Créer des administrateurs',
    'consultation': 'Consultation',
    'envoyer_demande': 'Envoyer des demandes',
    'attribuer_bons': 'Attribuer des bons',
    'remplir_formulaire_consommation': 'Remplir formulaire de consommation'
};



// Function to load profile information with proper authentication
async function loadProfileInfo() {
    try {
        // Get admin ID from Auth service directly
        if (!adminId) {
            const user = Auth.getCurrentUser();
            if (user && user.id) {
                adminId = user.id;
                console.log('Using admin ID from Auth.getCurrentUser():', adminId);
            } else {
                console.log('Waiting for userDataReady event to get admin ID...');
                await new Promise(resolve => {
                    document.addEventListener('userDataReady', function(e) {
                        if (e.detail && e.detail.id) {
                            adminId = e.detail.id;
                            console.log('Admin ID from userDataReady event:', adminId);
                        } else {
                            console.warn('userDataReady event received but no ID found:', e.detail);
                        }
                        resolve();
                    }, { once: true });
                    
                    // Set a timeout in case the event never fires
                    setTimeout(() => {
                        if (!adminId) {
                            console.warn('Timeout waiting for userDataReady event, trying Auth.getCurrentUser() again');
                            const user = Auth.getCurrentUser();
                            if (user && user.id) {
                                adminId = user.id;
                                console.log('Admin ID from Auth.getCurrentUser() after timeout:', adminId);
                            }
                        }
                        resolve();
                    }, 2000);
                });
            }
        }

        if (!adminId) {
            showNotification('Impossible de récupérer les informations de l\'utilisateur', 'error');
            return;
        }

        // Get token and verify it exists
        const token = Auth.getToken();
        if (!token) {
            console.error('No authentication token available');
            showNotification('Token d\'authentification non disponible', 'error');
            return;
        }

        console.log('Fetching profile info for admin ID:', adminId);
        console.log('Auth token available:', !!token); // Log if token exists (not the actual token)
        
        const response = await fetch(`http://localhost:3000/api/profile/${adminId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`HTTP error! status: ${response.status}, message:`, errorBody);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const adminData = await response.json();
        console.log('Admin data received:', adminData);

        // Remplir les informations de base
        document.getElementById('nomInput').value = adminData.nom || '';
        document.getElementById('emailInput').value = adminData.email || '';
        document.getElementById('roleInput').value = adminData.role || '';

        // Remplir la photo de profil
        if (adminData.photo_url) {
            document.getElementById('profilePhoto').src = adminData.photo_url;
        }

        // Remplir les informations de structure
        if (adminData.structure) {
            // Centre
            if (adminData.structure.centre) {
                document.querySelector('#centreName span').textContent = adminData.structure.centre.nom || 'N/A';
                document.querySelector('#centreLocation span').textContent = adminData.structure.centre.localisation || 'N/A';
            } else {
                document.querySelector('#centreName span').textContent = 'Non défini';
                document.querySelector('#centreLocation span').textContent = 'Non défini';
            }

            // District
            if (adminData.structure.district) {
                document.querySelector('#districtName span').textContent = adminData.structure.district.nom || 'N/A';
                document.querySelector('#districtLocation span').textContent = adminData.structure.district.localisation || 'N/A';
            } else {
                document.querySelector('#districtName span').textContent = 'Non défini';
                document.querySelector('#districtLocation span').textContent = 'Non défini';
            }

            // Branche
            if (adminData.structure.branche) {
                document.querySelector('#branchName span').textContent = adminData.structure.branche.nom || 'N/A';
                document.querySelector('#branchLocation span').textContent = adminData.structure.branche.localisation || 'N/A';
            } else {
                document.querySelector('#branchName span').textContent = 'Non défini';
                document.querySelector('#branchLocation span').textContent = 'Non défini';
            }
        } else {
            // No structure information at all
            document.querySelector('#centreName span').textContent = 'Non défini';
            document.querySelector('#centreLocation span').textContent = 'Non défini';
            document.querySelector('#districtName span').textContent = 'Non défini';
            document.querySelector('#districtLocation span').textContent = 'Non défini';
            document.querySelector('#branchName span').textContent = 'Non défini';
            document.querySelector('#branchLocation span').textContent = 'Non défini';
        }

        // Afficher les permissions avec les icônes
        displayPermissions(adminData.permissions || []);

    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        showNotification('Erreur lors du chargement du profil', 'error');
    }
}



// Charger les informations du profil
// async function loadProfileInfo() {
//     try {
//         // Get admin ID from Auth service directly
//         if (!adminId) {
//             const user = Auth.getCurrentUser();
//             if (user && user.id) {
//                 adminId = user.id;
//                 console.log('Using admin ID from Auth.getCurrentUser():', adminId);
//             } else {
//                 console.log('Waiting for userDataReady event to get admin ID...');
//                 await new Promise(resolve => {
//                     document.addEventListener('userDataReady', function(e) {
//                         if (e.detail && e.detail.id) {
//                             adminId = e.detail.id;
//                             console.log('Admin ID from userDataReady event:', adminId);
//                         } else {
//                             console.warn('userDataReady event received but no ID found:', e.detail);
//                         }
//                         resolve();
//                     }, { once: true });
                    
//                     // Set a timeout in case the event never fires
//                     setTimeout(() => {
//                         if (!adminId) {
//                             console.warn('Timeout waiting for userDataReady event, trying Auth.getCurrentUser() again');
//                             const user = Auth.getCurrentUser();
//                             if (user && user.id) {
//                                 adminId = user.id;
//                                 console.log('Admin ID from Auth.getCurrentUser() after timeout:', adminId);
//                             } else {
//                                 console.error('Failed to get admin ID, using fallback');
//                                 // Only use a fallback if absolutely necessary
//                                 const token = Auth.getToken();
//                                 if (token) {
//                                     try {
//                                         // Try to extract user ID from token if possible
//                                         const tokenPayload = JSON.parse(atob(token.split('.')[1]));
//                                         if (tokenPayload && tokenPayload.id) {
//                                             adminId = tokenPayload.id;
//                                             console.log('Extracted admin ID from token:', adminId);
//                                         }
//                                     } catch (e) {
//                                         console.error('Error extracting data from token:', e);
//                                     }
//                                 }
//                             }
//                         }
//                         resolve();
//                     }, 2000);
//                 });
//             }
//         }

//         if (!adminId) {
//             showNotification('Impossible de récupérer les informations de l\'utilisateur', 'error');
//             return;
//         }

//         console.log('Fetching profile info for admin ID:', adminId);
//         const response = await fetch(`http://localhost:3000/api/profile/${adminId}`, {
//             headers: {
//                'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${Auth.getToken()}`
                

//             }
//         });
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         const adminData = await response.json();
//         console.log('Admin data received:', adminData);

//         // Remplir les informations de base
//         document.getElementById('nomInput').value = adminData.nom || '';
//         document.getElementById('emailInput').value = adminData.email || '';
//         document.getElementById('roleInput').value = adminData.role || '';

//         // Remplir la photo de profil
//         if (adminData.photo_url) {
//             document.getElementById('profilePhoto').src = adminData.photo_url;
//         }

//         // Remplir les informations de structure
//         if (adminData.structure) {
//             // Centre
//             if (adminData.structure.centre) {
//                 document.querySelector('#centreName span').textContent = adminData.structure.centre.nom || 'N/A';
//                 document.querySelector('#centreLocation span').textContent = adminData.structure.centre.localisation || 'N/A';
//             } else {
//                 document.querySelector('#centreName span').textContent = 'Non défini';
//                 document.querySelector('#centreLocation span').textContent = 'Non défini';
//             }

//             // District
//             if (adminData.structure.district) {
//                 document.querySelector('#districtName span').textContent = adminData.structure.district.nom || 'N/A';
//                 document.querySelector('#districtLocation span').textContent = adminData.structure.district.localisation || 'N/A';
//             } else {
//                 document.querySelector('#districtName span').textContent = 'Non défini';
//                 document.querySelector('#districtLocation span').textContent = 'Non défini';
//             }

//             // Branche
//             if (adminData.structure.branche) {
//                 document.querySelector('#branchName span').textContent = adminData.structure.branche.nom || 'N/A';
//                 document.querySelector('#branchLocation span').textContent = adminData.structure.branche.localisation || 'N/A';
//             } else {
//                 document.querySelector('#branchName span').textContent = 'Non défini';
//                 document.querySelector('#branchLocation span').textContent = 'Non défini';
//             }
//         } else {
//             // No structure information at all
//             document.querySelector('#centreName span').textContent = 'Non défini';
//             document.querySelector('#centreLocation span').textContent = 'Non défini';
//             document.querySelector('#districtName span').textContent = 'Non défini';
//             document.querySelector('#districtLocation span').textContent = 'Non défini';
//             document.querySelector('#branchName span').textContent = 'Non défini';
//             document.querySelector('#branchLocation span').textContent = 'Non défini';
//         }

//         // Afficher les permissions avec les icônes
//         displayPermissions(adminData.permissions || []);

//     } catch (error) {
//         console.error('Erreur lors du chargement du profil:', error);
//         showNotification('Erreur lors du chargement du profil', 'error');
//     }
// }

// Mise à jour de la gestion des transitions
document.getElementById('showPasswordForm').addEventListener('click', () => {
    const mainContent = document.getElementById('mainContent');
    const passwordSection = document.getElementById('passwordSection');
    
    mainContent.classList.add('fade-exit');
    
    setTimeout(() => {
        mainContent.style.display = 'none';
        passwordSection.style.display = 'block';
        passwordSection.classList.add('fade-enter');
        // Focus sur le premier champ
        document.getElementById('currentPassword').focus();
    }, 400); // Ajusté à 400ms pour correspondre à la durée de l'animation
});

document.getElementById('cancelPasswordChange').addEventListener('click', () => {
    const mainContent = document.getElementById('mainContent');
    const passwordSection = document.getElementById('passwordSection');
    
    passwordSection.classList.add('fade-exit');
    
    setTimeout(() => {
        passwordSection.style.display = 'none';
        mainContent.style.display = 'block';
        mainContent.classList.add('fade-enter');
        // Reset du formulaire
        document.getElementById('passwordForm').reset();
    }, 400); // Ajusté à 400ms pour correspondre à la durée de l'animation
});

// Nettoyage des classes d'animation
document.addEventListener('animationend', (e) => {
    if (e.target.classList.contains('fade-enter')) {
        e.target.classList.remove('fade-enter');
    }
    if (e.target.classList.contains('fade-exit')) {
        e.target.classList.remove('fade-exit');
    }
});

// Mise à jour de la gestion des boutons d'édition
document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', function() {
        const field = this.dataset.field;
        const input = document.getElementById(`${field}Input`);
        const isEditing = this.dataset.editing === 'true';
        
        if (!isEditing) {
            // Passer en mode édition
            input.readOnly = false;
            input.focus();
            this.innerHTML = '<i class="fas fa-save"></i>';
            this.dataset.editing = 'true';
            input.dataset.originalValue = input.value;
        } else {
            // Sauvegarder les modifications
            updateProfile({ [field]: input.value });
            input.readOnly = true;
            this.innerHTML = '<i class="fas fa-edit"></i>';
            this.dataset.editing = 'false';
        }
    });
});

// Mettre à jour le profil
async function updateProfile(data) {
    try {
        if (!adminId) {
            showNotification('ID administrateur non disponible', 'error');
            return;
        }
        
        const response = await fetch(`http://localhost:3000/api/profile/${adminId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification('Profil mis à jour avec succès');
            loadProfileInfo(); // Recharger les informations
        } else {
            const error = await response.json();
            throw new Error(error.erreur || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showNotification(error.message, 'error');
    }
}

// Gestion de la soumission du formulaire
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (newPassword !== confirmPassword) {
        showNotification('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:3000/api/profile/${adminId}/mot-de-passe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        if (response.ok) {
            showNotification('Mot de passe modifié avec succès', 'success');
            document.getElementById('cancelPasswordChange').click();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Erreur lors de la modification du mot de passe', 'error');
        }
    } catch (error) {
        showNotification('Erreur lors de la modification du mot de passe', 'error');
    }
});

// Gérer le changement de photo de profil
document.getElementById('photoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!adminId) {
        showNotification('ID administrateur non disponible', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const response = await fetch(`http://localhost:3000/api/profile/${adminId}/photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('profilePhoto').src = data.photoUrl;
            showNotification('Photo de profil mise à jour avec succès');
        } else {
            const error = await response.json();
            throw new Error(error.erreur || 'Erreur lors de la mise à jour de la photo');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification(error.message, 'error');
    }
});

// Mise à jour de l'affichage des permissions
function displayPermissions(permissions) {
    const container = document.getElementById('permissionsContainer');
    container.innerHTML = '';
    
    const PERMISSION_ICONS = {
        'creer_admin': 'fas fa-user-plus',
        'consultation': 'fas fa-eye',
        'envoyer_demande': 'fas fa-paper-plane',
        'attribuer_bons': 'fas fa-ticket-alt',
        'remplir_formulaire_consommation': 'fas fa-file-alt'
    };

    permissions.forEach(permission => {
        const div = document.createElement('div');
        div.className = 'permission-item';
        div.innerHTML = `
            <i class="${PERMISSION_ICONS[permission] || 'fas fa-check'}"></i>
            <span>${PERMISSIONS_MAPPING[permission] || permission}</span>
        `;
        container.appendChild(div);
    });
}

// Charger les informations au chargement de la page
document.addEventListener('DOMContentLoaded', loadProfileInfo); 


