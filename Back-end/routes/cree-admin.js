const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { authenticate, checkPermissions } = require('./auth.middleware');

// Create admin route
router.post('/admin/create', authenticate, checkPermissions(['créer_admin']), async (req, res) => {
    const { 
        nom,
        email, 
        mot_de_passe,
        role, 
        permissions, 
        centre_id,
        district_id,
        branche_id
    } = req.body;

    // Validation des données
    if (!nom || !email || !mot_de_passe || !role) {
        return res.status(400).json({ 
            message: 'Tous les champs obligatoires doivent être remplis' 
        });
    }

    // Validation du rôle
    const roles_valides = [
        'Administrateur Centre',
        'Administrateur Branche',
        'Administrateur District'
    ];
    if (!roles_valides.includes(role)) {
        return res.status(400).json({ message: 'Rôle invalide' });
    }

    // Validation des permissions
    const permissions_valides = [
        'créer_admin',
        'consultation',
        'envoyer_demande',
        'attribuer_bons',
        'remplir_formulaire_consommation'
    ];
    if (permissions && !permissions.every(p => permissions_valides.includes(p))) {
        return res.status(400).json({ message: 'Permissions invalides' });
    }

    try {
        // Vérifier si l'email existe déjà
        const [existingUser] = await db.promise().query(
            'SELECT id FROM admin WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ 
                message: 'Cet email est déjà utilisé' 
            });
        }

        // Crypter le mot de passe
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

        // Insérer le nouvel administrateur
        const query = `
            INSERT INTO admin (
                nom,
                email, 
                mot_de_passe,
                role, 
                permissions,
                centre_id,
                district_id,
                branche_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.promise().query(query, [
            nom,
                email, 
                hashedPassword, 
                role, 
            permissions ? permissions.join(',') : null,
            centre_id || null,
                district_id || null,
            branche_id || null
        ]);

        res.status(201).json({
            message: 'Administrateur créé avec succès',
            adminId: result.insertId
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'administrateur:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la création de l\'administrateur' 
        });
    }

});

// Get structures route
router.get('/structures/centres', authenticate, async (req, res) => {
    try {
        const [centres] = await db.promise().query('SELECT id, nom, localisation FROM centers');
        res.json({ data: centres });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des centres' });
    }
});

router.get('/structures/branches', authenticate, async (req, res) => {
    try {
        const [branches] = await db.promise().query('SELECT id, nom, localisation FROM branches');
        res.json({ data: branches });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des branches' });
    }
});

router.get('/structures/districts', authenticate, async (req, res) => {
    try {
        const [districts] = await db.promise().query('SELECT id, nom, localisation FROM districts');
        res.json({ data: districts });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des districts' });
    }
});

module.exports = router;





