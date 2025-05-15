const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, checkPermissions } = require('./auth.middleware');






router.get('/bons/:id', authenticate, async (req, res) => {
    const bonId = req.params.id;
    
    const query = `
        SELECT 
            b.id_bon,
            b.type_bon,
            b.statut_disponibilite,
            b.statut_consommation,
            a.date_attribution,
            ch.nom_complet as chauffeur_nom,
            ch.id as chauffeur_id,
            ct.nom as centre_nom,
            adm.nom as admin_attribution_nom,
            r.date_restitution,
            admr.nom as admin_restitution_nom,
            cons.date_consommation,
            ctc.nom as centre_consommation_nom,
            ctc.localisation as centre_consommation_localisation
        FROM bons b
        LEFT JOIN attribution_detail ad ON b.id_bon = ad.id_bon
        LEFT JOIN attribution a ON ad.id_attribution = a.id_attribution
        LEFT JOIN chauffeurs ch ON a.id_chauffeur = ch.id
        LEFT JOIN centers ct ON a.id_centre = ct.id
        LEFT JOIN admin adm ON a.id_admin = adm.id
        LEFT JOIN restitution_detail rd ON b.id_bon = rd.id_bon
        LEFT JOIN restitution r ON rd.id_restitution = r.id_restitution
        LEFT JOIN admin admr ON r.id_admin = admr.id
        LEFT JOIN bon_consomme bc ON b.id_bon = bc.id_bon
        LEFT JOIN consommation cons ON bc.id_consommation = cons.id
        LEFT JOIN centers ctc ON cons.id_centre = ctc.id
        WHERE b.id_bon = ?
    `;

    db.query(query, [bonId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Bon not found' });
        }
        
        res.json(results[0]);
    });
});




router.get('/bons/assigned/:driverId', authenticate, async (req, res) => {
    const driverId = parseInt(req.params.driverId);
    
   // console.log('Requête reçue pour les bons attribués au chauffeur:', driverId);
    
    const query = `
       SELECT 
        b.id_bon,
        b.type_bon,
        b.statut_consommation,
        a.date_attribution
       FROM attribution a
       INNER JOIN attribution_detail ad ON a.id_attribution = ad.id_attribution
       INNER JOIN bons b ON ad.id_bon = b.id_bon
       WHERE a.id_chauffeur = ?
       AND b.statut_disponibilite != 'restitué'
       AND b.statut_consommation = 'non consommé'  
       ORDER BY a.date_attribution DESC, b.id_bon
    `;
    
    db.query(query, [driverId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des bons attribués:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        
      //  console.log(`${results.length} bons attribués trouvés pour le chauffeur ${driverId}`);
        res.json({ success: true, data: results });
    });
});



router.get('/bon/available', authenticate, async (req, res) => {
    // const centreId = req.query.centreId;
    // const chauffeurId = req.query.chauffeurId;
    
    let query = `
      SELECT 
            b.id_bon, 
            b.type_bon , 
            b.statut_consommation
         
        FROM bons b
      
        WHERE b.statut_consommation = 'non consommé' 
        AND b.statut_disponibilite = 'disponible' 
        OR b.statut_disponibilite = 'restitué'
    `;
    
    const queryParams = [];
    
   
    
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des bons disponibles:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        
        res.json(results);
    });
});


router.get('/bons', authenticate, async (req, res) => {
    const { search, type, status, startDate, endDate } = req.query;
    
    let query = `
        SELECT 
            b.id_bon,
            b.type_bon,
            b.statut_consommation,
            a.date_attribution,
            ch.nom_complet as chauffeur_nom
        FROM bons b
        INNER JOIN attribution_detail ad ON b.id_bon = ad.id_bon
        INNER JOIN attribution a ON ad.id_attribution = a.id_attribution
        INNER JOIN chauffeurs ch ON a.id_chauffeur = ch.id
        WHERE b.statut_disponibilite = 'attribué'
    `;
    
    const queryParams = [];
    
    if (search) {
        query += ` AND (b.id_bon LIKE ? OR ch.nom_complet LIKE ?)`;
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm);
    }
    
    if (type) {
        query += ` AND b.type_bon = ?`;
        queryParams.push(type);
    }
    
    if (status) {
        query += ` AND b.statut_consommation = ?`;
        queryParams.push(status);
    }
    
    if (startDate && endDate) {
        query += ` AND a.date_attribution BETWEEN ? AND ?`;
        queryParams.push(startDate, endDate);
    }
    
    query += ` ORDER BY a.date_attribution DESC`;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des bons:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        
      //  console.log(`${results.length} bons attribués trouvés`);
        res.json({ data: results });
    });
});




