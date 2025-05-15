// page-protection.js - Protect pages based on required permissions

// Make sure the auth.js module is loaded before this script
document.addEventListener('DOMContentLoaded', function() {
    // Skip authentication check for login page
    if (window.location.pathname.includes('login.html')) {
        return;
    }
    
    // Check authentication 
    if (!Auth.isAuthenticated()) {
        console.warn('User not authenticated, redirecting to login page');
        Auth.logout(); // This will clear any invalid data and redirect
        return;
    }
    
    // Check session validity
    Auth.checkSession().catch(error => {
        console.error('Session check failed:', error);
        Auth.logout();
        return;
    });
    
    // Get current user
    const user = Auth.getCurrentUser();
    
    if (!user) {
        console.error('No user data available. Redirecting to login...');
        Auth.logout();
        return;
    }
    
    // Define required permissions for each page
    const pagePermissions = {
        'profil.html': [], // Everyone can access profile
        'creer-admin.html': ['créer_admin'],
        'bons.html': ['attribuer_bons'],
        'Demand.html': ['envoyer_demande'],
        'Consommation.html': ['remplir_formulaire_consommation'],
        'Analyse_General.html': ['consultation'],
        'Analyse_Bons.html': ['consultation'],
        'Analyse_Demandes.html': ['consultation'],
        'Analyse_Cartes.html': ['consultation'],
        'Analyse_Directe.html': ['consultation'],
    };
    
    // Get current page
    const currentPage = window.location.pathname.split('/').pop() || 'profil.html';
    
    // Check if current page requires permission
    if (pagePermissions[currentPage]) {
        const requiredPermissions = pagePermissions[currentPage];
        
        // Allow access if no permissions required
        if (requiredPermissions.length === 0) {
            // No permissions required for this page
        } else {            
            // Check if user has any of the required permissions
            let hasPermission = false;
            
            if (Array.isArray(user.permissions)) {
                requiredPermissions.forEach(permission => {
                    if (user.permissions.includes(permission)) {
                        hasPermission = true;
                    }
                });
            }
            
            if (!hasPermission) {
                // Redirect to unauthorized page or dashboard
                console.error('User does not have required permissions, redirecting');
                alert('Vous n\'avez pas la permission d\'accéder à cette page.');
                window.location.href = 'profil.html';
                return;
            }
        }
    }
    
    // Initialize global currentUser object
    initializeCurrentUser(user);
    
    // Update sidebar visibility
    updateSidebarVisibility(user.permissions);
});

// Extract structure information safely with better debugging
function extractStructureInfo(structure) {
    // Create empty structure if not provided
    if (!structure) {
        console.warn('No structure data provided');
        return {
            centre: null,
            branche: null,
            district: null
        };
    }
    
    // Extract centre information
    let centre = null;
    if (structure.centre) {
        centre = {
            id: structure.centre.id,
            nom: structure.centre.nom,
            localisation: structure.centre.localisation
        };
    } else {
        console.warn('No centre information in structure');
    }
    
    // Extract branche information
    let branche = null;
    if (structure.branche) {
        branche = {
            id: structure.branche.id,
            nom: structure.branche.nom,
            localisation: structure.branche.localisation
        };
    } else {
        console.warn('No branche information in structure');
    }
    
    // Extract district information
    let district = null;
    if (structure.district) {
        district = {
            id: structure.district.id,
            nom: structure.district.nom,
            localisation: structure.district.localisation
        };
    } else {
        console.warn('No district information in structure');
    }
    
    return { centre, branche, district };
}

// Hide sidebar links based on user permissions
function updateSidebarVisibility(permissions) {
    if (!Array.isArray(permissions)) {
        console.error('Permissions is not an array:', permissions);
        permissions = [];
    }
    
    // Map of sidebar links to required permissions
    const sidebarLinks = {
        'creer-admin.html': 'créer_admin',
        'bons.html': 'attribuer_bons',
        'Demand.html': 'envoyer_demande',
        'Consommation.html': 'remplir_formulaire_consommation',
        'Analyse_General.html': 'consultation',
        'Analyse_Bons.html': 'consultation',
        'Analyse_Demandes.html': 'consultation',
        'Analyse_Cartes.html': 'consultation',
        'Analyse_Directe.html': 'consultation'
    };
    
    // Check all links in the sidebar
    const links = document.querySelectorAll('.sidebar a');
    let visibleDashboardLinks = 0;
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Check if this link requires a permission
        if (sidebarLinks[href]) {
            const requiredPermission = sidebarLinks[href];
            const hasPermission = permissions.includes(requiredPermission);
            
            if (!hasPermission) {
                // Hide the entire li element
                const li = link.closest('li');
                if (li) {
                    li.style.display = 'none';
                }
            } else if (href.includes('Analyse_')) {
                visibleDashboardLinks++;
            }
        }
    });
    
    // Special handling for the dashboard dropdown
    const dashboardItem = document.querySelector('.sidebar .dropdown');
    if (dashboardItem) {
        if (!permissions.includes('consultation') || visibleDashboardLinks === 0) {
            dashboardItem.style.display = 'none';
        } else if (permissions.includes('consultation')) {
            dashboardItem.style.display = '';
        }
    }
}

// Add current user data to window for easy access from all JS files
function initializeCurrentUser(user) {
    if (!user) {
        console.error('No user data provided to initializeCurrentUser');
        return false;
    }
    
    try {
        // Extract structure information 
        const structureInfo = extractStructureInfo(user.structure);
        
        // Create a global variable with user data
        window.currentUser = {
            id: user.id,
            nom: user.nom,
            role: user.role,
            email: user.email,
            permissions: Array.isArray(user.permissions) ? user.permissions : [],
            structure: user.structure || { centre: null, branche: null, district: null },
            centre: structureInfo.centre,
            branche: structureInfo.branche,
            district: structureInfo.district
        };
        
        // Set user name in UI if element exists
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.nom;
        }
        
        // Hide UI elements based on permissions
        document.querySelectorAll('[data-permission]').forEach(element => {
            const requiredPermission = element.dataset.permission;
            if (!user.permissions || !user.permissions.includes(requiredPermission)) {
                element.style.display = 'none';
            }
        });
        
        // Update sidebar visibility based on user permissions
        updateSidebarVisibility(user.permissions);
        
        // Update profile photo if exists
        const profilePhoto = document.getElementById('profilePhoto');
        if (profilePhoto && user.photo_url) {
            profilePhoto.src = user.photo_url;
        }
        
        // Dispatch an event that other scripts can listen for
        const event = new CustomEvent('userDataReady', { detail: window.currentUser });
        document.dispatchEvent(event);
        
        return true;
    } catch (error) {
        console.error('Error initializing currentUser:', error);
        return false;
    }
} 