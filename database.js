// Database Manager - Dual mode: PostgreSQL (production) + SQLite (development)
const { Pool } = require('pg');

class DatabaseManager {
  constructor() {
    if (process.env.DATABASE_URL || process.env.SUPABASE_URL) {
      // Production/Supabase - PostgreSQL
      const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL;
      this.pool = new Pool({
        connectionString: connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      this.dbType = 'postgres';
      console.log('🗄️ Using PostgreSQL (Supabase)');
    } else {
      // Development - SQLite
      const sqlite3 = require('sqlite3').verbose();
      this.db = new sqlite3.Database('quiz.db');
      this.dbType = 'sqlite';
      console.log('🗄️ Using SQLite (Development)');
    }
  }

  async init() {
    return this.initializeTables();
  }

  async initializeTables() {
    console.log(`🔧 Initializing ${this.dbType} database tables...`);
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        // Create questions table
        await client.query(`
          CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            subject VARCHAR(100),
            topic VARCHAR(255),
            question TEXT NOT NULL,
            options JSONB NOT NULL,
            correct_answer INTEGER NOT NULL,
            difficulty VARCHAR(20) DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create indexes for better performance
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
        `);

        console.log('✅ PostgreSQL tables initialized successfully');
      } catch (error) {
        console.error('❌ PostgreSQL initialization error:', error);
        throw error;
      } finally {
        client.release();
      }
    } else {
      // SQLite initialization (compatible with existing structure)
      return new Promise((resolve, reject) => {
        this.db.serialize(() => {
          this.db.run(`CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT,
            topic TEXT,
            question TEXT NOT NULL,
            options TEXT NOT NULL,
            correct_answer INTEGER NOT NULL,
            difficulty TEXT DEFAULT 'medium',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) {
              console.error('❌ SQLite initialization error:', err);
              reject(err);
            } else {
              console.log('✅ SQLite tables initialized successfully');
              resolve();
            }
          });
        });
      });
    }
  }

  async insertQuestions(questions) {
    if (!questions || questions.length === 0) {
      console.log('⚠️ No questions to insert');
      return;
    }

    console.log(`💾 Inserting ${questions.length} questions into ${this.dbType} database`);
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const q of questions) {
          await client.query(`
            INSERT INTO questions (subject, topic, question, options, correct_answer, difficulty) 
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            q.subject, 
            q.topic, 
            q.question, 
            JSON.stringify(q.options), 
            q.correctAnswer, 
            q.difficulty || 'medium'
          ]);
        }
        
        await client.query('COMMIT');
        console.log('✅ Questions inserted successfully into PostgreSQL');
        return questions.length;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error inserting questions into PostgreSQL:', error);
        throw error;
      } finally {
        client.release();
      }
    } else {
      // SQLite insert (maintaining existing behavior)
      return new Promise((resolve, reject) => {
        const stmt = this.db.prepare(`
          INSERT INTO questions (subject, topic, question, options, correct_answer, difficulty) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        let insertedCount = 0;
        questions.forEach(q => {
          stmt.run(
            q.subject, 
            q.topic, 
            q.question, 
            JSON.stringify(q.options), 
            q.correctAnswer, 
            q.difficulty || 'medium',
            function(err) {
              if (err) {
                console.error('❌ SQLite insert error:', err);
              } else {
                insertedCount++;
              }
            }
          );
        });
        
        stmt.finalize((err) => {
          if (err) {
            console.error('❌ SQLite finalize error:', err);
            reject(err);
          } else {
            console.log(`✅ ${insertedCount} questions inserted successfully into SQLite`);
            resolve(insertedCount);
          }
        });
      });
    }
  }

  async getQuestions(filters = {}) {
    console.log(`🔍 Querying ${this.dbType} database with filters:`, filters);
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        let query = 'SELECT * FROM questions WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (filters.subject) {
          query += ` AND subject = $${++paramCount}`;
          params.push(filters.subject);
        }
        if (filters.topic) {
          query += ` AND topic ILIKE $${++paramCount}`;
          params.push(`%${filters.topic}%`);
        }
        if (filters.difficulty) {
          query += ` AND difficulty = $${++paramCount}`;
          params.push(filters.difficulty);
        }

        query += ' ORDER BY created_at DESC';
        
        if (filters.limit) {
          query += ` LIMIT $${++paramCount}`;
          params.push(parseInt(filters.limit));
        }

        const result = await client.query(query, params);
        
        // Parse JSON options back to array for PostgreSQL
        const questions = result.rows.map(row => ({
          ...row,
          options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options
        }));
        
        console.log(`✅ Found ${questions.length} questions in PostgreSQL`);
        return questions;
      } catch (error) {
        console.error('❌ Error querying PostgreSQL:', error);
        throw error;
      } finally {
        client.release();
      }
    } else {
      // SQLite query (maintaining existing behavior)
      return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM questions WHERE 1=1';
        const params = [];

        if (filters.subject) {
          query += ' AND subject = ?';
          params.push(filters.subject);
        }
        if (filters.topic) {
          query += ' AND topic LIKE ?';
          params.push(`%${filters.topic}%`);
        }
        if (filters.difficulty) {
          query += ' AND difficulty = ?';
          params.push(filters.difficulty);
        }

        query += ' ORDER BY created_at DESC';
        
        if (filters.limit) {
          query += ' LIMIT ?';
          params.push(parseInt(filters.limit));
        }

        this.db.all(query, params, (err, rows) => {
          if (err) {
            console.error('❌ SQLite query error:', err);
            reject(err);
          } else {
            // Parse JSON options for SQLite
            const questions = rows.map(row => ({
              ...row,
              options: JSON.parse(row.options)
            }));
            console.log(`✅ Found ${questions.length} questions in SQLite`);
            resolve(questions);
          }
        });
      });
    }
  }

  async getRandomQuestions(filters = {}) {
    console.log(`🎲 Getting random questions from ${this.dbType} with filters:`, filters);
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        let query = 'SELECT * FROM questions WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (filters.subject) {
          query += ` AND subject = $${++paramCount}`;
          params.push(filters.subject);
        }
        if (filters.topic) {
          query += ` AND topic ILIKE $${++paramCount}`;
          params.push(`%${filters.topic}%`);
        }
        if (filters.difficulty) {
          query += ` AND difficulty = $${++paramCount}`;
          params.push(filters.difficulty);
        }

        query += ' ORDER BY RANDOM()';
        
        if (filters.limit) {
          query += ` LIMIT $${++paramCount}`;
          params.push(parseInt(filters.limit));
        }

        const result = await client.query(query, params);
        
        const questions = result.rows.map(row => ({
          ...row,
          options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options
        }));
        
        console.log(`✅ Found ${questions.length} random questions`);
        return questions;
      } catch (error) {
        console.error('❌ Error getting random questions:', error);
        throw error;
      } finally {
        client.release();
      }
    } else {
      // SQLite random query
      return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM questions WHERE 1=1';
        const params = [];

        if (filters.subject) {
          query += ' AND subject = ?';
          params.push(filters.subject);
        }
        if (filters.topic) {
          query += ' AND topic LIKE ?';
          params.push(`%${filters.topic}%`);
        }
        if (filters.difficulty) {
          query += ' AND difficulty = ?';
          params.push(filters.difficulty);
        }

        query += ' ORDER BY RANDOM()';
        
        if (filters.limit) {
          query += ' LIMIT ?';
          params.push(parseInt(filters.limit));
        }

        this.db.all(query, params, (err, rows) => {
          if (err) {
            console.error('❌ SQLite random query error:', err);
            reject(err);
          } else {
            const questions = rows.map(row => ({
              ...row,
              options: JSON.parse(row.options)
            }));
            console.log(`✅ Found ${questions.length} random questions`);
            resolve(questions);
          }
        });
      });
    }
  }

  async getStats() {
    console.log(`📊 Getting database statistics from ${this.dbType}`);
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        const totalResult = await client.query('SELECT COUNT(*) as total FROM questions');
        const subjectResult = await client.query(`
          SELECT subject, COUNT(*) as count 
          FROM questions 
          GROUP BY subject 
          ORDER BY count DESC
        `);
        const difficultyResult = await client.query(`
          SELECT difficulty, COUNT(*) as count 
          FROM questions 
          GROUP BY difficulty
        `);

        return {
          total: parseInt(totalResult.rows[0].total),
          bySubject: subjectResult.rows,
          byDifficulty: difficultyResult.rows
        };
      } catch (error) {
        console.error('❌ Error getting PostgreSQL stats:', error);
        throw error;
      } finally {
        client.release();
      }
    } else {
      // SQLite stats
      return new Promise((resolve, reject) => {
        this.db.serialize(() => {
          const stats = { total: 0, bySubject: [], byDifficulty: [] };
          
          this.db.get('SELECT COUNT(*) as total FROM questions', (err, row) => {
            if (err) return reject(err);
            stats.total = row.total;
            
            this.db.all(`
              SELECT subject, COUNT(*) as count 
              FROM questions 
              GROUP BY subject 
              ORDER BY count DESC
            `, (err, rows) => {
              if (err) return reject(err);
              stats.bySubject = rows;
              
              this.db.all(`
                SELECT difficulty, COUNT(*) as count 
                FROM questions 
                GROUP BY difficulty
              `, (err, rows) => {
                if (err) return reject(err);
                stats.byDifficulty = rows;
                console.log('✅ SQLite stats retrieved');
                resolve(stats);
              });
            });
          });
        });
      });
    }
  }

  async insertQuestion(subject, topic, learningObjective, question, options, correctAnswer, difficulty) {
    console.log('📝 Inserting single question...');
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        const query = `
          INSERT INTO questions (subject, topic, learning_objective, question, options, correct_answer, difficulty)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `;
        const result = await client.query(query, [
          subject, topic, learningObjective, question, 
          JSON.stringify(options), correctAnswer, difficulty
        ]);
        console.log('✅ Question inserted into PostgreSQL with ID:', result.rows[0].id);
        return { id: result.rows[0].id };
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        const query = `
          INSERT INTO questions (subject, topic, learning_objective, question, options, correct_answer, difficulty)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        this.db.run(query, [
          subject, topic, learningObjective, question,
          JSON.stringify(options), correctAnswer, difficulty
        ], function(err) {
          if (err) {
            console.error('❌ Error inserting question into SQLite:', err);
            reject(err);
          } else {
            console.log('✅ Question inserted into SQLite with ID:', this.lastID);
            resolve({ id: this.lastID });
          }
        });
      });
    }
  }

  async getSubjects() {
    console.log('📋 Getting unique subjects...');
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        const query = 'SELECT DISTINCT subject FROM questions ORDER BY subject';
        const result = await client.query(query);
        const subjects = result.rows.map(row => row.subject);
        console.log('✅ Found subjects in PostgreSQL:', subjects);
        return subjects;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        const query = 'SELECT DISTINCT subject FROM questions ORDER BY subject';
        this.db.all(query, [], (err, rows) => {
          if (err) {
            console.error('❌ Error getting subjects from SQLite:', err);
            reject(err);
          } else {
            const subjects = rows.map(row => row.subject);
            console.log('✅ Found subjects in SQLite:', subjects);
            resolve(subjects);
          }
        });
      });
    }
  }

  async getTopics(subject = null) {
    console.log('📋 Getting unique topics...', subject ? `for subject: ${subject}` : '');
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        let query = 'SELECT DISTINCT topic FROM questions';
        const params = [];
        
        if (subject) {
          query += ' WHERE subject = $1';
          params.push(subject);
        }
        
        query += ' ORDER BY topic';
        const result = await client.query(query, params);
        const topics = result.rows.map(row => row.topic);
        console.log('✅ Found topics in PostgreSQL:', topics);
        return topics;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        let query = 'SELECT DISTINCT topic FROM questions';
        const params = [];
        
        if (subject) {
          query += ' WHERE subject = ?';
          params.push(subject);
        }
        
        query += ' ORDER BY topic';
        this.db.all(query, params, (err, rows) => {
          if (err) {
            console.error('❌ Error getting topics from SQLite:', err);
            reject(err);
          } else {
            const topics = rows.map(row => row.topic);
            console.log('✅ Found topics in SQLite:', topics);
            resolve(topics);
          }
        });
      });
    }
  }

  async deleteQuestion(id) {
    console.log('🗑️ Deleting question with ID:', id);
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        const query = 'DELETE FROM questions WHERE id = $1';
        const result = await client.query(query, [id]);
        const success = result.rowCount > 0;
        console.log(success ? '✅ Question deleted from PostgreSQL' : '❌ Question not found in PostgreSQL');
        return { success };
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        const query = 'DELETE FROM questions WHERE id = ?';
        this.db.run(query, [id], function(err) {
          if (err) {
            console.error('❌ Error deleting question from SQLite:', err);
            reject(err);
          } else {
            const success = this.changes > 0;
            console.log(success ? '✅ Question deleted from SQLite' : '❌ Question not found in SQLite');
            resolve({ success });
          }
        });
      });
    }
  }

  async updateQuestion(id, data) {
    console.log('✏️ Updating question with ID:', id);
    
    const { question, options, correctAnswer, subject, topic, difficulty } = data;
    
    if (this.dbType === 'postgres') {
      const client = await this.pool.connect();
      try {
        const query = `
          UPDATE questions 
          SET question = $1, options = $2, correct_answer = $3, subject = $4, topic = $5, difficulty = $6
          WHERE id = $7
          RETURNING *
        `;
        const result = await client.query(query, [
          question, JSON.stringify(options), correctAnswer, subject, topic, difficulty, id
        ]);
        
        if (result.rowCount > 0) {
          const updatedQuestion = result.rows[0];
          updatedQuestion.options = JSON.parse(updatedQuestion.options);
          console.log('✅ Question updated in PostgreSQL');
          return { success: true, question: updatedQuestion };
        } else {
          console.log('❌ Question not found in PostgreSQL');
          return { success: false };
        }
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        const updateQuery = `
          UPDATE questions 
          SET question = ?, options = ?, correct_answer = ?, subject = ?, topic = ?, difficulty = ?
          WHERE id = ?
        `;
        
        this.db.run(updateQuery, [
          question, JSON.stringify(options), correctAnswer, subject, topic, difficulty, id
        ], function(err) {
          if (err) {
            console.error('❌ Error updating question in SQLite:', err);
            reject(err);
          } else if (this.changes > 0) {
            // Get the updated question
            this.db.get('SELECT * FROM questions WHERE id = ?', [id], (err, row) => {
              if (err) {
                reject(err);
              } else {
                row.options = JSON.parse(row.options);
                console.log('✅ Question updated in SQLite');
                resolve({ success: true, question: row });
              }
            });
          } else {
            console.log('❌ Question not found in SQLite');
            resolve({ success: false });
          }
        });
      });
    }
  }

  async close() {
    console.log(`🔄 Closing ${this.dbType} database connection`);
    if (this.dbType === 'postgres') {
      await this.pool.end();
    } else {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing SQLite:', err);
        } else {
          console.log('✅ SQLite connection closed');
        }
      });
    }
  }
}

module.exports = DatabaseManager;