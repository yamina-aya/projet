const express = require('express');
const router = express.Router();
const db = require('../config/db');
// const moment = require('moment');
// const { createObjectCsvWriter } = require('csv-writer');
// const fs = require('fs');
// const path = require('path');

// Helper function to get date range based on period
function getDateRange(period) {
    const now = moment();
    let startDate, endDate = now.format('YYYY-MM-DD');
    
    switch(period) {
        case 'day':
            startDate = now.format('YYYY-MM-DD');
            break;
        case 'week':
            startDate = now.clone().subtract(6, 'days').format('YYYY-MM-DD');
            break;
        case 'month':
            startDate = now.clone().subtract(29, 'days').format('YYYY-MM-DD');
            break;
        case 'quarter':
            startDate = now.clone().subtract(89, 'days').format('YYYY-MM-DD');
            break;
        case 'year':
            startDate = now.clone().subtract(364, 'days').format('YYYY-MM-DD');
            break;
        default:
            startDate = now.clone().subtract(6, 'days').format('YYYY-MM-DD');
    }
    
    return { startDate, endDate };
}

// Helper to format SQL date ranges
function getDateRangeSQL(period) {
    const { startDate, endDate } = getDateRange(period);
    return { 
        startDate, 
        endDate,
        sql: `date >= '${startDate}' AND date <= '${endDate}'` 
    };
}

module.exports = function(db) {
    // Middleware pour vérifier l'authentification
    router.use((req, res, next) => {
        // Vérifier si le token est présent dans les headers
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // En mode développement, on peut temporairement permettre l'accès sans authentification
            console.warn('Accès au tableau de bord sans authentification');
            return next();
            
            // En production, décommentez ce code pour exiger l'authentification:
            // return res.status(401).json({ error: 'Authentification requise' });
        }
        
        // En production, ajoutez la vérification du token ici
        // const token = authHeader.split(' ')[1];
        // Vérifier le token et définir l'utilisateur dans req.user
        
        next();
    });

