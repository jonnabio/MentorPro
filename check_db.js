const Database = require('better-sqlite3');

try {
    console.log('Attempting to connect to database...');
    const db = new Database('quiz.db');
    console.log('Database connection successful');

    // Check if table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='questions'").all();
    console.log('Tables:', tables);

    if (tables.length > 0) {
        // Check difficulties
        const difficulties = db.prepare('SELECT DISTINCT difficulty FROM questions').all();
        console.log('Unique difficulties:', difficulties);

        // Check subjects
        const subjects = db.prepare('SELECT DISTINCT subject FROM questions').all();
        console.log('Unique subjects:', subjects);
    } else {
        console.log('Questions table does not exist');
    }

    db.close();
} catch (err) {
    console.error('Error:', err);
}
