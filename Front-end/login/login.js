document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const forgotPasswordLink = document.getElementById('forgotPassword');

    // Check if we were redirected from logout
    const wasLoggedOut = !localStorage.getItem('auth_token');

    // Show notification if logged out
    if (wasLoggedOut) {
        showNotification('Vous avez été déconnecté avec succès', 'info');
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

    // Toggle pour afficher/masquer le mot de passe
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Changer l'icône
        this.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });

    // Gestion du formulaire de connexion
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;
            
            try {
                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password, rememberMe })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Erreur lors de la connexion');
}
                
                console.log("Login response:", data);
                console.log("User permissions:", data.user.permissions);
                
                // Ensure user has permissions array
                if (!data.user.permissions) {
                    console.warn("User doesn't have permissions, adding emptynew Error(data.error || 'Erreur lors de la connexion");
                }
                
                console.log("Login response:", data);
                console.log("User permissions:", data.user.permissions);
                
                // Ensure user has permissions array
                if (!data.user.permissions) {
                    console.warn("User doesn't have permissions, adding empty array");
                  
                    data.user.permissions = [];
 new Error(data.error || 'Erreur lors de la connexion');
                }
                
                console.log("Login response:", data);
                console.log("User permissions:", data.user.permissions);
                
                // Ensure user has permissions array
                if (!data.user.permissions) {
                    console.warn("User doesn't have permissions, adding empty array");
                }
                
                // Stocker les informations de l'utilisateur et le token
                
                console.log("Login response:", data);
                console.log("User permissions:", data.user.permissions);
                
                // Ensure user has permissions array
                if (!data.user.permissions) {
                    console.warn("User doesn't have permissions, adding empty array");
                  
                    data.user.permissions = [];
 new Error(data.error || 'Erreur lors de la connexion');
                }
                
                console.log("Login response:", data);
                console.log("User permissions:", data.user.permissions);
                
                // Ensure user has permissions array
                if (!data.user.permissions) {
                    console.warn("User doesn't have permissions, adding empty array");
                }
                
                // Stocker les informations de l'utilisateur et le token

           localStorage.setItem('user_info', JSON.stringify(data.user));
                
                // Afficher le message de succès et rediriger
             showNotification('Connexion réussie. Redirection...', 'success');
                
                // Rediriger vers la page d'accueil après un court délai
                setTimeout(() => {
                    window.location.href = '../profile/profil.html';
                }, 1500);
            
        } catch (error) {
            console.error('Erreur de connexion:', error);
            showNotification(error.message || 'Identifiants incorrects', 'error');
        }
    });

    // Gestion du lien "Mot de passe oublié"
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        
        if (!email) {
            showNotification('Veuillez entrer votre email avant de réinitialiser le mot de passe', 'error');
            return;
        }
        
        // Implémenter la logique de réinitialisation du mot de passe
        showNotification('Un email de réinitialisation a été envoyé à votre adresse si elle existe dans notre système', 'info');
    });
    }}
});