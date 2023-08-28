const sqlite3 = require('sqlite3').verbose();
const dbFile = __dirname + '/logger.db';

let db = new sqlite3.Database(dbFile, sqlite3.OPEN_READWRITE, (err) => {
    if (err) throw err;
    console.log('database connected')
})

module.exports = db;
