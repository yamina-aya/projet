const express = require('express');
const router = express.Router();

module.exports = function(db) {
    // Middleware to verify user access
    const checkUserAccess = (req, res, next) => {
        const { centerId = '1' } = req.query; // Default to center 1 if not provided
        req.centerId = centerId;
        next();
    };

    // Get total consumption (quantity and cost)
    router.get('/consumption-totals', checkUserAccess, (req, res) => {
        const { centerId } = req;
        const currentYear = new Date().getFullYear();
        const params = [currentYear, centerId];

        const query = `
            SELECT 
                -- Direct consumption
                SUM(CASE WHEN type_consommation = 'direct' THEN c.quantite ELSE 0 END) as direct_quantity,
                SUM(CASE WHEN type_consommation = 'direct' THEN c.quantite * 150 ELSE 0 END) as direct_cost,
                
                -- Demand consumption
                SUM(CASE WHEN type_consommation = 'demande' THEN d.quantite ELSE 0 END) as demand_quantity,
                SUM(CASE WHEN type_consommation = 'demande' THEN d.quantite * 150 ELSE 0 END) as demand_cost,
                
                -- Bon consumption
                SUM(CASE 
                    WHEN type_consommation = 'bon' THEN 
                        CASE 
                            WHEN b.type_bon = '1000 DA' THEN 1000/150
                            WHEN b.type_bon = '1200 DA' THEN 1200/150
                            WHEN b.type_bon = '2000 DA' THEN 2000/150
                            ELSE 0
                        END 
                    ELSE 0 
                END) as bon_quantity,
                SUM(CASE 
                    WHEN type_consommation = 'bon' THEN 
                        CASE 
                            WHEN b.type_bon = '1000 DA' THEN 1000
                            WHEN b.type_bon = '1200 DA' THEN 1200
                            WHEN b.type_bon = '2000 DA' THEN 2000
                            ELSE 0
                        END
                    ELSE 0 
                END) as bon_cost
                
                
            FROM consommation c
            LEFT JOIN demandes d ON c.id_demande = d.id
            LEFT JOIN bons b ON c.id_bon = b.id_bon
            
            WHERE YEAR(c.date_consommation) = 2025

            ${centerId && centerId !== 'all' ? '            AND c.id_centre = ?' : ''}`;

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching consumption totals:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            const data = results[0] || {
                direct_quantity: 0, direct_cost: 0,
                demand_quantity: 0, demand_cost: 0,
                bon_quantity: 0, bon_cost: 0,
                card_quantity: 0, card_cost: 0
            };
            
            const totalQuantity = data.direct_quantity + data.demand_quantity + data.bon_quantity + data.card_quantity;
            const totalCost = data.direct_cost + data.demand_cost + data.bon_cost + data.card_cost;
            
            res.json({ totalQuantity, totalCost });
        });
    });

    return router;
};