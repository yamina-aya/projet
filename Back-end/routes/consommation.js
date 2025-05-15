const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate} = require('./auth.middleware');



// Le prix du carburant
const PRICE_PER_LITER = 29.01;


router.get('/vehicles/by-driver',  (req, res) => {
    const chauffeurId = req.query.driverId;

    if (!chauffeurId) {
        return res.status(400).json({ error: 'ID du chauffeur requis' });
    }

    console.log(`🔍 Chauffeur sélectionné: ${chauffeurId}`);

    // Étape 1 : Récupérer le centre du chauffeur
    const centreQuery = `SELECT centre_id FROM chauffeurs WHERE id = ?`;

    db.query(centreQuery, [chauffeurId], (err, centreResults) => {
        if (err) {
            console.error('Erreur lors de la récupération du centre du chauffeur:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }

        if (centreResults.length === 0 || !centreResults[0].centre_id) {
            return res.status(404).json({ error: 'Chauffeur introuvable ou sans centre assigné' });
        }

        const centreId = centreResults[0].centre_id;

        // Étape 2 : Récupérer les véhicules de ce centre
        const vehicleQuery = `
             SELECT id,
                nom AS marque, 
                modele, 
                matricule AS immatriculation
    FROM vehicules 
    WHERE centre_id = ? 
    ORDER BY modele
        `;

        db.query(vehicleQuery, [centreId], (err, vehicleResults) => {
            if (err) {
                console.error('Erreur lors de la récupération des véhicules:', err);
                return res.status(500).json({ error: 'Erreur de base de données' });
            }

            res.json(vehicleResults);
        });
    });
});




// Endpoint pour récupérer les chauffeurs groupés par centre
router.get('/drivers/grouped-by-center', (req, res) => {
    try {
        const query = `
            SELECT 
                c.id as id,
                c.nom as nom
            FROM centers c
            ORDER BY c.nom
        `;
        
        db.query(query, (err, results) => {
            if (err) {
                console.error('Erreur lors de la récupération des centres:', err);
                return res.status(500).json({ error: 'Erreur de base de données' });
            }
            
            // Maintenant, récupérer tous les chauffeurs
            const driversQuery = `
                SELECT 
                    ch.id as id,
                    ch.nom_complet as nom,
                    ch.centre_id
                FROM chauffeurs ch
                ORDER BY ch.nom_complet
            `;
            
            db.query(driversQuery, (err, driversResults) => {
                if (err) {
                    console.error('Erreur lors de la récupération des chauffeurs:', err);
                    return res.status(500).json({ error: 'Erreur de base de données' });
                }
                
                // Organiser les chauffeurs par centre
                const centersWithDrivers = results.map(center => {
                    const driversInCenter = driversResults.filter(driver => driver.centre_id === center.id);
                    return {
                        id: center.id,
                        nom: center.nom,
                        chauffeurs: driversInCenter.map(driver => ({
                            id: driver.id,
                            nom: driver.nom
                        }))
                    };
                });
                
                res.json(centersWithDrivers);
            });
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des chauffeurs par centre:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


// Récupérer les bons disponibles pour consommation
// router.get('/bons/available',authenticate, async (req, res) => {
// try{

//     const centreId = req.query.centreId;
//     const chauffeurId = req.query.chauffeurId;
    
//     if (!centreId && req.admin) {
//         centreId = req.admin.centre_id;
//     }

//     if (!centreId) {
//         return res.status(400).json({ error: 'ID du centre requis' });
//     }
    
//     let query = `
//        SELECT 
//             b.id_bon,
//             b.type_bon,
//             b.statut_consommation,
//             a.date_attribution,
//             ch.id as chauffeur_id,
//             ch.nom_complet as chauffeur_nom
//         FROM bons b
//         JOIN attribution_detail ad ON b.id_bon = ad.id_bon
//         JOIN attribution a ON ad.id_attribution = a.id_attribution
//         JOIN chauffeurs ch ON a.id_chauffeur = ch.id
//         LEFT JOIN bon_consomme bc ON b.id_bon = bc.id_bon
//         WHERE a.id_centre = ?
//         AND b.statut_consommation = 'non consommé'
//         AND b.statut_disponibilite = 'attribué' 
//         AND bc.id_consommation IS NULL
//         `;
    
//     // const params = [centreId];
    
//     // if (chauffeurId && chauffeurId !== 'all') {
//     //     query += ` AND ch.id = ?`;
//     //     params.push(chauffeurId);
//     // }
    
//     // query += ` ORDER BY a.date_attribution DESC`;
    
//     // db.query(query, params, (err, results) => {
//     //     if (err) {
//     //         console.error('Erreur de base de données:', err);
//     //         return res.status(500).json({ error: 'Erreur de base de données' });
//     //     }
        
//     //     res.json(results);
//     // });

//     const [results] = await db.promise().query(query, [centreId, chauffeurId]);
        
//     res.json({
//         success: true,
//         data: results
//     });

// } catch (error) {
//     console.error('Database error:', error);
//     res.status(500).json({ error: 'Internal server error' });
// }

// });





// Récupérer les bons disponibles pour consommation

router.get('/consommations/bons/available',authenticate, (req, res) => {
    const centreId = req.query.centreId;
    const chauffeurId = req.query.chauffeurId;
    
    if (!centreId && req.admin) {
        centreId = req.admin.centre_id;
    }

    if (!centreId) {
        return res.status(400).json({ error: 'ID du centre requis' });
    }
    
    let query = `
       SELECT 
            b.id_bon,
            b.type_bon,
            b.statut_consommation,
            a.date_attribution,
            ch.id as chauffeur_id,
            ch.nom_complet as chauffeur_nom
        FROM bons b
        JOIN attribution_detail ad ON b.id_bon = ad.id_bon
        JOIN attribution a ON ad.id_attribution = a.id_attribution
        JOIN chauffeurs ch ON a.id_chauffeur = ch.id
        LEFT JOIN bon_consomme bc ON b.id_bon = bc.id_bon
        WHERE a.id_centre = ?
        AND b.statut_consommation = 'non consommé'
        AND b.statut_disponibilite = 'attribué' 
        AND bc.id_consommation IS NULL
        `;
    
    const params = [centreId];
    
    if (chauffeurId && chauffeurId !== 'all') {
        query += ` AND ch.id = ?`;
        params.push(chauffeurId);
    }
    
    query += ` ORDER BY a.date_attribution DESC`;
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Erreur de base de données:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        
        res.json(results);
    });
});




// Récupérer les consommations avec filtres
router.get('/consommations', (req, res) => {
    const { search, type, startDate, endDate } = req.query;
    
    // let query = `
    //     SELECT 
    //         c.id,
    //         c.type_consommation,
    //         c.date_consommation,
    //         c.quantite,
    //         a.nom as admin_nom,
    //         ct.nom as centre_nom
    //     FROM consommation c
    //     JOIN admin a ON c.id_admin = a.id
    //     JOIN centers ct ON c.id_centre = ct.id
    //     WHERE 1=1
    // `;

   
    
    let query = `
        SELECT 
            c.id,
            c.type_consommation,
            c.date_consommation,
            CASE 
                WHEN c.type_consommation = 'bon' THEN 
                    (SELECT b.type_bon FROM bons b WHERE b.id_bon = c.id_bon) / ${PRICE_PER_LITER}
                WHEN c.type_consommation = 'demande' THEN 
                    (SELECT d.quantite FROM demandes d WHERE d.id = c.id_demande)
                ELSE c.quantite 
            END as quantite,
            a.nom as admin_nom,
            ct.nom as centre_nom
        FROM consommation c
        JOIN admin a ON c.id_admin = a.id
        JOIN centers ct ON c.id_centre = ct.id
        WHERE 1=1
    `;
    
   
    
    const queryParams = [];
    
    if (search) {
        query += ` AND (c.id LIKE ? OR a.nom LIKE ? OR ct.nom LIKE ?)`;
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (type) {
        query += ` AND c.type_consommation = ?`;
        queryParams.push(type);
    }
    
    if (startDate) {
        query += ` AND c.date_consommation >= ?`;
        queryParams.push(startDate);
    }
    
    if (endDate) {
        query += ` AND c.date_consommation <= ?`;
        queryParams.push(endDate);
    }
    
    query += ` ORDER BY c.date_consommation DESC`;
    
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Erreur de base de données:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        
        res.json(results);
    });
});






// Récupérer les détails d'une consommation spécifique
router.get('/consommations/:id', (req, res) => {
    const consommationId = req.params.id;
    
    if (!consommationId) {
        return res.status(400).json({ error: 'ID de consommation requis' });
    }
    
    try {
        const query = `
        SELECT 
            c.*,
            a.nom as admin_nom,
            ct.nom as centre_nom,
            ch.nom_complet as chauffeur_nom,
            v.matricule as vehicule_immatriculation,
            v.modele as vehicule_modele,
            CASE 
                WHEN c.type_consommation = 'bon' THEN b.type_bon
                ELSE NULL 
            END as type_bon,
            CASE 
                WHEN c.type_consommation = 'demande' THEN d.quantite
                ELSE c.quantite 
            END as quantite
        FROM consommation c
        LEFT JOIN admin a ON c.id_admin = a.id
        LEFT JOIN centers ct ON c.id_centre = ct.id
        LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id
        LEFT JOIN vehicules v ON c.id_vehicule = v.id
        LEFT JOIN bons b ON c.id_bon = b.id_bon
        LEFT JOIN demandes d ON c.id_demande = d.id
        WHERE c.id = ?
    `;

    db.query(query, [consommationId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }

        if (!results || results.length === 0) {
            return res.status(404).json({ 
                error: 'Consumption not found',
                id: consommationId 
            });
        }

        // Format the result
        const consumption = results[0];
        const response = {
            id: consumption.id,
            date_consommation: consumption.date_consommation,
            type_consommation: consumption.type_consommation,
            quantite: consumption.quantite,
            admin_nom: consumption.admin_nom || 'N/A',
            centre_nom: consumption.centre_nom || 'N/A',
            chauffeur_nom: consumption.chauffeur_nom || 'N/A',
            vehicule_immatriculation: consumption.vehicule_immatriculation || 'N/A',
            vehicule_modele: consumption.vehicule_modele || 'N/A',
            type_bon: consumption.type_bon,
            reference_id: consumption.type_consommation === 'bon' ? 
                         consumption.id_bon : 
                         consumption.id_demande
        };

        res.json(response);
    });
    } catch (error) {
        console.error('Erreur lors de la récupération des détails de la consommation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});



// Créer une nouvelle consommation
router.post('/consommations/create', (req, res) => {
    const { 
        id_admin, 
        id_centre, 
        date_consommation, 
        type_consommation,
        id_chauffeur,
        id_vehicule,
        quantite,
        reference_id
    } = req.body;


     

    
    console.log('Received consommation data:', req.body);

    // Validation des champs requis
    if (!id_admin || !id_centre || !date_consommation || !type_consommation) {
        console.log('Missing required fields:', { id_admin, id_centre, date_consommation, type_consommation });
        return res.status(400).json({ 
            error: 'Missing required fields',
            details: 'id_admin, id_centre, date_consommation, and type_consommation are required'
        });
    }

     // If it's a demand consumption, validate the date
     if (type_consommation === 'demande') {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if demand is valid and matches consumption date
        const validateDemandQuery = `
            SELECT date_consommation, statut 
            FROM demandes 
        WHERE id = ?
            AND statut = 'valide'
            AND date_consommation = ?
        `;

        db.query(validateDemandQuery, [reference_id, today], (err, results) => {
            if (err) {
                console.error('Error validating demand:', err);
                return res.status(500).json({ 
                    error: 'Database error', 
                    details: err.message 
                });
            }

            if (results.length === 0) {
                return res.status(400).json({ 
                    error: 'Invalid demand',
                    details: 'Demand is either expired, already consumed, or not valid for today\'s date'
                });
            }
        });
    }   
    
    // Validation spécifique selon le type de consommation
    if (type_consommation === 'direct' && (!quantite || quantite <= 0)) {
        return res.status(400).json({ 
            error: 'Invalid quantity',
            details: 'Quantity is required and must be positive for direct consumption'
        });
    }

    
    if ((type_consommation === 'demande' || type_consommation === 'bon') && !reference_id) {
        return res.status(400).json({ 
            error: 'Missing reference',
            details: 'reference_id is required for demande and bon type consumption'
        });
    }


     // Définir les valeurs pour id_demande et id_bon en fonction du type
     const id_demande = type_consommation === 'demande' ? reference_id : null;
     const id_bon = type_consommation === 'bon' ? reference_id : null;
     
    
    // Préparer les paramètres
    const consommationParams = [
        id_admin,
        id_centre,
        date_consommation,
        type_consommation,
        id_chauffeur || null,
        id_vehicule || null,
        type_consommation === 'direct' ? quantite : null,
        id_demande,
        id_bon];
    
    // Requête d'insertion
    const insertConsommation = `
        INSERT INTO consommation (
            id_admin, 
            id_centre, 
            date_consommation, 
            type_consommation, 
            id_chauffeur, 
            id_vehicule, 
            quantite, 
           id_demande,
           id_bon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Commencer une transaction
    db.beginTransaction(err => {
        if (err) {
            console.error('Erreur début transaction:', err);
            return res.status(500).json({ error: 'Erreur de transaction' });
        }
        
        // Insérer la consommation
        db.query(insertConsommation, consommationParams, (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Erreur insertion consommation:', err);
                    res.status(500).json({ error: 'Erreur de base de données' });
                });
            }
            
            const consommationId = result.insertId;
            
            // Traitement spécifique selon le type
            if (type_consommation === 'demande') {
                // Mettre à jour le statut de la demande
                const updateDemande = `UPDATE demandes SET statut = 'utilise' WHERE id = ?`;
                db.query(updateDemande, [reference_id], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Erreur mise à jour demande:', err);
                            res.status(500).json({ error: 'Erreur de base de données' });
                        });
                    }
                    
                    db.commit(err => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Erreur commit transaction:', err);
                                res.status(500).json({ error: 'Erreur de transaction' });
                            });
                        }
                        
                        res.status(201).json({ 
                            id: consommationId,
                            message: 'Consommation créée avec succès' 
                        });
                    });
                });
            } else if (type_consommation === 'bon') {
                // Mettre à jour le statut du bon
                const updateBon = `UPDATE bons SET statut_consommation = 'consommé' WHERE id_bon = ?`;
                db.query(updateBon, [reference_id], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Erreur mise à jour bon:', err);
                            res.status(500).json({ error: 'Erreur de base de données' });
                        });
                    }
                    
                    db.commit(err => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Erreur commit transaction:', err);
                                res.status(500).json({ error: 'Erreur de transaction' });
                            });
                        }
                        
                        res.status(201).json({ 
                            id: consommationId,
                            message: 'Consommation créée avec succès' 
                        });
                    });
                });
            } else {
                // Type direct, pas de traitement supplémentaire
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Erreur commit transaction:', err);
                            res.status(500).json({ error: 'Erreur de transaction' });
                        });
                    }
                    
                    res.status(201).json({ 
                        id: consommationId,
                        message: 'Consommation créée avec succès' 
                    });
                });
            }
        });
    });
});

router.get('/demandes/available', (req, res) => {
    const centerId = req.query.centerId;
    const driverId = req.query.driverId;
    const vehicleId = req.query.vehicleId;

    console.log('Debug - Request params:', { centerId, driverId, vehicleId });

    // Get today's date at midnight UTC
    const now = new Date();
    const utcToday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    )).toISOString().split('T')[0];

    console.log('Debug - Server date:', {
        rawDate: now,
        utcToday: utcToday,
        timezone: 'UTC'
    });

    const query = `
        SELECT 
            d.id,
            d.quantite,
            d.date_creation,
            d.date_consommation,
            d.statut,
            ch.nom_complet as chauffeur_nom,
            v.nom as vehicule_marque,
            v.modele as vehicule_modele,
            v.matricule as vehicule_immatriculation
        FROM demandes d
        JOIN chauffeurs ch ON d.chauffeur_id = ch.id
        JOIN vehicules v ON d.vehicule_id = v.id
        WHERE d.statut = 'valide'
        AND d.centre_recepteur_id = ?
        AND d.chauffeur_id = ?
        AND d.vehicule_id = ?
        AND DATE(d.date_consommation) = ?
        AND NOT EXISTS (
            SELECT 1 
            FROM demande_consomme dc 
            WHERE dc.id_demande = d.id
        )
        ORDER BY d.date_creation DESC`;

    const queryParams = [centerId, driverId, vehicleId, utcToday];

    console.log('Debug - Query params:', queryParams);

    try {
        db.query(query, queryParams, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    error: 'Database error',
                    details: err.message 
                });
            }

            console.log('Debug - Query results:', {
                count: results.length,
                date: utcToday,
                results: results
            });

            res.json(results || []);
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
});






module.exports = router;