router.post('/attribution/create', (req, res) => {
    const { adminId, centreId, chauffeurId, bons, date } = req.body;
    
    console.log('Données reçues:', {adminId, centreId, chauffeurId, bons, date });
    
    if (!adminId || !centreId || !chauffeurId || !bons || !bons.length || !date) {
        console.log('Données manquantes:', { adminId, centreId, chauffeurId, bons, date });
        return res.status(400).json({ error: 'Données manquantes' });
    }

    // Commencer une transaction
    db.beginTransaction(async (err) => {
        if (err) {
            console.error('Erreur début transaction:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }

        try {
            // 1. Vérifier que les bons sont disponibles ou restitués
            const checkBonsQuery = `
                SELECT id_bon 
                FROM bons 
                WHERE id_bon IN (${bons.map(() => '?').join(',')}) 
                AND (statut_disponibilite = 'disponible' OR statut_disponibilite = 'restitué')
                AND statut_consommation = 'non consommé'
            `;
            
            db.query(checkBonsQuery, bons, (err, results) => {
                if (err) {
                    console.error('Erreur vérification bons:', err);
                    return res.status(500).json({ error: 'Erreur lors de la vérification des bons' });
                }
                
               if (results.length !== bons.length) {
                   return res.status(400).json({ error: 'Certains bons ne sont plus disponibles' });
               }
                
                // 2. Créer l'attribution
                const attributionQuery = `
                    INSERT INTO attribution (id_chauffeur, id_admin, id_centre, date_attribution)
                    VALUES (?, ?, ?, ?)
                `;
                
                db.query(attributionQuery, [chauffeurId, adminId, centreId, date], (err, result) => {
                    if (err) {
                        console.error('Erreur création attribution:', err);
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Erreur lors de la création de l\'attribution' });
                        });
                    }
                    
                    const attributionId = result.insertId;

                    if (!attributionId) {
                        return db.rollback(() => {
                            res.status(400).json({ error: 'Échec de création de l\'attribution' });
                        });
                    }

                 //   console.log('Attribution créée:', attributionId);

                    // 3. Créer les détails d'attribution
                    const detailValues = bons.map(bonId => [attributionId, bonId]);
                    const detailQuery = `
                        INSERT INTO attribution_detail (id_attribution, id_bon)
                        VALUES ?
                    `;
                    
                    // 4. Mettre à jour le statut des bons
                    const updateBonsQuery = `
                        UPDATE bons
                        SET statut_disponibilite = 'attribué'
                        WHERE id_bon IN (${bons.map(() => '?').join(',')})
                    `;
                    
                    
                    

                    db.query(updateBonsQuery, bons, err => {
                        if (err) {
                            console.error('Erreur mise à jour bons:', err);
                            return db.rollback(() => {
                                res.status(500).json({ error: 'Erreur lors de la mise à jour des bons' });
                            });
                        }
                        
                        db.query(detailQuery, [detailValues], err => {
                            if (err) {
                                console.error('Erreur création détails attribution:', err);
                                return db.rollback(() => {
                                    res.status(500).json({ error: 'Erreur lors de la création des détails' });
                                });
                            }
                            
                            db.commit(err => {
                                if (err) {
                                    console.error('Erreur commit:', err);
                                    return db.rollback(() => {
                                        res.status(500).json({ error: 'Erreur lors de la validation' });
                                    });
                                }
                                
                                res.json({
                                    success: true,
                                    message: 'Attribution créée avec succès',
                                    attributionId: attributionId
                                });
                            });
                        });
                    });
                });
            });
        } catch (error) {
            db.rollback(() => {
                console.error('Erreur lors de l\'attribution:', error);
                res.status(500).json({ error: error.message });
            });
        }
    });
});






