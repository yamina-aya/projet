const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./Back-end/config/db');
const path = require('path');
// require('dotenv').config(); // Load environment variables from .env file  

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use(express.static('Front-end'));
app.use('/uploads', express.static(path.join(__dirname, 'Back-end/uploads')));
app.use('/icon', express.static(path.join(__dirname, 'Front-end/icon')));

// Add a default route for the root path
app.get('/', (req, res) => {
    res.redirect('/profile/profil.html');
});

// authentication middleware
// Authentication endpoints
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable in production

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const query = `
      SELECT 
        a.id, 
        a.nom, 
        a.email, 
        a.role, 
        a.mot_de_passe, 
        a.permissions, 
        a.photo_url,
        a.centre_id,
        c.nom as nom_centre,
        c.localisation as localisation_centre,
        d.id as district_id,
        d.nom as nom_district,
        d.localisation as localisation_district,
        b.id as branche_id,
        b.nom as nom_branche,
        b.localisation as localisation_branche
      FROM admin a
      LEFT JOIN centers c ON a.centre_id = c.id
      LEFT JOIN districts d ON c.district_id = d.id
      LEFT JOIN branches b ON d.branche_id = b.id
      WHERE email = ?
    `;
    
    db.query(query, [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      const admin = results[0];
      console.log('Retrieved admin data:', admin);
      
      // Verify password
      const isMatch = await bcrypt.compare(password, admin.mot_de_passe);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Parse permissions
      let permissions = [];
      if (admin.permissions) {
        permissions = admin.permissions.split(',').map(p => p.trim());
      }
      
      // Process structure data
      const structure = {
        centre: admin.nom_centre ? {
          id: admin.centre_id,
          nom: admin.nom_centre,
          localisation: admin.localisation_centre
        } : null,
        district: admin.nom_district ? {
          id: admin.district_id,
          nom: admin.nom_district,
          localisation: admin.localisation_district
        } : null,
        branche: admin.nom_branche ? {
          id: admin.branche_id,
          nom: admin.nom_branche,
          localisation: admin.localisation_branche
        } : null
      };
      
      console.log('Processed structure data:', structure);
      
      // Create token
      const token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          permissions: permissions,
          centre_id: admin.centre_id,
          district_id: admin.district_id,
          branche_id: admin.branche_id
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Prepare user data for response
      const userData = {
        id: admin.id,
        nom: admin.nom,
        email: admin.email,
        role: admin.role,
        permissions: permissions,
        photo_url: admin.photo_url,
        structure: structure
      };
      
      console.log('Sending user data to client:', userData);
      
      res.json({
        message: 'Login successful',
        token,
        user: userData
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Check permissions middleware
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    next();
  };
};

// Endpoint to verify token validity
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.status(200).json({ valid: true, user: req.user });
});


app.use('/api', (req, res, next) => {
  // console.log('API Request:', req.method, req.path);
 // console.log('Auth header:', req.headers.authorization);
  next();
});






// app.use('/api', (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   console.log('Auth header:', authHeader);

//   if (!authHeader) {
//       return res.status(401).json({ message: 'No authorization header' });
//   }

//   const token = authHeader.split(' ')[1];
//   if (!token) {
//       return res.status(401).json({ message: 'No token provided' });
//   }

//   try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = decoded;
//       next();
//   } catch (error) {
//       console.error('Token verification failed:', error);
//       return res.status(401).json({ message: 'Invalid token' });
//   }
// });




// Import routes
 const profileRoutes = require('./Back-end/routes/profile');
 const adminRoutes = require('./Back-end/routes/cree-admin');
 const bonRoutes = require('./Back-end/routes/bon');
 const demandeRoutes = require('./Back-end/routes/demand');
 const consommationRoutes = require('./Back-end/routes/consommation');
 const bonDashboardRoutes = require('./Back-end/routes/bonDashboardRoutes');
 const demandDashboardRoutes = require('./Back-end/routes/demandDashboardRoutes')
 const directDashboardRoutes = require('./Back-end/routes/DirectDashboardRoutes');
 const cardsDashboardRoutes = require('./Back-end/routes/CardsDashboardRoutes');
//  const generalDashboardRoutes = require('./Back-end/routes/GeneralDashboardRoutes');




// Mount routes
 app.use('/api', profileRoutes);
 app.use('/api', adminRoutes);
 app.use('/api', bonRoutes);
 app.use('/api', demandeRoutes);
 app.use('/api', consommationRoutes);
 app.use('/api/dashboard/bon', bonDashboardRoutes(db));
 app.use('/api/dashboard/demand', demandDashboardRoutes(db));
 app.use('/api/dashboard/direct', directDashboardRoutes(db));
 app.use('/api/dashboard/cards', cardsDashboardRoutes(db));
//  app.use('/api/dashboard/general', generalDashboardRoutes(db));
app.use('/api/dashboard/summary', require('./Back-end/routes/summery')(db));




 app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});






// Start the server
const PORT =  3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
   
});