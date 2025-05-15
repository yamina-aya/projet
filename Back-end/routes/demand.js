const express = require('express');
const router = express.Router();
const db = require('../config/db');






// Get all centers
router.get('/centers', (req, res) => {
    const query = `
        SELECT * FROM centers 
        ORDER BY nom
        LIMIT 50
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ data: results });
    });
});




// Route pour obtenir les chauffeurs
router.get('/drivers/centre/:centreId', (req, res) => {
    const centreId = req.params.centreId;
    //console.log('Requête reçue pour les chauffeurs du centre:', centreId);

    const query = `
        SELECT c.id, c.nom_complet, c.telephone
        FROM chauffeurs c
        WHERE c.centre_id = ?
       
    `;

    db.query(query, [centreId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des chauffeurs:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }

        //console.log(`${results.length} chauffeurs trouvés`);
        res.json({ success: true, data: results });
    });
}); 




// Get all vehicles (vehicules)
router.get('/vehicles', (req, res) => {
    // Get center ID from query params
    const centerId = req.query.centerId;
    
    let query = `
        SELECT * FROM vehicules 
    `;
    
    const queryParams = [];
    
    // Filter by center if centerId is provided
    if (centerId && centerId !== 'undefined' && centerId !== '') {
        query += `WHERE centre_id = ? `;
        queryParams.push(centerId);
        //console.log(`Filtering vehicles by center_id: ${centerId}`);
    } else {
        //console.log('No center filter applied for vehicles');
    }
    
    query += `ORDER BY nom LIMIT 50`;
    
    //console.log('Executing vehicles query:', query);
    //console.log('Query parameters:', queryParams);
    
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        //console.log(`Found ${results.length} vehicles`);
        res.json({ data: results });
    });
});








router.post('/demand/create', async (req, res) => {
    const { 
        centre_recepteur_id,
        chauffeur_id,
        vehicule_id,
        date_consommation,
        quantite,
        admin_id 
    } = req.body;

    try {
        // Get admin's center
        const centerQuery = 'SELECT centre_id FROM admin WHERE id = ?';
        db.query(centerQuery, [admin_id], (err, results) => {
            if (err || results.length === 0) {
                res.status(500).json({ error: 'Error getting admin center' });
                return;
            }

            const centre_actuel_id = results[0].centre_id;

            const query = `
                INSERT INTO demandes (
                    centre_actuel_id,
                    centre_recepteur_id,
                    admin_id,
                    chauffeur_id,
                    vehicule_id,
                    date_consommation,
                    quantite,
                    statut
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'valide')
            `;

            db.query(
                query,
                [
                    centre_actuel_id,
                    centre_recepteur_id,
                    admin_id,
                    chauffeur_id,
                    vehicule_id,
                    date_consommation,
                    quantite
                ],
                (err, result) => {
                    if (err) {
                        console.error('Database error:', err);
                        res.status(500).json({ error: 'Error creating demand' });
                        return;
                    }
                    res.json({ 
                        message: 'Demand created successfully',
                        demandId: result.insertId
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error creating demand:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// Get demands with filters
router.get('/demands', (req, res) => {
    const { type, userId, status, startDate, endDate, search } = req.query;

    //console.log('Received request for demands with params:', req.query);

    // D'abord, récupérer le centre_id de l'utilisateur
    const userQuery = 'SELECT centre_id FROM admin WHERE id = ?';
    
    //console.log('Executing user query:', userQuery, 'with userId:', userId);
    
    db.query(userQuery, [userId], (userErr, userResults) => {
        if (userErr) {
            console.error('Error getting user center_id:', userErr);
            return res.status(500).json({ 
                error: 'Database error', 
                details: userErr.message,
                step: 'getting user center_id'
            });
        }

        if (!userResults || userResults.length === 0) {
            console.error('No user found with ID:', userId);
            return res.status(404).json({ 
                error: 'User not found',
                userId: userId
            });
        }

        const centerId = userResults[0].centre_id;
        //console.log('Found center_id:', centerId, 'for user:', userId);
    
    let query = `
        SELECT 
            d.*,
                ac.nom as actual_center,
                rc.nom as receiving_center,
                ch.nom_complet as driver_name,
                ch.telephone as driver_phone,
                v.nom as vehicle_name,
            v.matricule as vehicle_matricule,
                a.nom as admin_name,
                a.role as admin_role,
                a.email as admin_email
            FROM demandes d
            JOIN centers ac ON d.centre_actuel_id = ac.id
            JOIN centers rc ON d.centre_recepteur_id = rc.id
            JOIN chauffeurs ch ON d.chauffeur_id = ch.id
            JOIN vehicules v ON d.vehicule_id = v.id
            JOIN admin a ON d.admin_id = a.id
        WHERE 1=1
    `;
    
    const queryParams = [];
    
        // Filtre par type (envoyées ou reçues)
        if (type === 'sent') {
            query += ' AND d.centre_actuel_id = ?';
            queryParams.push(centerId);
        } else if (type === 'received') {
            query += ' AND d.centre_recepteur_id = ?';
            queryParams.push(centerId);
        }
        
        // Filtre par statut
        if (status && status.trim() !== '') {
            query += ' AND d.statut = ?';
            queryParams.push(status);
        }
        
        // Filtre par date
        if (startDate && endDate) {
            query += ' AND DATE(d.date_creation) BETWEEN ? AND ?';
            queryParams.push(startDate, endDate);
        }
        
        // Filtre par recherche
        if (search && search.trim() !== '') {
            query += ` AND (
                ac.nom LIKE ? OR 
                rc.nom LIKE ? OR 
                ch.nom_complet LIKE ? OR
                v.nom LIKE ? OR 
                v.matricule LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        // Tri par date décroissante
        query += ' ORDER BY d.date_creation DESC';
        
        //console.log('Executing demands query:', query);
        //console.log('Query parameters:', queryParams);
        
        db.query(query, queryParams, (err, results) => {
            if (err) {
                console.error('Error executing demands query:', err);
                return res.status(500).json({ 
                    error: 'Database error', 
                    details: err.message,
                    step: 'getting demands'
                });
            }

            //console.log(`Found ${results.length} demands`);
            res.json({ data: results });
        });
    });
});