router.post('/restitution/create', (req, res) => {
  //  console.log('Requête de restitution reçue:', req.body);
    
    const { id_admin, id_chauffeur, id_centre, date_restitution, bons } = req.body;
    
    if (!id_admin || !id_chauffeur || !id_centre || !date_restitution || !bons || !bons.length) {
        return res.status(400).json({ error: 'Données incomplètes' });
    }

    db.beginTransaction(err => {
        if (err) {
            console.error('Erreur début transaction:', err);
            return res.status(500).json({ error: 'Erreur de transaction' });
        }

        // 1. Créer la restitution
        const restitutionQuery = `
            INSERT INTO restitution (id_admin, id_chauffeur, id_centre, date_restitution)
            VALUES (?, ?, ?, ?)
        `;

        db.query(restitutionQuery, [id_admin, id_chauffeur, id_centre, date_restitution], (err, result) => {
            if (err) {
                console.error('Erreur création restitution:', err);
                return db.rollback(() => {
                    res.status(500).json({ error: 'Erreur lors de la création de la restitution' });
                });
            }

            const restitutionId = result.insertId;

              // 2. Delete attribution details for these bons
              const deleteAttributionQuery = `
              DELETE FROM attribution_detail 
              WHERE id_bon IN (?)
          `;

          db.query(deleteAttributionQuery, [bons], (err) => {
              if (err) {
                  return db.rollback(() => {
                      console.error('Error deleting attribution details:', err);
                      res.status(500).json({ error: 'Database error' });
                  });
              }});

            // 2. Créer les détails de restitution
            const detailValues = bons.map(bonId => [restitutionId, bonId]);
            const detailQuery = `
                INSERT INTO restitution_detail (id_restitution, id_bon)
                VALUES ?
            `;

            // 3. Mettre à jour le statut des bons
            const updateBonsQuery = `
                UPDATE bons
                SET statut_disponibilite = 'restitué'
                WHERE id_bon IN (?)
            `;

            db.query(updateBonsQuery, [bons], err => {
                if (err) {
                    console.error('Erreur mise à jour bons:', err);
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Erreur lors de la mise à jour des bons' });
                    });
                }

                db.query(detailQuery, [detailValues], err => {
                    if (err) {
                        console.error('Erreur création détails restitution:', err);
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Erreur lors de la création des détails' });
                        });
                    }

                    db.commit(err => {
                        if (err) {
                            console.error('Erreur commit:', err);
                            return db.rollback(() => {
                                res.status(500).json({ error: 'Erreur lors de la validation' });
                            });
                        }

                     //   console.log('Restitution créée avec succès');
                        res.json({
                            message: 'Restitution créée avec succès',
                            id: restitutionId
                        });
                    });
                });
            });
        });
    });
});

router.get('/drivers/centre/:centreId', (req, res) => {
    const centreId = req.params.centreId;
   // console.log('Requête reçue pour les chauffeurs du centre:', centreId);

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

      //  console.log(`${results.length} chauffeurs trouvés`);
        res.json({ success: true, data: results });
    });
}); 



router.get('/drivers/with-bons', (req, res) => {
    const { centerId } = req.query;
    
    const query = `
        SELECT 
            ch.id,
            ch.nom_complet,
            COUNT(DISTINCT a.id_attribution) as nombre_attributions,
            COUNT(ad.id_bon) as nombre_bons
        FROM chauffeurs ch
        LEFT JOIN attribution a ON ch.id = a.id_chauffeur
        LEFT JOIN attribution_detail ad ON a.id_attribution = ad.id_attribution
        WHERE ch.centre_id = ?
        GROUP BY ch.id
        ORDER BY ch.nom_complet
    `;

    db.query(query, [centerId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des chauffeurs:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }

        res.json({ data: results });
    });
});



router.get('/drivers', (req, res) => {
  //  console.log('Received request for drivers');
    
    // Get center ID from query params
    const centerId = req.query.centerId;
    
    let query = `
        SELECT id, nom_complet as nom, telephone 
        FROM chauffeurs 
    `;
    
    const queryParams = [];
    
    // Filter by center if centerId is provided
    if (centerId && centerId !== 'undefined' && centerId !== '') {
        query += `WHERE centre_id = ? `;
        queryParams.push(centerId);
      //  console.log(`Filtering drivers by center_id: ${centerId}`);
    } else {
      //  console.log('No center filter applied for drivers');
    }
    
    query += `ORDER BY nom_complet LIMIT 50`;
    
  //  console.log('Executing drivers query:', query);
 //   console.log('Query parameters:', queryParams);
    
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error getting drivers:', err);
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }
        
       // console.log(`Found ${results.length} drivers`);
        res.json({ data: results });
    });
});




module.exports = router;