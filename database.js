const Pool = require("pg").Pool

const pool = new Pool({
    user: 'postgres',
    password: 'Xavier*14',
    database: 'MyDatabase',
    host: 'localhost',
    port: 5432
})

module.exports = pool