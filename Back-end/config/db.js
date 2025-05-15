const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sqlps',
    database: 'projet'
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);



        // commented out for debugging purposes

        // console.error('Connection config:', {
        //     host: db.config.host,
        //     user: db.config.user,
        //     database: db.config.database,
        //     port: db.config.port
        // });
        return;
    }
    // console.log('Connected to MySQL database with config:', {
    //     host: db.config.host,
    //     user: db.config.user,
    //     database: db.config.database,
    //     port: db.config.port
    // });

    // Test query to verify connection and table access
    // db.query('SHOW TABLES', (err, results) => {
    //     if (err) {
    //         console.error('Error querying tables:', err);
    //         return;
    //     }
    //     console.log('Available tables:', results);
    // });
});


module.exports = db;