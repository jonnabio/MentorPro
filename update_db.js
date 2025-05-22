const Database = require('better-sqlite3');

try {
    console.log('Attempting to connect to database...');
    const db = new Database('quiz.db');
    console.log('Database connection successful');

    // Update difficulties to standardized values
    const updateDifficulties = db.prepare(`
        UPDATE questions 
        SET difficulty = CASE 
            WHEN difficulty = 'Principiante' THEN 'easy'
            WHEN difficulty = 'Intermedio' THEN 'medium'
            WHEN difficulty = 'Avanzado' THEN 'hard'
            ELSE difficulty 
        END
    `);
    
    const difficultyResult = updateDifficulties.run();
    console.log('Updated difficulties:', difficultyResult);

    // Update subjects to standardized values
    const updateSubjects = db.prepare(`
        UPDATE questions 
        SET subject = CASE 
            WHEN subject = 'Estudios Sociales' THEN 'Social Studies'
            WHEN subject = 'Español' THEN 'Espanol'
            WHEN subject = 'Matemáticas' THEN 'Matematicas'
            ELSE subject 
        END
    `);
    
    const subjectResult = updateSubjects.run();
    console.log('Updated subjects:', subjectResult);

    // Check current values
    console.log('\nCurrent values in database:');
    const difficulties = db.prepare('SELECT DISTINCT difficulty FROM questions').all();
    console.log('Unique difficulties:', difficulties);
    
    const subjects = db.prepare('SELECT DISTINCT subject FROM questions').all();
    console.log('Unique subjects:', subjects);

    db.close();
} catch (err) {
    console.error('Error:', err);
}
