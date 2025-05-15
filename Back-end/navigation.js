// navigation.js - Permission-based navigation

document.addEventListener('DOMContentLoaded', function() {
    const user = Auth.getCurrentUser();
    
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '../front-end/login/login.html';
      return;
    }
    
    // Setup navigation based on permissions
    const navContainer = document.getElementById('main-navigation');
    
    // Everyone can access profile
    navContainer.innerHTML = `
      <li class="nav-item">
        <a href="profil.html" class="nav-link">Profil</a>
      </li>
    `;
    
    // Create admin page - requires 'creer_admin' permission
    if (Auth.hasPermission('creer_admin')) {
      navContainer.innerHTML += `
        <li class="nav-item">
          <a href="admin.html" class="nav-link">Gestion des administrateurs</a>
        </li>
      `;
    }
    
    // Bons page - requires 'attribuer_bons' permission
    if (Auth.hasPermission('attribuer_bons')) {
      navContainer.innerHTML += `
        <li class="nav-item">
          <a href="bons.html" class="nav-link">Gestion des bons</a>
        </li>
      `;
    }
    
    // Demande page - requires 'envoyer_demande' permission
    if (Auth.hasPermission('envoyer_demande')) {
      navContainer.innerHTML += `
        <li class="nav-item">
          <a href="demandes.html" class="nav-link">Gestion des demandes</a>
        </li>
      `;
    }
    
    // Consommation page - requires 'remplir_formulaire_consommation' permission
    if (Auth.hasPermission('remplir_formulaire_consommation')) {
      navContainer.innerHTML += `
        <li class="nav-item">
          <a href="consommation.html" class="nav-link">Formulaire de consommation</a>
        </li>
      `;
    }
    
    // Dashboard page - requires 'consultation' permission
    if (Auth.hasPermission('consultation')) {
      navContainer.innerHTML += `
        <li class="nav-item">
          <a href="profil.html" class="nav-link">Profil</a>
        </li>
      `;
    }
    
    // Add logout button
    navContainer.innerHTML += `
      <li class="nav-item">
        <button id="logout-btn" class="btn btn-outline">Déconnexion</button>
      </li>
    `;
    
    // Setup logout handler
    document.getElementById('logout-btn').addEventListener('click', function() {
      Auth.logout();
    });
  });