// Get demand details
router.get('/demands/:id', (req, res) => {
    const demandId = req.params.id;
    
    //console.log('Fetching details for demand:', demandId);
    
    // Simplified query that doesn't rely on all relationships being present
    const query = `
        SELECT 
            d.*,
            ac.nom as actual_center,
            ac.localisation as actual_center_location,
            acd.nom as actual_center_district,
            acb.nom as actual_center_branch,
            rc.nom as receiving_center,
            rc.localisation as receiving_center_location,
            rcd.nom as receiving_center_district,
            rcb.nom as receiving_center_branch,
            ch.nom_complet as driver_name,
            ch.telephone as driver_phone,
            v.nom as vehicle_name,
            v.matricule as vehicle_matricule,
            v.modele as vehicle_model,
            a.nom as admin_name,
            a.role as admin_role,
            a.email as admin_email
        FROM demandes d
        LEFT JOIN centers ac ON d.centre_actuel_id = ac.id
        LEFT JOIN districts acd ON ac.district_id = acd.id
        LEFT JOIN branches acb ON acd.branche_id = acb.id
        LEFT JOIN centers rc ON d.centre_recepteur_id = rc.id
        LEFT JOIN districts rcd ON rc.district_id = rcd.id
        LEFT JOIN branches rcb ON rcd.branche_id = rcb.id
        LEFT JOIN chauffeurs ch ON d.chauffeur_id = ch.id
        LEFT JOIN vehicules v ON d.vehicule_id = v.id
        LEFT JOIN admin a ON d.admin_id = a.id
        WHERE d.id = ?
    `;
    
    //console.log('Executing query:', query);
    //console.log('With parameters:', [demandId]);
    
    db.query(query, [demandId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            console.error('Error details:', {
                code: err.code,
                errno: err.errno,
                sqlMessage: err.sqlMessage,
                sqlState: err.sqlState
            });
            res.status(500).json({ error: 'Database error', details: err.message });
            return;
        }
        
        //console.log('Query results:', results);
        
        if (results.length === 0) {
            //console.log('No demand found with ID:', demandId);
            res.status(404).json({ error: 'Demand not found' });
            return;
        }
        
        const demand = results[0];
        //console.log('Processed demand:', demand);
        
        // Format the response to match client expectations
        // Use null coalescing to handle missing values
        const response = {
            id: demand.id,
            quantite: demand.quantite,
            date_creation: demand.date_creation,
            date_consommation: demand.date_consommation,
            statut: demand.statut,
            centre_actuel_id: demand.centre_actuel_id,
            centre_recepteur_id: demand.centre_recepteur_id,
            chauffeur_id: demand.chauffeur_id,
            vehicule_id: demand.vehicule_id,
            admin_id: demand.admin_id,
            actual_center: demand.actual_center || 'N/A',
            actual_center_location: demand.actual_center_location || 'N/A',
            receiving_center: demand.receiving_center || 'N/A',
            receiving_center_location: demand.receiving_center_location || 'N/A',
            district_nom: demand.actual_center_district || 'N/A',
            branche_nom: demand.actual_center_branch || 'N/A',
            driver_name: demand.driver_name || 'N/A',
            driver_phone: demand.driver_phone || 'N/A',
            vehicle_name: demand.vehicle_name || 'N/A',
            vehicle_matricule: demand.vehicle_matricule || 'N/A',
            vehicle_model: demand.vehicle_model || 'N/A',
            admin_name: demand.admin_name || 'N/A',
            admin_role: demand.admin_role || 'N/A',
            admin_email: demand.admin_email || 'N/A'
        };
        
        //console.log('Sending response:', response);
        res.json(response);
    });
});

