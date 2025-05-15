// api.js - Utility for making API requests with authentication

const BACKEND_URL = 'http://localhost:3000';

const api = {
    request: async function(url, options = {}) {
      // Add auth token to headers if available
      const token = Auth.getToken();
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const config = {
        ...options,
        headers
      };
      
      try {
        const response = await fetch(url, config);
        
        // Handle session expiration
        if (response.status === 401 || response.status === 403) {
          console.warn('Authentication error:', response.status);
          Auth.logout();
          return;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'API request failed');
        }
        
        return data;
      } catch (error) {
        console.error('API request error:', error);
        throw error;
      }
    },
    
    get: function(url) {
      return this.request(url, { method: 'GET' });
    },
    
    post: function(url, body) {
      return this.request(url, { 
        method: 'POST',
        body: JSON.stringify(body)
      });
    },
    
    put: function(url, body) {
      return this.request(url, { 
        method: 'PUT',
        body: JSON.stringify(body)
      });
    },
    
    delete: function(url) {
      return this.request(url, { method: 'DELETE' });
    },
    
    // Method to verify token with server
    verifyToken: async function() {
      try {
        const token = Auth.getToken();
        if (!token) return false;
        
        const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        return response.ok;
      } catch (error) {
        console.error('Token verification error:', error);
        return false;
      }
    }
  };