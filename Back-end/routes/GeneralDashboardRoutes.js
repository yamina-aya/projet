const express = require('express');
const router = express.Router();

module.exports = function(db) {
    // Middleware to verify user role and permissions - temporarily disabled for development
    const checkUserAccess = (req, res, next) => {
        // Development mode - skip authentication
        next();
    };

    // Get centers based on user role
    router.get('/centers', checkUserAccess, (req, res) => {
        const { branchId, districtId } = req.query;
        
        let query, params = [];
        
        if (districtId) {
            query = `
                SELECT id, nom, localisation 
                FROM centers 
                WHERE district_id = ?
                ORDER BY nom
            `;
            params = [districtId];
        } else if (branchId) {
            query = `
                SELECT c.id, c.nom, c.localisation 
                FROM centers c
                JOIN districts d ON c.district_id = d.id
                WHERE d.branche_id = ?
                ORDER BY c.nom
            `;
            params = [branchId];
        } else {
            query = `
                SELECT id, nom, localisation 
                FROM centers 
                ORDER BY nom
            `;
        }
        
        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching centers:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(results);
        });
    });

    // Get dashboard summary statistics
    router.get('/summary', checkUserAccess, async (req, res) => {
        const { centerId, timeFilter } = req.query;
        const currentYear = new Date().getFullYear();
        let dateFilter = '';
        let params = [];

        // Add date filter based on current year
        dateFilter = 'AND YEAR(c.date_consommation) = ?';
        params.push(currentYear);

        // Add center filter based on admin role
        if (centerId && centerId !== 'all') {
            params.push(centerId);
        }

        try {
            const query = `
                WITH ConsumptionTotals AS (
                    SELECT 
                        -- Direct consumption in liters
                        SUM(CASE WHEN c.type_consommation = 'direct' THEN c.quantite ELSE 0 END) as direct_total,
                        
                        -- Demand consumption in liters
                        SUM(CASE WHEN c.type_consommation = 'demande' THEN d.quantite ELSE 0 END) as demande_total,
                        
                        -- Bon consumption (convert bon type to liters based on price per liter)
                        SUM(CASE 
                            WHEN c.type_consommation = 'bon' THEN 
                                CASE 
                                    WHEN b.type_bon = '1000 DA' THEN 1000/150 -- Assuming 150 DA per liter
                                    WHEN b.type_bon = '1200 DA' THEN 1200/150
                                    WHEN b.type_bon = '2000 DA' THEN 2000/150
                                    ELSE 0
                                END
                            ELSE 0 
                        END) as bon_total,

                        -- Card transactions in liters
                        SUM(CASE WHEN c.type_consommation = 'carte' THEN tc.quantite ELSE 0 END) as carte_total,
                        
                        -- Total amount in DA
                        SUM(CASE 
                            WHEN c.type_consommation = 'direct' THEN c.quantite * 150 -- Direct cost
                            WHEN c.type_consommation = 'demande' THEN d.quantite * 150 -- Demand cost
                            WHEN c.type_consommation = 'bon' THEN -- Bon cost
                                CASE 
                                    WHEN b.type_bon = '1000 DA' THEN 1000
                                    WHEN b.type_bon = '1200 DA' THEN 1200
                                    WHEN b.type_bon = '2000 DA' THEN 2000
                                    ELSE 0
                                END
                            WHEN c.type_consommation = 'carte' THEN tc.montant -- Card cost
                            ELSE 0
                        END) as total_amount,
                        
                        -- Count total transactions
                        COUNT(*) as total_transactions
                    FROM consommation c
                    LEFT JOIN demandes d ON c.id_demande = d.id
                    LEFT JOIN bons b ON c.id_bon = b.id_bon
                    LEFT JOIN transactions_carte tc ON c.id_carte = tc.id
                    WHERE 1=1
                        ${dateFilter}
                        ${centerId && centerId !== 'all' ? 'AND c.id_centre = ?' : ''}
                ),
                -- Calculate previous year totals for comparison
                PreviousYearTotals AS (
                    SELECT 
                        SUM(CASE 
                            WHEN c.type_consommation = 'direct' THEN c.quantite * 150
                            WHEN c.type_consommation = 'demande' THEN d.quantite * 150
                            WHEN c.type_consommation = 'bon' THEN 
                                CASE 
                                    WHEN b.type_bon = '1000 DA' THEN 1000
                                    WHEN b.type_bon = '1200 DA' THEN 1200
                                    WHEN b.type_bon = '2000 DA' THEN 2000
                                    ELSE 0
                                END
                            WHEN c.type_consommation = 'carte' THEN tc.montant
                            ELSE 0
                        END) as prev_year_amount
                    FROM consommation c
                    LEFT JOIN demandes d ON c.id_demande = d.id
                    LEFT JOIN bons b ON c.id_bon = b.id_bon
                    LEFT JOIN transactions_carte tc ON c.id_carte = tc.id
                    WHERE YEAR(c.date_consommation) = ? 
                        ${centerId && centerId !== 'all' ? 'AND c.id_centre = ?' : ''}
                ),
                -- Calculate consumption by type
                TypeTotals AS (
                    SELECT 
                        c.type_consommation,
                        SUM(CASE 
                            WHEN c.type_consommation = 'direct' THEN c.quantite
                            WHEN c.type_consommation = 'demande' THEN d.quantite
                            WHEN c.type_consommation = 'bon' THEN 
                                CASE 
                                    WHEN b.type_bon = '1000 DA' THEN 1000/150
                                    WHEN b.type_bon = '1200 DA' THEN 1200/150
                                    WHEN b.type_bon = '2000 DA' THEN 2000/150
                                    ELSE 0
                                END
                            WHEN c.type_consommation = 'carte' THEN tc.quantite
                            ELSE 0
                        END) as total_quantity
                    FROM consommation c
                    LEFT JOIN demandes d ON c.id_demande = d.id
                    LEFT JOIN bons b ON c.id_bon = b.id_bon
                    LEFT JOIN transactions_carte tc ON c.id_carte = tc.id
                    WHERE 1=1
                        ${dateFilter}
                        ${centerId && centerId !== 'all' ? 'AND c.id_centre = ?' : ''}
                    GROUP BY c.type_consommation
                )
                SELECT 
                    ct.*,
                    tt.type_consommation as most_used_type,
                    tt.total_quantity as most_used_type_quantity,
                    pyt.prev_year_amount
                FROM ConsumptionTotals ct
                CROSS JOIN (
                    SELECT type_consommation, total_quantity
                    FROM TypeTotals
                    ORDER BY total_quantity DESC
                    LIMIT 1
                ) tt
                CROSS JOIN PreviousYearTotals pyt`;

            // Add previous year to params
            params.push(currentYear - 1);
            if (centerId && centerId !== 'all') {
                params.push(centerId);
            }

            db.query(query, params, (err, results) => {
                if (err) {
                    console.error('Error fetching summary:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (!results || results.length === 0) {
                    return res.status(404).json({ error: 'No data found' });
                }

                const data = results[0];
                const totalLiters = data.direct_total + data.demande_total + data.bon_total + data.carte_total;
                const yearlyEvolution = data.prev_year_amount ? 
                    ((data.total_amount - data.prev_year_amount) / data.prev_year_amount) * 100 : 0;
                const averageCost = data.total_transactions > 0 ? 
                    Math.round(data.total_amount / data.total_transactions) : 0;

                res.json({
                    totalLiters: Math.round(totalLiters),
                    totalCost: Math.round(data.total_amount),
                    yearlyEvolution: Math.round(yearlyEvolution * 10) / 10,
                    mostUsedType: data.most_used_type,
                    averageCost,
                    consumptionChange: 0, // Would need historical data comparison
                    yearlyChange: Math.round(yearlyEvolution * 10) / 10,
                    typePercentage: Math.round((data.most_used_type_quantity / totalLiters) * 100),
                    costChange: 0 // Would need historical data comparison
                });
            });
        } catch (error) {
            console.error('Error in summary endpoint:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get consumption type distribution
    router.get('/type-distribution', checkUserAccess, (req, res) => {
        const { centerId, timeFilter, startDate, endDate } = req.query;
        let dateFilter = '';
        let params = [];

        if (timeFilter === 'custom' && startDate && endDate) {
            dateFilter = 'AND date_consommation BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        if (centerId && centerId !== 'all') {
            params.push(centerId);
        }

        const query = `
            SELECT 
                type_consommation,
                COUNT(*) as count,
                SUM(quantite) as total_quantity
            FROM consommation
            WHERE 1=1 
                ${dateFilter}
                ${centerId && centerId !== 'all' ? 'AND id_centre = ?' : ''}
            GROUP BY type_consommation
        `;

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching type distribution:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            const labels = results.map(r => r.type_consommation);
            const values = results.map(r => r.total_quantity);

            res.json({ labels, values });
        });
    });

    // Get consumption trend data
    router.get('/consumption-trend', checkUserAccess, (req, res) => {
        const { centerId, timeFilter, startDate, endDate, year } = req.query;
        let dateFilter = '';
        let params = [];
        let groupBy, dateFormat;

        // Set up time filtering
        switch(timeFilter) {
            case 'day':
                groupBy = 'DATE(c.date_consommation)';
                dateFormat = '%Y-%m-%d';
                break;
            case 'month':
                groupBy = 'DATE_FORMAT(c.date_consommation, "%Y-%m")';
                dateFormat = '%Y-%m';
                break;
            case 'year':
                groupBy = 'YEAR(c.date_consommation)';
                dateFormat = '%Y';
                break;
            default:
                groupBy = 'DATE_FORMAT(c.date_consommation, "%Y-%m")';
                dateFormat = '%Y-%m';
        }

        // Add date range filter if provided
        if (timeFilter === 'custom' && startDate && endDate) {
            dateFilter = 'AND c.date_consommation BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else if (year) {
            dateFilter = 'AND YEAR(c.date_consommation) = ?';
            params.push(year);
        }

        // Add center filter if provided
        if (centerId && centerId !== 'all') {
            params.push(centerId);
        }

        const query = `
            WITH AllConsumption AS (
                SELECT 
                    c.date_consommation,
                    -- Direct consumption
                    CASE WHEN c.type_consommation = 'direct' THEN c.quantite ELSE 0 END as direct_quantity,
                    -- Demand consumption
                    CASE WHEN c.type_consommation = 'demande' THEN d.quantite ELSE 0 END as demand_quantity,
                    -- Bon consumption (convert from DA to liters)
                    CASE 
                        WHEN c.type_consommation = 'bon' THEN 
                            CASE 
                                WHEN b.type_bon = '1000 DA' THEN 1000/150
                                WHEN b.type_bon = '1200 DA' THEN 1200/150
                                WHEN b.type_bon = '2000 DA' THEN 2000/150
                                ELSE 0
                            END
                        ELSE 0 
                    END as bon_quantity
                FROM consommation c
                LEFT JOIN demandes d ON c.id_demande = d.id
                LEFT JOIN bons b ON c.id_bon = b.id_bon
                WHERE 1=1
                    ${dateFilter}
                    ${centerId && centerId !== 'all' ? 'AND c.id_centre = ?' : ''}
            )
            SELECT 
                ${groupBy} as period,
                DATE_FORMAT(date_consommation, '${dateFormat}') as formatted_date,
                SUM(direct_quantity + demand_quantity + bon_quantity) as total_quantity
            FROM AllConsumption
            GROUP BY ${groupBy}
            ORDER BY period ASC
            ${timeFilter !== 'custom' ? 'LIMIT 12' : ''}`;

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching consumption trend:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            const labels = results.map(r => {
                if (timeFilter === 'month' || (!timeFilter && !year)) {
                    const [year, month] = r.formatted_date.split('-');
                    return `${months[parseInt(month) - 1]} ${year}`;
                }
                return r.formatted_date;
            });
            const values = results.map(r => r.total_quantity);

            res.json({
                labels,
                datasets: [{
                    label: 'Consommation',
                    data: values,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.1
                }]
            });
        });
    });

    // Get type comparison data
    router.get('/type-comparison', checkUserAccess, (req, res) => {
        const { centerId, timeFilter, year } = req.query;
        let groupBy, dateFormat;
        let params = [];

        switch(timeFilter) {
            case 'day':
                groupBy = 'DATE(date_consommation)';
                dateFormat = '%Y-%m-%d';
                break;
            case 'month':
                groupBy = 'MONTH(date_consommation)';
                dateFormat = '%M';
                break;
            case 'year':
                groupBy = 'YEAR(date_consommation)';
                dateFormat = '%Y';
                break;
            default:
                groupBy = 'DATE(date_consommation)';
                dateFormat = '%Y-%m-%d';
        }

        if (centerId && centerId !== 'all') {
            params.push(centerId);
        }

        const query = `
            SELECT 
                ${groupBy} as period,
                DATE_FORMAT(date_consommation, '${dateFormat}') as label,
                type_consommation,
                SUM(quantite) as total
            FROM consommation
            WHERE 1=1
                ${year ? 'AND YEAR(date_consommation) = ?' : ''}
                ${centerId && centerId !== 'all' ? 'AND id_centre = ?' : ''}
            GROUP BY ${groupBy}, type_consommation
            ORDER BY period
        `;

        if (year) {
            params.unshift(year);
        }

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching type comparison:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Process results into datasets for stacked bar chart
            const labels = [...new Set(results.map(r => r.label))];
            const types = [...new Set(results.map(r => r.type_consommation))];
            
            const datasets = types.map(type => ({
                label: type,
                data: labels.map(label => {
                    const match = results.find(r => r.label === label && r.type_consommation === type);
                    return match ? match.total : 0;
                })
            }));

            res.json({ labels, datasets });
        });
    });

    // Get performance data
    router.get('/performance', checkUserAccess, async (req, res) => {
        const { type, metric, centerId } = req.query;
        let query = '';
        let params = [];

        if (centerId && centerId !== 'all') {
            params.push(centerId);
        }

        switch(type) {
            case 'drivers':
                query = `
                    SELECT 
                        c.id_chauffeur,
                        ch.nom_complet as name,
                        'Chauffeur' as type,
                        ce.nom as center,
                        COUNT(*) as transactions,
                        SUM(c.quantite) as total_quantity,
                        SUM(c.quantite * CASE 
                            WHEN c.type_consommation = 'bon' THEN 
                                (SELECT CAST(SUBSTRING(type_bon, 1, POSITION(' ' IN type_bon)) AS DECIMAL)
                                FROM bons b 
                                WHERE b.id_bon = c.id_bon)
                            ELSE 0
                        END) as total_cost
                    FROM consommation c
                    JOIN chauffeurs ch ON c.id_chauffeur = ch.id
                    JOIN centers ce ON ch.centre_id = ce.id
                    WHERE 1=1
                    ${centerId && centerId !== 'all' ? 'AND ce.id = ?' : ''}
                    GROUP BY c.id_chauffeur, ch.nom_complet, ce.nom
                    ORDER BY ${metric === 'cost' ? 'total_cost' : 
                             metric === 'transactions' ? 'transactions' : 
                             'total_quantity'} DESC
                    LIMIT 10
                `;
                break;

            case 'admins':
                query = `
                    SELECT 
                        a.id,
                        a.nom as name,
                        'Administrateur' as type,
                        ce.nom as center,
                        COUNT(*) as transactions,
                        SUM(CASE WHEN c.type_consommation = 'bon' THEN 1 ELSE 0 END) as bons_created,
                        SUM(CASE WHEN c.type_consommation = 'demande' THEN 1 ELSE 0 END) as demandes_created
                    FROM consommation c
                    JOIN admin a ON c.id_admin = a.id
                    JOIN centers ce ON a.centre_id = ce.id
                    WHERE 1=1
                    ${centerId && centerId !== 'all' ? 'AND ce.id = ?' : ''}
                    GROUP BY a.id, a.nom, ce.nom
                    ORDER BY ${metric === 'transactions' ? 'transactions' : 
                             'bons_created + demandes_created'} DESC
                    LIMIT 10
                `;
                break;

            case 'vehicles':
                query = `
                    SELECT 
                        v.id,
                        CONCAT(v.nom, ' (', v.matricule, ')') as name,
                        'Véhicule' as type,
                        ce.nom as center,
                        COUNT(*) as transactions,
                        SUM(c.quantite) as total_quantity,
                        SUM(c.quantite * CASE 
                            WHEN c.type_consommation = 'bon' THEN 
                                (SELECT CAST(SUBSTRING(type_bon, 1, POSITION(' ' IN type_bon)) AS DECIMAL)
                                FROM bons b 
                                WHERE b.id_bon = c.id_bon)
                            ELSE 0
                        END) as total_cost
                    FROM consommation c
                    JOIN vehicules v ON c.id_vehicule = v.id
                    JOIN centers ce ON v.centre_id = ce.id
                    WHERE 1=1
                    ${centerId && centerId !== 'all' ? 'AND ce.id = ?' : ''}
                    GROUP BY v.id, v.nom, v.matricule, ce.nom
                    ORDER BY ${metric === 'cost' ? 'total_cost' : 
                             metric === 'transactions' ? 'transactions' : 
                             'total_quantity'} DESC
                    LIMIT 10
                `;
                break;
        }

        try {
            db.query(query, params, (err, results) => {
                if (err) {
                    console.error('Error fetching performance data:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                // Calculate percentages
                const total = results.reduce((sum, row) => {
                    return sum + (metric === 'cost' ? row.total_cost : 
                                metric === 'transactions' ? row.transactions :
                                row.total_quantity);
                }, 0);

                const data = results.map(row => ({
                    name: row.name,
                    type: row.type,
                    center: row.center,
                    total: metric === 'cost' ? row.total_cost : 
                           metric === 'transactions' ? row.transactions :
                           row.total_quantity,
                    percentage: (metric === 'cost' ? row.total_cost : 
                                metric === 'transactions' ? row.transactions :
                                row.total_quantity) / total * 100
                }));

                res.json(data);
            });
        } catch (error) {
            console.error('Error in performance query:', error);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Get transactions data
    router.get('/transactions', checkUserAccess, (req, res) => {
        const { type, entity, centerId, startDate, endDate } = req.query;
        let query = `
            SELECT 
                c.date_consommation as date,
                c.type_consommation as type,
                CASE 
                    WHEN c.id_chauffeur IS NOT NULL THEN CONCAT(ch.nom_complet, ' (Chauffeur)')
                    WHEN c.id_admin IS NOT NULL THEN CONCAT(a.nom, ' (Admin)')
                    WHEN c.id_vehicule IS NOT NULL THEN CONCAT(v.nom, ' (', v.matricule, ')')
                END as entity,
                CASE 
                    WHEN c.type_consommation = 'bon' THEN CONCAT('Bon de ', 
                        (SELECT type_bon FROM bons b WHERE b.id_bon = c.id_bon))
                    WHEN c.type_consommation = 'demande' THEN 'Demande de carburant'
                    WHEN c.type_consommation = 'carte' THEN 'Carte carburant'
                    ELSE 'Consommation directe'
                END as description,
                c.quantite as quantity,
                CASE 
                    WHEN c.type_consommation = 'bon' THEN 
                        c.quantite * (SELECT CAST(SUBSTRING(type_bon, 1, POSITION(' ' IN type_bon)) AS DECIMAL)
                                    FROM bons b 
                                    WHERE b.id_bon = c.id_bon)
                    ELSE c.quantite * 100 -- Assuming a default price per liter
                END as amount
            FROM consommation c
            LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id
            LEFT JOIN admin a ON c.id_admin = a.id
            LEFT JOIN vehicules v ON c.id_vehicule = v.id
            WHERE 1=1
        `;

        const params = [];

        if (type && type !== 'all') {
            query += ' AND c.type_consommation = ?';
            params.push(type);
        }

        if (entity && entity !== 'all') {
            switch(entity) {
                case 'driver':
                    query += ' AND c.id_chauffeur IS NOT NULL';
                    break;
                case 'admin':
                    query += ' AND c.id_admin IS NOT NULL';
                    break;
                case 'vehicle':
                    query += ' AND c.id_vehicule IS NOT NULL';
                    break;
            }
        }

        if (centerId && centerId !== 'all') {
            query += ' AND c.id_centre = ?';
            params.push(centerId);
        }

        if (startDate && endDate) {
            query += ' AND c.date_consommation BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        query += ' ORDER BY c.date_consommation DESC LIMIT 100';

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching transactions:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(results);
        });
    });

    // Get monthly consumption data
    router.get('/monthly-consumption', checkUserAccess, (req, res) => {
        const { centerId, year } = req.query;
        const params = [];
        
        let query = `
            WITH MonthlyData AS (
                SELECT 
                    DATE_FORMAT(c.date_consommation, '%Y-%m') as month,
                    SUM(CASE 
                        WHEN c.type_consommation = 'direct' THEN c.quantite
                        WHEN c.type_consommation = 'demande' THEN d.quantite
                        WHEN c.type_consommation = 'bon' THEN 
                            CASE 
                                WHEN b.type_bon = '1000 DA' THEN 1000/150
                                WHEN b.type_bon = '1200 DA' THEN 1200/150
                                WHEN b.type_bon = '2000 DA' THEN 2000/150
                                ELSE 0
                            END
                        ELSE 0 
                    END) as total_quantity
                FROM consommation c
                LEFT JOIN demandes d ON c.id_demande = d.id
                LEFT JOIN bons b ON c.id_bon = b.id_bon
                WHERE YEAR(c.date_consommation) = ?
                    ${centerId && centerId !== 'all' ? 'AND c.id_centre = ?' : ''}
                GROUP BY DATE_FORMAT(c.date_consommation, '%Y-%m')
                ORDER BY month
            )
            SELECT 
                MONTH(STR_TO_DATE(month, '%Y-%m')) as month_num,
                DATE_FORMAT(STR_TO_DATE(month, '%Y-%m'), '%M') as month_name,
                COALESCE(total_quantity, 0) as total
            FROM MonthlyData`;

        params.push(year);
        if (centerId && centerId !== 'all') {
            params.push(centerId);
        }

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching monthly consumption:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
            
            // Fill in missing months with zero values
            const completeData = months.map((month, index) => {
                const monthData = results.find(r => r.month_num === index + 1);
                return {
                    month: month,
                    total: monthData ? monthData.total : 0
                };
            });

            res.json(completeData);
        });
    });

    return router;
};

// Utility functions
function calculateYearlyEvolution(total) {
    // This would typically compare against last year's data
    return Math.round((Math.random() * 20 - 10) * 10) / 10;
}

function getMostUsedType(data) {
    const types = [
        { type: 'Direct', value: data.direct_total },
        { type: 'Bons', value: data.bon_total },
        { type: 'Demandes', value: data.demande_total },
        { type: 'Cartes', value: data.carte_total }
    ];
    
    return types.reduce((prev, current) => 
        (prev.value > current.value) ? prev : current
    ).type;
}

function calculateAverageCost(total) {
    // This would typically be calculated based on actual costs
    return Math.round(100 + Math.random() * 20);
}