// Update demand endpoint
router.put('/demands/:id', (req, res) => {
    const demandId = req.params.id;
    const { 
        quantite, 
        statut, 
        date_consommation,
        centre_recepteur_id,
        chauffeur_id,
        vehicule_id
    } = req.body;
    
    // Log détaillé des données reçues
    //console.log('Received update request:', {
    //     demandId,
    //     requestBody: req.body,
    //     quantite,
    //     statut,
    //     date_consommation,
    //     centre_recepteur_id,
    //     chauffeur_id,
    //     vehicule_id
    // });

    // Validation des données
    if (quantite !== undefined && (isNaN(quantite) || quantite < 0)) {
        return res.status(400).json({ error: 'Quantité invalide' });
    }

    // Validate status
    const validStatuses = ['valide', 'utilise', 'expire'];
    if (statut && !validStatuses.includes(statut)) {
        return res.status(400).json({ error: 'Statut invalide' });
    }

    // Construire la requête de mise à jour
    let query = 'UPDATE demandes SET';
    const updateFields = [];
    const queryParams = [];

    // Ajouter les champs à mettre à jour
    if (quantite !== undefined) {
        updateFields.push('quantite = ?');
        queryParams.push(quantite);
    }

    if (statut) {
        updateFields.push('statut = ?');
        queryParams.push(statut);
    }

    if (date_consommation) {
        updateFields.push('date_consommation = ?');
        queryParams.push(date_consommation);
    }

    if (centre_recepteur_id) {
        updateFields.push('centre_recepteur_id = ?');
        queryParams.push(centre_recepteur_id);
    }

    if (chauffeur_id) {
        updateFields.push('chauffeur_id = ?');
        queryParams.push(chauffeur_id);
    }

    if (vehicule_id) {
        updateFields.push('vehicule_id = ?');
        queryParams.push(vehicule_id);
    }

    // Vérifier s'il y a des champs à mettre à jour
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    // Ajouter la condition WHERE
    queryParams.push(demandId);
    query += ` ${updateFields.join(', ')} WHERE id = ?`;

    // Log de la requête
    //console.log('Update query:', query);
    //console.log('Query parameters:', queryParams);

    // Exécuter la requête
    db.query(query, queryParams, (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Demand not found' });
        }
        
        // Log du résultat
        //console.log('Update result:', result);
        
        // Récupérer la demande mise à jour avec une requête similaire à celle du GET
        const selectQuery = `
            SELECT 
                d.*,
                ac.nom as actual_center,
                ac.localisation as actual_center_location,
                acd.nom as actual_center_district,
                acb.nom as actual_center_branch,
                rc.nom as receiving_center,
                rc.localisation as receiving_center_location,
                rcd.nom as receiving_center_district,
                rcb.nom as receiving_center_branch,
                ch.nom as chauffeur_nom,
                ch.telephone as chauffeur_phone,
                v.nom as vehicle_name,
                v.matricule as vehicle_matricule,
                v.modele as vehicle_model,
                a.nom as admin_name,
                a.role as admin_role,
                a.email as admin_email
            FROM demandes d
            LEFT JOIN centers ac ON d.centre_actuel_id = ac.id
            LEFT JOIN districts acd ON ac.district_id = acd.id
            LEFT JOIN branches acb ON acd.branche_id = acb.id
            LEFT JOIN centers rc ON d.centre_recepteur_id = rc.id
            LEFT JOIN districts rcd ON rc.district_id = rcd.id
            LEFT JOIN branches rcb ON rcd.branche_id = rcb.id
            LEFT JOIN chauffeurs ch ON d.chauffeur_id = ch.id
            LEFT JOIN vehicules v ON d.vehicule_id = v.id
            LEFT JOIN admin a ON d.admin_id = a.id
            WHERE d.id = ?
        `;

        db.query(selectQuery, [demandId], (selectErr, selectResults) => {
            if (selectErr) {
                console.error('Error fetching updated demand:', selectErr);
                return res.status(200).json({ 
                    message: 'Demand updated successfully',
                    warning: 'Could not fetch updated data'
                });
            }

            if (selectResults.length === 0) {
                return res.status(404).json({ error: 'Updated demand not found' });
            }

            const updatedDemand = selectResults[0];
            const response = {
                message: 'Demand updated successfully',
                demand: {
                    id: updatedDemand.id,
                    quantite: updatedDemand.quantite,
                    date_creation: updatedDemand.date_creation,
                    date_consommation: updatedDemand.date_consommation,
                    statut: updatedDemand.statut,
                    centre_actuel_id: updatedDemand.centre_actuel_id,
                    centre_recepteur_id: updatedDemand.centre_recepteur_id,
                    chauffeur_id: updatedDemand.chauffeur_id,
                    vehicule_id: updatedDemand.vehicule_id,
                    admin_id: updatedDemand.admin_id,
                    actual_center: updatedDemand.actual_center || 'N/A',
                    actual_center_location: updatedDemand.actual_center_location || 'N/A',
                    receiving_center: updatedDemand.receiving_center || 'N/A',
                    receiving_center_location: updatedDemand.receiving_center_location || 'N/A',
                    district_nom: updatedDemand.actual_center_district || 'N/A',
                    branche_nom: updatedDemand.actual_center_branch || 'N/A',
                    driver_name: updatedDemand.chauffeur_nom || 'N/A',
                    driver_phone: updatedDemand.chauffeur_phone || 'N/A',
                    vehicle_name: updatedDemand.vehicle_name || 'N/A',
                    vehicle_matricule: updatedDemand.vehicle_matricule || 'N/A',
                    vehicle_model: updatedDemand.vehicle_model || 'N/A',
                    admin_name: updatedDemand.admin_name || 'N/A',
                    admin_role: updatedDemand.admin_role || 'N/A',
                    admin_email: updatedDemand.admin_email || 'N/A'
                }
            };

            res.json(response);
        });
    });
});

// Delete demand endpoint
router.delete('/demands/:id/delete', (req, res) => {
    const demandId = req.params.id;
    
    //console.log('Deleting demand:', demandId);
    
    // First check if the demand exists
    const checkQuery = `
        SELECT id 
        FROM demandes 
        WHERE id = ?
    `;
    
    db.query(checkQuery, [demandId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Database error during check:', checkErr);
            return res.status(500).json({ 
                error: 'Database error', 
                details: checkErr.message 
            });
        }
        
        if (checkResults.length === 0) {
            return res.status(404).json({ error: 'Demand not found' });
        }
        
        // Delete the demand from the database
        const deleteQuery = `
            DELETE FROM demandes 
            WHERE id = ?
        `;
        
        db.query(deleteQuery, [demandId], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error('Database error during deletion:', deleteErr);
                return res.status(500).json({ 
                    error: 'Database error', 
                    details: deleteErr.message 
                });
            }
            
            if (deleteResult.affectedRows === 0) {
                return res.status(404).json({ error: 'Demand not found' });
            }
            
            //console.log('Demand permanently deleted:', demandId);
            res.json({ 
                message: 'Demand permanently deleted',
                id: demandId
            });
        });
    });
});


module.exports = router;



