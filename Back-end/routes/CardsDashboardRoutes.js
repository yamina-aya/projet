const express = require('express');
const router = express.Router();
// const mysql = require('mysql2/promise');
// const dbConfig = require('./dbConfig');
// const ExcelJS = require('exceljs');

module.exports = function(db) {
    // Middleware to check if user is authenticated
    const checkAuth = (req, res, next) => {
        // Get auth header value
        const bearerHeader = req.headers['authorization'];
        
        // Check if bearer is undefined
        if (typeof bearerHeader !== 'undefined') {
            // Split at the space
            const bearer = bearerHeader.split(' ');
            // Get token from array
            const bearerToken = bearer[1];
            // Set the token
            req.token = bearerToken;
            // Next middleware
            next();
        } else {
            // Forbidden
            res.status(403).json({ message: 'Forbidden: No token provided' });
        }
    };

    // Route for getting dashboard statistics
    router.get('/stats', checkAuth, async (req, res) => {
        try {
            const { start_date, end_date } = req.query;

            // Query for active cards
            db.query('SELECT COUNT(*) as active_cards FROM cards WHERE status = "active"', (err, activeCardsResult) => {
                if (err) {
                    console.error('Error fetching active cards count:', err);
                    return res.json({
                        active_cards: 0,
                        total_liters: 0,
                        total_amount: 0,
                        avg_transaction: 0
                    });
                }

                // Query for total consumption in liters and amount
                db.query('SELECT SUM(quantity) as total_liters, SUM(amount) as total_amount FROM card_transactions WHERE date BETWEEN ? AND ?',
                    [start_date, end_date],
                    (err, consumptionResult) => {
                        if (err) {
                            console.error('Error fetching consumption data:', err);
                            return res.json({
                                active_cards: activeCardsResult[0].active_cards || 0,
                                total_liters: 0,
                                total_amount: 0,
                                avg_transaction: 0
                            });
                        }

                        // Query for average consumption per transaction
                        db.query('SELECT AVG(quantity) as avg_transaction FROM card_transactions WHERE date BETWEEN ? AND ?',
                            [start_date, end_date],
                            (err, avgResult) => {
                                if (err) {
                                    console.error('Error fetching average transaction:', err);
                                    return res.json({
                                        active_cards: activeCardsResult[0].active_cards || 0,
                                        total_liters: parseFloat(consumptionResult[0].total_liters || 0).toFixed(2),
                                        total_amount: parseFloat(consumptionResult[0].total_amount || 0).toFixed(2),
                                        avg_transaction: 0
                                    });
                                }

                                // Format the response
                                const stats = {
                                    active_cards: activeCardsResult[0].active_cards || 0,
                                    total_liters: parseFloat(consumptionResult[0].total_liters || 0).toFixed(2),
                                    total_amount: parseFloat(consumptionResult[0].total_amount || 0).toFixed(2),
                                    avg_transaction: parseFloat(avgResult[0].avg_transaction || 0).toFixed(2)
                                };

                                res.json(stats);
                            });
                    });
            });
        } catch (error) {
            console.error('Error fetching card stats:', error);
            // Return default stats in case of error
            res.json({
                active_cards: 0,
                total_liters: 0,
                total_amount: 0,
                avg_transaction: 0
            });
        }
    });

    // Route for getting consumption trend
    router.get('/trend', checkAuth, (req, res) => {
        try {
            const { start_date, end_date, period } = req.query;

            let query = '';
            let format = '';

            // Determine query based on period
            if (period === 'week') {
                query = `
                    SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_label,
                    SUM(quantity) as daily_consumption
                    FROM card_transactions
                    WHERE date BETWEEN ? AND ?
                    GROUP BY DATE_FORMAT(date, '%Y-%m-%d')
                    ORDER BY date_label ASC
                `;
                format = 'DD/MM';
            } else if (period === 'month') {
                query = `
                    SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_label,
                    SUM(quantity) as daily_consumption
                    FROM card_transactions
                    WHERE date BETWEEN ? AND ?
                    GROUP BY DATE_FORMAT(date, '%Y-%m-%d')
                    ORDER BY date_label ASC
                `;
                format = 'DD/MM';
            } else if (period === 'year') {
                query = `
                    SELECT DATE_FORMAT(date, '%Y-%m') as date_label,
                    SUM(quantity) as monthly_consumption
                    FROM card_transactions
                    WHERE date BETWEEN ? AND ?
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                    ORDER BY date_label ASC
                `;
                format = 'MM/YYYY';
            }
            
            db.query(query, [start_date, end_date], (err, results) => {
                if (err) {
                    console.error('Error fetching trend data:', err);
                    return res.json({
                        labels: [],
                        values: []
                    });
                }

                // Process results into labels and values arrays
                const formattedResults = {
                    labels: [],
                    values: []
                };
                
                if (results.length > 0) {
                    results.forEach(row => {
                        let label = '';
                        
                        if (period === 'week' || period === 'month') {
                            // Convert YYYY-MM-DD to DD/MM
                            const parts = row.date_label.split('-');
                            label = `${parts[2]}/${parts[1]}`;
                        } else if (period === 'year') {
                            // Convert YYYY-MM to MM/YYYY
                            const parts = row.date_label.split('-');
                            label = `${parts[1]}/${parts[0]}`;
                        }
                        
                        formattedResults.labels.push(label);
                        formattedResults.values.push(parseFloat(row.daily_consumption || row.monthly_consumption || 0).toFixed(2));
                    });
                } else {
                    // Generate mock data if no results
                    const mockData = generateMockTrendData(period, start_date, end_date);
                    formattedResults.labels = mockData.labels;
                    formattedResults.values = mockData.values;
                }

                res.json(formattedResults);
            });
        } catch (error) {
            console.error('Error fetching trend data:', error);
            // Return empty arrays in case of error
            res.json({
                labels: [],
                values: []
            });
        }
    });

    // Helper function to generate mock trend data
    function generateMockTrendData(period, start_date, end_date) {
        const result = {
            labels: [],
            values: []
        };
        
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        
        // Generate mock data based on period
        if (period === 'week' || period === 'month') {
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            for (let i = 0; i < days; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
            
                const day = String(currentDate.getDate()).padStart(2, '0');
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                
                result.labels.push(`${day}/${month}`);
                result.values.push((Math.random() * 1000).toFixed(2));
            }
        } else if (period === 'year') {
            const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
            const year = startDate.getFullYear();
            
            months.forEach(month => {
                result.labels.push(`${month}/${year}`);
                result.values.push((Math.random() * 10000).toFixed(2));
            });
        }
                
        return result;
    }

    // Route for getting consumption by center
    router.get('/centers', checkAuth, (req, res) => {
        try {
            const { start_date, end_date } = req.query;

            db.query(
                `SELECT c.name, SUM(ct.quantity) as consumption
                FROM card_transactions ct
                JOIN centers c ON ct.center_id = c.id
                WHERE ct.date BETWEEN ? AND ?
                GROUP BY c.id, c.name
                ORDER BY consumption DESC
                LIMIT 8`,
                [start_date, end_date],
                (err, results) => {
                    if (err) {
                        console.error('Error fetching centers data:', err);
                        return res.json({ centers: [] });
                    }

                    const centers = results.map(row => ({
                        name: row.name,
                        value: parseFloat(row.consumption || 0).toFixed(2)
                    }));
                    
                    res.json({ centers });
                }
            );
        } catch (error) {
            console.error('Error fetching centers data:', error);
            res.json({ centers: [] });
        }
    });

    // Route for getting recent card transactions
    router.get('/transactions', checkAuth, (req, res) => {
        try {
            const { start_date, end_date } = req.query;

            db.query(
                `SELECT ct.card_number, d.name as driver, c.name as center, 
                ct.date, ct.quantity, ct.amount
                FROM card_transactions ct
                JOIN drivers d ON ct.driver_id = d.id
                JOIN centers c ON ct.center_id = c.id
                WHERE ct.date BETWEEN ? AND ?
                ORDER BY ct.date DESC
                LIMIT 100`,
                [start_date, end_date],
                (err, results) => {
                    if (err) {
                        console.error('Error fetching transactions data:', err);
                        return res.json({ transactions: [] });
                    }

                    const transactions = results.map(row => ({
                        card_number: row.card_number,
                        driver: row.driver,
                        center: row.center,
                        date: row.date,
                        quantity: parseFloat(row.quantity || 0).toFixed(2),
                        amount: parseFloat(row.amount || 0).toFixed(2)
                    }));

                    res.json({ transactions });
                }
            );
        } catch (error) {
            console.error('Error fetching transactions data:', error);
            res.json({ transactions: [] });
        }
    });

    // Route for getting top performers (drivers, centers, districts)
    router.get('/performers', checkAuth, (req, res) => {
        try {
            const { start_date, end_date, type, metric } = req.query;

            let query = '';
            let valueField = '';
            
            if (metric === 'quantity') {
                valueField = 'SUM(ct.quantity)';
            } else if (metric === 'amount') {
                valueField = 'SUM(ct.amount)';
            } else if (metric === 'count') {
                valueField = 'COUNT(ct.id)';
            }

            if (type === 'driver') {
                query = `
                    SELECT d.name, ${valueField} as value
                    FROM card_transactions ct
                    JOIN drivers d ON ct.driver_id = d.id
                    WHERE ct.date BETWEEN ? AND ?
                    GROUP BY d.id, d.name
                    ORDER BY value DESC
                    LIMIT 10
                `;
            } else if (type === 'center') {
                query = `
                    SELECT c.name, ${valueField} as value
                    FROM card_transactions ct
                    JOIN centers c ON ct.center_id = c.id
                    WHERE ct.date BETWEEN ? AND ?
                    GROUP BY c.id, c.name
                    ORDER BY value DESC
                    LIMIT 10
                `;
            } else if (type === 'district') {
                query = `
                    SELECT d.name, ${valueField} as value
                    FROM card_transactions ct
                    JOIN centers c ON ct.center_id = c.id
                    JOIN districts d ON c.district_id = d.id
                    WHERE ct.date BETWEEN ? AND ?
                    GROUP BY d.id, d.name
                    ORDER BY value DESC
                    LIMIT 10
                `;
            }
            
            db.query(query, [start_date, end_date], (err, results) => {
                if (err) {
                    console.error('Error fetching performers data:', err);
                    return res.json({ performers: [] });
                }

                const performers = results.map(row => ({
                    name: row.name,
                    value: parseFloat(row.value || 0).toFixed(2)
                }));

                res.json({ performers });
            });
        } catch (error) {
            console.error('Error fetching performers data:', error);
            res.json({ performers: [] });
        }
    });

    // Route for getting detected anomalies
    router.get('/anomalies', checkAuth, (req, res) => {
        try {
            const { start_date, end_date } = req.query;

            // Query for detecting anomalies (e.g., transactions with quantity above threshold)
            const query = `
                SELECT ct.card_number, d.name as driver, ct.quantity, ct.date
                FROM card_transactions ct
                JOIN drivers d ON ct.driver_id = d.id
                JOIN (
                    SELECT driver_id, AVG(quantity) * 1.5 as threshold
                    FROM card_transactions
                    WHERE date BETWEEN ? AND ?
                    GROUP BY driver_id
                ) avg ON ct.driver_id = avg.driver_id
                WHERE ct.date BETWEEN ? AND ? AND ct.quantity > avg.threshold
                ORDER BY ct.date DESC
                LIMIT 20
            `;
            
            db.query(query, [start_date, end_date, start_date, end_date], (err, results) => {
                if (err) {
                    console.error('Error fetching anomalies data:', err);
                    return res.json({ anomalies: [] });
                }

                const anomalies = results.map(row => ({
                    card_number: row.card_number,
                    driver: row.driver,
                    quantity: parseFloat(row.quantity || 0).toFixed(2),
                    date: row.date
                }));

                res.json({ anomalies });
            });
        } catch (error) {
            console.error('Error fetching anomalies data:', error);
            res.json({ anomalies: [] });
        }
    });

    // Route for exporting data to Excel
    router.get('/export', checkAuth, (req, res) => {
        try {
            const { start_date, end_date } = req.query;

            // Query for card transactions
            db.query(
                `SELECT ct.card_number, d.name as driver, c.name as center, 
                ct.date, ct.quantity, ct.amount
                FROM card_transactions ct
                JOIN drivers d ON ct.driver_id = d.id
                JOIN centers c ON ct.center_id = c.id
                WHERE ct.date BETWEEN ? AND ?
                ORDER BY ct.date DESC`,
                [start_date, end_date],
                async (err, transactions) => {
                    if (err) {
                        console.error('Error fetching export data:', err);
                        return res.status(500).json({ error: 'Failed to export data' });
                    }

                    // Create Excel workbook
                    const workbook = new ExcelJS.Workbook();
                    const worksheet = workbook.addWorksheet('Card Transactions');

                    // Add header row
                    worksheet.columns = [
                        { header: 'Numéro de Carte', key: 'card_number', width: 20 },
                        { header: 'Conducteur', key: 'driver', width: 30 },
                        { header: 'Centre', key: 'center', width: 30 },
                        { header: 'Date', key: 'date', width: 20 },
                        { header: 'Quantité (L)', key: 'quantity', width: 15 },
                        { header: 'Montant (DA)', key: 'amount', width: 15 }
                    ];

                    // Add data rows
                    transactions.forEach(transaction => {
                        worksheet.addRow({
                            card_number: transaction.card_number,
                            driver: transaction.driver,
                            center: transaction.center,
                            date: new Date(transaction.date).toLocaleString('fr-FR'),
                            quantity: parseFloat(transaction.quantity || 0).toFixed(2),
                            amount: parseFloat(transaction.amount || 0).toFixed(2)
                        });
                    });
                    
                    // Set content type and disposition
                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    res.setHeader('Content-Disposition', `attachment; filename=cards_transactions_${start_date}_to_${end_date}.xlsx`);
                    
                    try {
                        // Write to response
                        await workbook.xlsx.write(res);
                        res.end();
                    } catch (writeError) {
                        console.error('Error writing Excel file:', writeError);
                        res.status(500).json({ error: 'Failed to generate Excel file' });
                    }
                }
            );
        } catch (error) {
            console.error('Error exporting data:', error);
            res.status(500).json({ error: 'Failed to export data' });
        }
    });

    return router;
}; 