// GET statistics for dashboard
router.get('/statistics', async (req, res) => {
    try {
        const period = req.query.period || 'week';
        const dateRange = getDateRangeSQL(period);
        
        // Get total quantity
        const [quantityResult] = await db.query(`
            SELECT SUM(quantity) as totalQuantity, SUM(amount) as totalAmount, COUNT(*) as totalTransactions
            FROM direct_consumption
            WHERE ${dateRange.sql}
        `);
        
        // Get average per vehicle
        const [vehicleResult] = await db.query(`
            SELECT AVG(total_per_vehicle) as averagePerVehicle
            FROM (
                SELECT vehicle_id, SUM(quantity) as total_per_vehicle
                FROM direct_consumption
                WHERE ${dateRange.sql}
                GROUP BY vehicle_id
            ) as vehicle_totals
        `);
        
        const statistics = {
            totalQuantity: Math.round(quantityResult[0]?.totalQuantity || 0),
            totalAmount: Math.round(quantityResult[0]?.totalAmount || 0),
            totalTransactions: quantityResult[0]?.totalTransactions || 0,
            averagePerVehicle: Math.round(vehicleResult[0]?.averagePerVehicle || 0)
        };
        
        res.json(statistics);
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET trend data (by day, week, month)
router.get('/trend', async (req, res) => {
    try {
        const period = req.query.period || 'semaine';
        let query, formatString, groupByField;
        
        // Determine SQL parameters based on period
        if (period === 'jour') {
            // Last 24 hours by hour
            formatString = '%H:00';
            groupByField = 'HOUR(date_time)';
            dateRange = `date_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`;
        } else if (period === 'semaine') {
            // Last 7 days by day
            formatString = '%d/%m';
            groupByField = 'DATE(date_time)';
            dateRange = `date_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
        } else if (period === 'mois') {
            // Last 30 days by day
            formatString = '%d/%m';
            groupByField = 'DATE(date_time)';
            dateRange = `date_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
        } else {
            // Default to week
            formatString = '%d/%m';
            groupByField = 'DATE(date_time)';
            dateRange = `date_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
        }
        
        // Get trend data
        const [results] = await db.query(`
            SELECT 
                DATE_FORMAT(date_time, '${formatString}') as label,
                SUM(quantity) as value
            FROM direct_consumption
            WHERE ${dateRange}
            GROUP BY ${groupByField}
            ORDER BY date_time
        `);
        
        const labels = results.map(row => row.label);
        const values = results.map(row => row.value);
        
        res.json({ labels, values });
    } catch (error) {
        console.error('Error fetching trend data:', error);
        res.status(500).json({ error: 'Failed to fetch trend data' });
    }
});

// GET centers consumption data
router.get('/centers', async (req, res) => {
    try {
        const period = req.query.period || 'week';
        const dateRange = getDateRangeSQL(period);
        
        const [results] = await db.query(`
            SELECT 
                c.name as center_name,
                SUM(dc.quantity) as total_quantity
            FROM direct_consumption dc
            JOIN centers c ON dc.center_id = c.id
            WHERE ${dateRange.sql}
            GROUP BY dc.center_id
            ORDER BY total_quantity DESC
        `);
        
        const labels = results.map(row => row.center_name);
        const values = results.map(row => row.total_quantity);
        
        res.json({ labels, values });
    } catch (error) {
        console.error('Error fetching centers data:', error);
        res.status(500).json({ error: 'Failed to fetch centers data' });
    }
});

// GET comparison data (current vs previous period)
router.get('/comparison', async (req, res) => {
    try {
        const period = req.query.period || 'semaine';
        let groupBy, dateFormat, currentRange, previousRange;
        
        if (period === 'semaine') {
            // Group by day of week
            groupBy = "DAYNAME(date_time)";
            dateFormat = "%w"; // Day of week (0=Sunday, 6=Saturday)
            currentRange = "date_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            previousRange = "date_time >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND date_time < DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if (period === 'mois') {
            // Group by week of month
            groupBy = "WEEK(date_time, 1) - WEEK(DATE_FORMAT(date_time, '%Y-%m-01'), 1) + 1";
            dateFormat = null; // Special case
            currentRange = "date_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            previousRange = "date_time >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND date_time < DATE_SUB(NOW(), INTERVAL 30 DAY)";
        } else if (period === 'annee') {
            // Group by month
            groupBy = "MONTH(date_time)";
            dateFormat = "%m";
            currentRange = "date_time >= DATE_SUB(NOW(), INTERVAL 12 MONTH)";
            previousRange = "date_time >= DATE_SUB(NOW(), INTERVAL 24 MONTH) AND date_time < DATE_SUB(NOW(), INTERVAL 12 MONTH)";
        } else {
            // Default to week
            groupBy = "DAYNAME(date_time)";
            dateFormat = "%w";
            currentRange = "date_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            previousRange = "date_time >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND date_time < DATE_SUB(NOW(), INTERVAL 7 DAY)";
        }
        
        // Special case for month grouping
        let query;
        if (period === 'mois') {
            query = `
                SELECT 
                    CONCAT('Semaine ', ${groupBy}) as label,
                    period,
                    SUM(quantity) as total
                FROM (
                    SELECT 
                        date_time,
                        quantity,
                        'current' as period
                    FROM direct_consumption
                    WHERE ${currentRange}
                    UNION ALL
                    SELECT 
                        date_time,
                        quantity,
                        'previous' as period
                    FROM direct_consumption
                    WHERE ${previousRange}
                ) as combined_data
                GROUP BY label, period
                ORDER BY STR_TO_DATE(REPLACE(label, 'Semaine ', ''), '%v')
            `;
        } else if (period === 'semaine') {
            // For weeks, use day names in correct order
            const frenchDayNames = {
                '0': 'Dimanche',
                '1': 'Lundi',
                '2': 'Mardi',
                '3': 'Mercredi',
                '4': 'Jeudi',
                '5': 'Vendredi',
                '6': 'Samedi'
            };
            
            query = `
                SELECT 
                    CASE DATE_FORMAT(date_time, ${dateFormat})
                        WHEN '0' THEN '${frenchDayNames['0']}'
                        WHEN '1' THEN '${frenchDayNames['1']}'
                        WHEN '2' THEN '${frenchDayNames['2']}'
                        WHEN '3' THEN '${frenchDayNames['3']}'
                        WHEN '4' THEN '${frenchDayNames['4']}'
                        WHEN '5' THEN '${frenchDayNames['5']}'
                        WHEN '6' THEN '${frenchDayNames['6']}'
                    END as label,
                    period,
                    SUM(quantity) as total
                FROM (
                    SELECT 
                        date_time,
                        quantity,
                        'current' as period
                    FROM direct_consumption
                    WHERE ${currentRange}
                    UNION ALL
                    SELECT 
                        date_time,
                        quantity,
                        'previous' as period
                    FROM direct_consumption
                    WHERE ${previousRange}
                ) as combined_data
                GROUP BY label, period
                ORDER BY FIELD(label, 
                    '${frenchDayNames['1']}',
                    '${frenchDayNames['2']}',
                    '${frenchDayNames['3']}',
                    '${frenchDayNames['4']}',
                    '${frenchDayNames['5']}',
                    '${frenchDayNames['6']}',
                    '${frenchDayNames['0']}'
                )
            `;
        } else if (period === 'annee') {
            // For year, use month names
            const frenchMonthNames = {
                '01': 'Janvier',
                '02': 'Février',
                '03': 'Mars',
                '04': 'Avril',
                '05': 'Mai',
                '06': 'Juin',
                '07': 'Juillet',
                '08': 'Août',
                '09': 'Septembre',
                '10': 'Octobre',
                '11': 'Novembre',
                '12': 'Décembre'
            };
            
            query = `
                SELECT 
                    CASE DATE_FORMAT(date_time, ${dateFormat})
                        WHEN '01' THEN '${frenchMonthNames['01']}'
                        WHEN '02' THEN '${frenchMonthNames['02']}'
                        WHEN '03' THEN '${frenchMonthNames['03']}'
                        WHEN '04' THEN '${frenchMonthNames['04']}'
                        WHEN '05' THEN '${frenchMonthNames['05']}'
                        WHEN '06' THEN '${frenchMonthNames['06']}'
                        WHEN '07' THEN '${frenchMonthNames['07']}'
                        WHEN '08' THEN '${frenchMonthNames['08']}'
                        WHEN '09' THEN '${frenchMonthNames['09']}'
                        WHEN '10' THEN '${frenchMonthNames['10']}'
                        WHEN '11' THEN '${frenchMonthNames['11']}'
                        WHEN '12' THEN '${frenchMonthNames['12']}'
                    END as label,
                    period,
                    SUM(quantity) as total
                FROM (
                    SELECT 
                        date_time,
                        quantity,
                        'current' as period
                    FROM direct_consumption
                    WHERE ${currentRange}
                    UNION ALL
                    SELECT 
                        date_time,
                        quantity,
                        'previous' as period
                    FROM direct_consumption
                    WHERE ${previousRange}
                ) as combined_data
                GROUP BY label, period
                ORDER BY MONTH(STR_TO_DATE(label, '%M'))
            `;
        }
        
        const [results] = await db.query(query);
        
        // Process results into format needed for chart
        const uniqueLabels = [...new Set(results.map(r => r.label))];
        const currentValues = [];
        const previousValues = [];
        
        uniqueLabels.forEach(label => {
            const currentRecord = results.find(r => r.label === label && r.period === 'current');
            const previousRecord = results.find(r => r.label === label && r.period === 'previous');
            
            currentValues.push(currentRecord ? parseFloat(currentRecord.total) : 0);
            previousValues.push(previousRecord ? parseFloat(previousRecord.total) : 0);
        });
        
        res.json({
            labels: uniqueLabels,
            currentValues,
            previousValues
        });
    } catch (error) {
        console.error('Error fetching comparison data:', error);
        res.status(500).json({ error: 'Failed to fetch comparison data' });
    }
});

// GET anomalies detected
router.get('/anomalies', async (req, res) => {
    try {
        const period = req.query.period || 'week';
        const dateRange = getDateRangeSQL(period);
        
        // This would normally be a complex query looking for anomalies
        // Here's a simplified example that looks for:
        // 1. Vehicles with consumption > 2x average
        // 2. Unusually high single transactions
        // 3. Transactions at unusual times
        
        // Get average consumption per vehicle
        const [avgConsumption] = await db.query(`
            SELECT AVG(quantity) as avg_quantity
            FROM direct_consumption
            WHERE ${dateRange.sql}
        `);
        
        const avgQuantity = avgConsumption[0]?.avg_quantity || 0;
        const highThreshold = avgQuantity * 2;
        
        // Find high consumption vehicles
        const [highConsumptionVehicles] = await db.query(`
            SELECT 
                v.plate_number,
                v.description, 
                SUM(dc.quantity) as total_quantity,
                COUNT(*) as transaction_count,
                MAX(dc.date_time) as last_transaction
            FROM direct_consumption dc
            JOIN vehicles v ON dc.vehicle_id = v.id
            WHERE ${dateRange.sql}
            GROUP BY dc.vehicle_id
            HAVING total_quantity > ?
            ORDER BY total_quantity DESC
            LIMIT 5
        `, [highThreshold]);
        
        // Find unusually large single transactions
        const [largeTransactions] = await db.query(`
            SELECT 
                dc.id,
                dc.date_time,
                dc.quantity,
                v.plate_number,
                v.description,
                d.name as driver_name,
                c.name as center_name
            FROM direct_consumption dc
            JOIN vehicles v ON dc.vehicle_id = v.id
            JOIN drivers d ON dc.driver_id = d.id
            JOIN centers c ON dc.center_id = c.id
            WHERE ${dateRange.sql}
                AND quantity > (SELECT AVG(quantity) * 3 FROM direct_consumption)
            ORDER BY quantity DESC
            LIMIT 5
        `);
        
        // Find night-time transactions (if unusual for business)
        const [nightTransactions] = await db.query(`
            SELECT 
                dc.id,
                dc.date_time,
                dc.quantity,
                v.plate_number,
                d.name as driver_name,
                c.name as center_name
            FROM direct_consumption dc
            JOIN vehicles v ON dc.vehicle_id = v.id
            JOIN drivers d ON dc.driver_id = d.id
            JOIN centers c ON dc.center_id = c.id
            WHERE ${dateRange.sql}
                AND (HOUR(date_time) >= 22 OR HOUR(date_time) <= 5)
            ORDER BY date_time DESC
            LIMIT 5
        `);
        
        // Combine and format anomalies
        const anomalies = [];
        
        // Add high consumption vehicles
        highConsumptionVehicles.forEach(vehicle => {
            anomalies.push({
                title: `Consommation élevée - ${vehicle.plate_number}`,
                description: `${vehicle.description} a consommé ${Math.round(vehicle.total_quantity)} litres sur ${vehicle.transaction_count} transactions`,
                severity: 'high',
                date: moment(vehicle.last_transaction).format('DD/MM/YYYY'),
                entity: vehicle.plate_number
            });
        });
        
        // Add large single transactions
        largeTransactions.forEach(transaction => {
            anomalies.push({
                title: `Transaction inhabituelle - ${transaction.plate_number}`,
                description: `${Math.round(transaction.quantity)} litres en une seule transaction par ${transaction.driver_name}`,
                severity: 'medium',
                date: moment(transaction.date_time).format('DD/MM/YYYY HH:mm'),
                entity: transaction.plate_number
            });
        });
        
        // Add night transactions
        nightTransactions.forEach(transaction => {
            anomalies.push({
                title: `Transaction nocturne - ${transaction.plate_number}`,
                description: `Transaction de ${Math.round(transaction.quantity)} litres à ${moment(transaction.date_time).format('HH:mm')}`,
                severity: 'low',
                date: moment(transaction.date_time).format('DD/MM/YYYY'),
                entity: transaction.plate_number
            });
        });
        
        // Sort by severity
        const severityOrder = { high: 0, medium: 1, low: 2 };
        anomalies.sort((a, b) => {
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
        
        res.json(anomalies);
    } catch (error) {
        console.error('Error fetching anomalies:', error);
        res.status(500).json({ error: 'Failed to fetch anomalies' });
    }
});

// GET top performers (drivers, vehicles, centers)
router.get('/performers', async (req, res) => {
    try {
        const period = req.query.period || 'week';
        const type = req.query.type || 'chauffeur'; // chauffeur, vehicule, centre
        const metric = req.query.metric || 'quantite'; // quantite, montant, frequence
        const dateRange = getDateRangeSQL(period);
        
        let query, metricField, nameField, sourceTable, joinClause = '', limit = 10;
        
        // Set metric field
        if (metric === 'quantite') {
            metricField = 'SUM(dc.quantity)';
        } else if (metric === 'montant') {
            metricField = 'SUM(dc.amount)';
        } else if (metric === 'frequence') {
            metricField = 'COUNT(*)';
        } else {
            metricField = 'SUM(dc.quantity)';
        }
        
        // Set type specific fields
        if (type === 'chauffeur') {
            nameField = 'd.name';
            sourceTable = 'drivers d';
            joinClause = 'JOIN direct_consumption dc ON d.id = dc.driver_id';
        } else if (type === 'vehicule') {
            nameField = 'CONCAT(v.plate_number, " - ", v.description)';
            sourceTable = 'vehicles v';
            joinClause = 'JOIN direct_consumption dc ON v.id = dc.vehicle_id';
        } else if (type === 'centre') {
            nameField = 'c.name';
            sourceTable = 'centers c';
            joinClause = 'JOIN direct_consumption dc ON c.id = dc.center_id';
        } else {
            nameField = 'd.name';
            sourceTable = 'drivers d';
            joinClause = 'JOIN direct_consumption dc ON d.id = dc.driver_id';
        }
        
        // Build query with center information for drivers and vehicles
        if (type === 'chauffeur' || type === 'vehicule') {
            query = `
                SELECT 
                    ${nameField} as name,
                    ${metricField} as value,
                    c.name as center
                FROM ${sourceTable}
                ${joinClause}
                JOIN centers c ON dc.center_id = c.id
                WHERE ${dateRange.sql}
                GROUP BY ${type === 'chauffeur' ? 'd.id' : 'v.id'}, c.id
                ORDER BY value DESC
                LIMIT ${limit}
            `;
        } else {
            query = `
                SELECT 
                    ${nameField} as name,
                    ${metricField} as value,
                    NULL as center
                FROM ${sourceTable}
                ${joinClause}
                WHERE ${dateRange.sql}
                GROUP BY ${type === 'centre' ? 'c.id' : 'd.id'}
                ORDER BY value DESC
                LIMIT ${limit}
            `;
        }
        
        const [results] = await db.query(query);
        
        res.json(results);
    } catch (error) {
        console.error('Error fetching performers data:', error);
        res.status(500).json({ error: 'Failed to fetch performers data' });
    }
});

// Export dashboard data as CSV
router.get('/export', async (req, res) => {
    try {
        const period = req.query.period || 'week';
        const format = req.query.format || 'csv';
        const dateRange = getDateRangeSQL(period);
        
        // Fetch data
        const [results] = await db.query(`
            SELECT 
                dc.id,
                dc.date_time,
                dc.quantity,
                dc.amount,
                v.plate_number as vehicle,
                v.description as vehicle_description,
                d.name as driver,
                c.name as center
            FROM direct_consumption dc
            JOIN vehicles v ON dc.vehicle_id = v.id
            JOIN drivers d ON dc.driver_id = d.id
            JOIN centers c ON dc.center_id = c.id
            WHERE ${dateRange.sql}
            ORDER BY dc.date_time DESC
        `);
        
        if (format === 'csv') {
            const filename = `consommation_directe_${dateRange.startDate}_${dateRange.endDate}.csv`;
            const filepath = path.join(__dirname, 'tmp', filename);
            
            // Ensure tmp directory exists
            if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
                fs.mkdirSync(path.join(__dirname, 'tmp'), { recursive: true });
            }
            
            // Create CSV writer
            const csvWriter = createObjectCsvWriter({
                path: filepath,
                header: [
                    { id: 'id', title: 'ID' },
                    { id: 'date_time', title: 'Date et Heure' },
                    { id: 'quantity', title: 'Quantité (L)' },
                    { id: 'amount', title: 'Montant (DA)' },
                    { id: 'vehicle', title: 'Véhicule' },
                    { id: 'vehicle_description', title: 'Description Véhicule' },
                    { id: 'driver', title: 'Chauffeur' },
                    { id: 'center', title: 'Centre' }
                ]
            });
            
            // Write records to CSV
            await csvWriter.writeRecords(results.map(r => ({
                ...r,
                date_time: moment(r.date_time).format('DD/MM/YYYY HH:mm:ss')
            })));
            
            // Send file
            res.download(filepath, filename, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                }
                
                // Delete file after sending
                fs.unlink(filepath, (err) => {
                    if (err) {
                        console.error('Error deleting temp file:', err);
                    }
                });
            });
        } else {
            // Fallback to JSON if format not supported
            res.json(results);
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

return router;
};
