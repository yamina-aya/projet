const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { authenticate } = require('./auth.middleware');


// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../Back-end/uploads/'))
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });




// Get profile information
router.get('/profile/:id',authenticate, async (req, res) => {
    const adminId = req.params.id;
    const query = `
        SELECT 
            a.id, 
            a.nom, 
            a.email, 
            a.role, 
            a.permissions,
            a.photo_url,
            a.centre_id,
            c.nom as nom_centre,
            c.localisation as localisation_centre,
            d.nom as nom_district,
            d.localisation as localisation_district,
            b.nom as nom_branche,
            b.localisation as localisation_branche
        FROM admin a
        LEFT JOIN centers c ON a.centre_id = c.id
        LEFT JOIN districts d ON c.district_id = d.id
        LEFT JOIN branches b ON d.branche_id = b.id
        WHERE a.id = ?
    `;
    
    db.query(query, [adminId], (err, results) => {
        if (err) {
            console.error('Erreur de base de données:', err);
            res.status(500).json({ erreur: 'Erreur de base de données' });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ erreur: 'Administrateur non trouvé' });
            return;
        }

        const admin = results[0];
        console.log('Données admin brutes:', admin);

        // Gestion des permissions
        if (admin.permissions) {
            admin.permissions = admin.permissions.split(',').map(p => p.trim());
        } else {
            admin.permissions = [];
        }

        // Structurer les informations de localisation
        admin.structure = {
            centre: admin.nom_centre ? {
                id: admin.centre_id,
                nom: admin.nom_centre,
                localisation: admin.localisation_centre
            } : null,
            district: admin.nom_district ? {
                nom: admin.nom_district,
                localisation: admin.localisation_district
            } : null,
            branche: admin.nom_branche ? {
                nom: admin.nom_branche,
                localisation: admin.localisation_branche
            } : null
        };

        // Nettoyer les données avant l'envoi
        delete admin.nom_centre;
        delete admin.localisation_centre;
        delete admin.nom_district;
        delete admin.localisation_district;
        delete admin.nom_branche;
        delete admin.localisation_branche;

        console.log('Données admin traitées:', admin);
        res.json(admin);
    });
});

// Update profile information
router.put('/profile/:id', authenticate, async(req, res) => {
    const adminId = req.params.id;
    const { nom, email, role, permissions } = req.body;
    
    // Valider le rôle
    const rolesValides = ['Administrateur Centre', 'Administrateur Branche', 'Administrateur District'];
    if (role && !rolesValides.includes(role)) {
        res.status(400).json({ erreur: 'Rôle invalide' });
        return;
    }

    // Valider les permissions
    const permissionsValides = [
        'creer_admin',
        'consultation',
        'envoyer_demande',
        'attribuer_bons',
        'remplir_formulaire_consommation'
    ];
    if (permissions) {
        const permissionsInvalides = permissions.filter(p => !permissionsValides.includes(p));
        if (permissionsInvalides.length > 0) {
            res.status(400).json({ erreur: 'Permissions invalides' });
            return;
        }
    }

    // Construire la requête dynamiquement
    let champsMAJ = [];
    let paramsRequete = [];
    
    if (nom) {
        champsMAJ.push('nom = ?');
        paramsRequete.push(nom);
    }
    if (email) {
        champsMAJ.push('email = ?');
        paramsRequete.push(email);
    }
    if (role) {
        champsMAJ.push('role = ?');
        paramsRequete.push(role);
    }
    if (permissions) {
        champsMAJ.push('permissions = ?');
        paramsRequete.push(permissions.join(','));
    }
    
    paramsRequete.push(adminId);
    
    const query = `UPDATE admin SET ${champsMAJ.join(', ')} WHERE id = ?`;
    
    db.query(query, paramsRequete, (err, result) => {
        if (err) {
            console.error('Erreur de base de données:', err);
            res.status(500).json({ erreur: 'Erreur de base de données' });
            return;
        }
        res.json({ message: 'Profil mis à jour avec succès' });
    });
});

// // Change password
// router.post('/profile/:id/mot-de-passe',authenticate, async (req, res) => {
//     const adminId = req.params.id;
//     const { motDePasseActuel, nouveauMotDePasse } = req.body;
    
//     const query = 'SELECT mot_de_passe FROM admin WHERE id = ?';
//     db.query(query, [adminId], async (err, results) => {
//         if (err || results.length === 0) {
//             res.status(500).json({ erreur: 'Erreur de base de données' });
//             return;
//         }
        
//         const match = await bcrypt.compare(motDePasseActuel, results[0].mot_de_passe);
//         if (!match) {
//             res.status(401).json({ erreur: 'Mot de passe actuel incorrect' });
//             return;
//         }
        
//         const motDePasseHash = await bcrypt.hash(nouveauMotDePasse, 10);
//         const updateQuery = 'UPDATE admin SET mot_de_passe = ? WHERE id = ?';
        
//         db.query(updateQuery, [motDePasseHash, adminId], (err, result) => {
//             if (err) {
//                 res.status(500).json({ erreur: 'Erreur de base de données' });
//                 return;
//             }
//             res.json({ message: 'Mot de passe mis à jour avec succès' });
//         });
//     });
// });

// Add password change route
router.post('/profile/:id/mot-de-passe', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const adminId = req.params.id;

        // Verify current password
        const [admin] = await db.promise().query(
            'SELECT mot_de_passe FROM admin WHERE id = ?',
            [adminId]
        );

        if (!admin.length) {
            return res.status(404).json({ message: 'Administrateur non trouvé' });
        }

        const passwordMatch = await bcrypt.compare(currentPassword, admin[0].mot_de_passe);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.promise().query(
            'UPDATE admin SET mot_de_passe = ? WHERE id = ?',
            [hashedPassword, adminId]
        );

        res.json({ message: 'Mot de passe mis à jour avec succès' });
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});






// Add photo upload endpoint
// router.post('/api/profil/:id/photo', upload.single('photo'), (req, res) => {
    router.post('/profile/:id/photo', authenticate, upload.single('photo'), (req, res) => {
    const adminId = req.params.id;
    
    if (!req.file) {
        return res.status(400).json({ erreur: 'Aucun fichier téléchargé' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    
    const query = 'UPDATE admin SET photo_url = ? WHERE id = ?';
    db.query(query, [photoUrl, adminId], (err, result) => {
        if (err) {
            console.error('Erreur de base de données:', err);
            res.status(500).json({ erreur: 'Erreur de base de données' });
            return;
        }
        res.json({ message: 'Photo mise à jour avec succès', photoUrl });
    });
});

module.exports = router;