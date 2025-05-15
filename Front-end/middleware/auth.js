// auth.js - Authentication service

// Store auth token in localStorage
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';
const BACKEND_URL = 'http://localhost:3000';

const PATHS = {
  LOGIN: '../login/login.html',
  PROFILE: '../profile/profil.html'
};

// For development - set mock token and user
// Set to false to disable mock data in production
const USE_MOCK_DATA = false;

if (USE_MOCK_DATA) {
  localStorage.setItem(TOKEN_KEY, 'mock_token_for_development');
  localStorage.setItem(USER_KEY, JSON.stringify({
    id: 1,
    nom: 'Developer',
    email: 'dev@test.com',
    permissions: ['consultation', 'creer_admin', 'envoyer_demande', 'attribuer_bons', 'remplir_formulaire_consommation'],
    structure: {
      centre: { id: 1, nom: 'Test Centre' },
      district: { id: 1, nom: 'Test District' },
      branche: { id: 1, nom: 'Test Branche' }
    }
  }));
}

// Authentication functions
const Auth = {
  login: async (email, password) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      // Save token and user data
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: () => {
    // Clear all authentication-related data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('sidebarCollapsed');
    
    // Redirect to login page
    window.location.href = PATHS.LOGIN;
  },
  
  getCurrentUser: () => {
    const userData = localStorage.getItem(USER_KEY);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      Auth.logout(); // Clear invalid data and redirect
      return null;
    }
  },
  
  isAuthenticated: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    
    if (!token || !user) {
      return false;
    }
    
    try {
      // Check if user data is valid JSON
      JSON.parse(user);
      return true;
    } catch (error) {
      console.error('Invalid user data in localStorage');
      Auth.logout(); // Clear invalid data and redirect
      return false;
    }
  },
  
  getToken: () => localStorage.getItem(TOKEN_KEY),
  
  hasPermission: (permission) => {
    const user = Auth.getCurrentUser();
    if (!user || !user.permissions) return false;
    
    return user.permissions.includes(permission);
  },
  
  // Check if session is valid by making a request to the server
  checkSession: async () => {
    try {
      if (!Auth.isAuthenticated()) {
        return false;
      }
      
      // Skip token validation in development mock mode
      if (USE_MOCK_DATA) {
        return true;
      }
      
      // We'll use the api.verifyToken method once it's loaded
      // For now, make a direct fetch request
      const token = Auth.getToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.warn('Session invalid, logging out');
        Auth.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Session check error:', error);
      return false;
    }
  }
};

// Set up logout button and session validation
document.addEventListener('DOMContentLoaded', () => {
  // Skip session check on login page
  if (window.location.pathname.includes('login.html')) {
    return;
  }
  
  // Check authentication status
  if (!Auth.isAuthenticated()) {
    Auth.logout();
    return;
  }
  
  // Set up logout buttons
  const logoutBtns = document.querySelectorAll('#logoutBtn, .logout-btn');
  logoutBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }
  });
  
  // Periodically check session validity - skip in mock data mode
  if (!USE_MOCK_DATA) {
    setInterval(async () => {
      const isSessionValid = await Auth.checkSession();
      if (!isSessionValid && !window.location.pathname.includes('login.html')) {
        alert('Your session has expired. Please log in again.');
        Auth.logout();
      }
    }, 300000); // Check every 5 minutes
  }
});