require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { OpenAI } = require('openai');

const app = express();

// Initialize database with better error handling
let db;
try {
    db = new Database('quiz.db');
    // Test the connection
    db.prepare('SELECT 1').get();
    console.log('Database connection successful');
} catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1); // Exit if we can't connect to the database
}

// Initialize OpenAI with better error handling
let openai;
try {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('OpenAI initialization successful');
} catch (error) {
    console.error('OpenAI initialization error:', error);
    process.exit(1); // Exit if we can't initialize OpenAI
}

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    exposedHeaders: ['Content-Type'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.static('public'));

// Initialize database - only create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    topic TEXT,
    learning_objective TEXT,
    question TEXT,
    options TEXT,
    correct_answer INTEGER,
    difficulty TEXT DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Classify the subject and topic using OpenAI
async function classifyDescription(description) {  const classificationPrompt = `
    Analiza el siguiente texto y clasifica la materia y el tema.
    IMPORTANTE: La materia DEBE ser EXACTAMENTE una de estas: Espanol, Matematicas, Ciencias, Social Studies.
    No uses tildes ni caracteres especiales en las materias.
    
    Texto: "${description}"
    
    Responde solo con un objeto JSON con este formato exacto:
    {
      "subject": "una de las materias válidas exactamente como están escritas arriba",
      "topic": "tema específico del texto"
    }
  `;
  try {
    // Log the OpenAI configuration
    console.log('OpenAI Configuration:', {
      apiKey: process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-4) : 'not set',
      model: 'gpt-3.5-turbo',
    });
    
    console.log('Sending classification request to OpenAI...');
    console.log('Classification prompt:', classificationPrompt);
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: classificationPrompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.3,
    });
    
    console.log('OpenAI Response:', {
      status: 'success',
      content: completion.choices[0].message.content,
      model: completion.model,
      usage: completion.usage
    });const classification = JSON.parse(completion.choices[0].message.content);
    console.log('Raw classification:', classification);
    
    // Validate the subject
    const validSubjects = ['Espanol', 'Matematicas', 'Ciencias', 'Social Studies'];
    if (!validSubjects.includes(classification.subject)) {
      throw new Error('Invalid subject. Must be one of: ' + validSubjects.join(', '));
    }
    
    return classification;  } catch (error) {
    console.error('Error classifying description:', {
      error: error.message,
      stack: error.stack,
      description
    });
    
    // More specific error messages based on the error type
    if (error.message.includes('JSON')) {
      throw new Error('Error al procesar la respuesta de clasificación. Formato inválido.');
    } else if (error.message.includes('API key')) {
      throw new Error('Error de configuración del servidor.');
    } else {
      throw new Error('Error al clasificar la descripción: ' + error.message);
    }
  }
}

// Generate questions using OpenAI with retry mechanism
async function generateQuestions(description, classification) {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`Generating questions for all difficulty levels (Attempt ${retries + 1}/${maxRetries})`);
      
      const messages = [
        {
          role: "system",
          content: `Eres un experto en generación de preguntas educativas. 
                   Tu tarea es crear EXACTAMENTE 9 preguntas en español: 
                   3 de nivel Principiante (easy)
                   3 de nivel Intermedio (medium)
                   3 de nivel Avanzado (hard)`
        },
        {
          role: "user",
          content: `Genera 9 preguntas de opción múltiple en español con esta distribución:

          Materia: ${classification.subject}
          Tema: ${classification.topic}
          Descripción: ${description}

          REQUISITOS:
          - 3 preguntas de nivel Principiante (easy): conceptos básicos y directos
          - 3 preguntas de nivel Intermedio (medium): comprensión moderada
          - 3 preguntas de nivel Avanzado (hard): pensamiento crítico

          Responde ÚNICAMENTE con un objeto JSON válido que contenga un array de 9 preguntas.
          El formato JSON DEBE ser EXACTAMENTE el siguiente, sin texto adicional antes ni después:
          {
            "questions": [
              {
                "subject": "string (ej: Espanol)",
                "topic": "string (ej: Palabras homofonas)",
                "question": "string (texto de la pregunta)",
                "options": ["string (opción 1)", "string (opción 2)", "string (opción 3)", "string (opción 4)"],
                "correctAnswer": "number (0, 1, 2, o 3)",
                "difficulty": "string (easy, medium, o hard)"
              }
              // ... 8 preguntas más siguiendo el mismo formato ...
            ]
          }
          Asegúrate de que todas las claves y valores string estén entre comillas dobles y que los números no tengan comillas.
          Verifica que haya exactamente 3 preguntas para cada nivel de dificultad (easy, medium, hard).
          `
        }
      ];

      // Use GPT-4 for better understanding of the task
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k", // Consider using a more capable model like gpt-4 if issues persist
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000,
        presence_penalty: 0.2,
        frequency_penalty: 0.3,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content.trim();
      console.log(`Generated content (Attempt ${retries + 1}):`, content);
      
      try {
        const parsedResponse = JSON.parse(content);
        
        if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
          throw new Error('Invalid response format: missing questions array');
        }

        if (parsedResponse.questions.length !== 9) {
          throw new Error(`Expected exactly 9 questions, got ${parsedResponse.questions.length}`);
        }

        // Count questions by difficulty
        const difficultyCount = {easy: 0, medium: 0, hard: 0};
        
        parsedResponse.questions.forEach((q, i) => {
          if (!q.subject || !q.topic || !q.question || !Array.isArray(q.options) || 
              q.options.length !== 4 || typeof q.correctAnswer !== 'number' ||
              q.correctAnswer < 0 || q.correctAnswer > 3 || !q.difficulty) {
            throw new Error(`Invalid question format at index ${i}`);
          }
          
          if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
            throw new Error(`Invalid difficulty "${q.difficulty}" for question at index ${i}`);
          }
          difficultyCount[q.difficulty]++;
        });

        if (difficultyCount.easy !== 3 || difficultyCount.medium !== 3 || difficultyCount.hard !== 3) {
          throw new Error(`Incorrect difficulty distribution. Expected 3 of each, got: Principiante=${difficultyCount.easy}, Intermedio=${difficultyCount.medium}, Avanzado=${difficultyCount.hard}`);
        }

        console.log(`Successfully generated and validated all questions (Attempt ${retries + 1}):`, {
          total: parsedResponse.questions.length,
          byDifficulty: difficultyCount
        });

        return { questions: parsedResponse.questions }; // Success, return the questions
      } catch (parseError) {
        console.error(`Error parsing or validating response (Attempt ${retries + 1}):`, parseError);
        console.error(`Raw content that caused error (Attempt ${retries + 1}):`, content);
        // If parsing or validation fails, it's likely a formatting issue, so retry
        retries++;
        console.log(`Retrying question generation... (Attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Wait before retrying
      }
    } catch (error) {
      console.error(`Error during question generation process (Attempt ${retries + 1}):`, {
        error: error.message,
        stack: error.stack,
        classification,
        description
      });
      
      // If it's an OpenAI API error (like rate limit), we might want to retry
      if (error.name === 'OpenAIError' && error.status === 429) {
         retries++;
         console.log(`Rate limit hit. Retrying question generation... (Attempt ${retries + 1}/${maxRetries})`);
         await new Promise(resolve => setTimeout(resolve, 5000 * retries)); // Wait longer for rate limit
      } else if (error.message.includes('API key')) {
         // Don't retry on API key errors
         throw new Error('Error de configuración del servidor.');
      }
      else {
        // For other errors, retry
        retries++;
        console.log(`Retrying question generation due to other error... (Attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Wait before retrying
      }
    }
  }

  // If all retries fail
  console.error(`Failed to generate valid questions after ${maxRetries} attempts.`);
  throw new Error('Failed to generate valid questions after multiple attempts.');
}

// Add helper functions for difficulty conversion
function normalizeSubject(subject) {
  if (subject === 'Social Studies') return 'Estudios Sociales';
  if (subject === 'Espanol') return 'Español';
  if (subject === 'Matematicas') return 'Matemáticas';
  return subject;
}

function displayDifficulty(dbDifficulty) {
  const mapping = {
    'easy': 'Principiante',
    'medium': 'Intermedio',
    'hard': 'Avanzado'
  };
  return mapping[dbDifficulty] || dbDifficulty;
}

function normalizeDifficulty(displayDifficulty) {
  const mapping = {
    'Principiante': 'easy',
    'Intermedio': 'medium',
    'Avanzado': 'hard'
  };
  return mapping[displayDifficulty] || displayDifficulty;
}

// API Endpoints
app.post('/api/generate', async (req, res) => {
  console.log('/api/generate: Received generate request:', req.body);
  try {
    const { description } = req.body;
    
    if (!description) {
      console.log('/api/generate: Missing description in request');
      return res.status(400).json({ error: 'Por favor ingresa una descripción' });
    }

    console.log('/api/generate: Processing request to generate questions for all difficulty levels');
    
    // First attempt to classify the description
    console.log('/api/generate: Classifying description:', description);
    const classification = await classifyDescription(description);
    console.log('/api/generate: Classification result:', classification);

    // Generate questions for all difficulty levels
    console.log('/api/generate: Calling generateQuestions...');
    const generatedQuestions = await generateQuestions(description, classification);
    console.log('/api/generate: generateQuestions returned:', generatedQuestions);
    
    // Store questions in database
    console.log('/api/generate: Storing generated questions in database...');
    const stmt = db.prepare(`
      INSERT INTO questions (subject, topic, learning_objective, question, options, correct_answer, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const questions = generatedQuestions.questions.map(q => {
      const result = stmt.run(
        q.subject,
        q.topic,
        description,
        q.question,
        JSON.stringify(q.options),
        q.correctAnswer,
        q.difficulty
      );
      console.log('/api/generate: Inserted question with ID:', result.lastInsertRowid);
      return { ...q, id: result.lastInsertRowid };
    });

    console.log('/api/generate: Successfully stored', questions.length, 'questions.');
    res.json({ questions });  } catch (error) {
    console.error('/api/generate: Server error during generation:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });    // Handle different types of errors with appropriate status codes and messages
    if (error.message.includes('Invalid subject')) {
      res.status(400).json({ 
        error: error.message 
      });
    } else if (error.message.includes('API key')) {
      console.error('/api/generate: OpenAI API Key error:', error);
      res.status(500).json({ 
        error: 'Error de configuración del servidor. Por favor contacte al administrador.' 
      });
    } else if (error.message.includes('JSON')) {
      res.status(500).json({ 
        error: 'Error al procesar la respuesta. Por favor intente de nuevo.' 
      });
    } else if (error.message.includes('clasificar')) {
      res.status(400).json({ 
        error: 'No se pudo clasificar la descripción. Por favor intente con una descripción más clara.' 
      });
    } else if (error.message.includes('generar')) {
      res.status(500).json({ 
        error: 'Error al generar las preguntas. Por favor intente de nuevo con una descripción diferente.' 
      });
    } else if (error.name === 'OpenAIError') {
      console.error('/api/generate: OpenAI API error:', error);
      res.status(500).json({ 
        error: 'Error en el servicio de OpenAI. Por favor intente de nuevo más tarde.' 
      });
    } else {
      console.error('/api/generate: Unexpected error:', error);
      res.status(500).json({ 
        error: 'Error inesperado. Por favor intente de nuevo.' 
      });
    }
  }
});

// Update the /api/questions endpoint to use the display conversions
app.get('/api/questions', async (req, res) => {
  try {
    const { subject, topic, difficulty, limit } = req.query;
    let query = 'SELECT * FROM questions';
    const params = [];

    // Build WHERE clause dynamically
    const conditions = [];
    if (subject) {
      conditions.push('subject = ?');
      params.push(subject);
    }
    if (topic) {
      conditions.push('topic = ?');
      params.push(topic);
    }
    if (difficulty) {
      conditions.push('difficulty = ?');
      params.push(normalizeDifficulty(difficulty));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY RANDOM()';  // Randomize questions for quizzes

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }    // Log query details
    console.log('Executing query:', {
      query,
      params,
      conditions
    });

    // Execute query
    const stmt = db.prepare(query);
    let questions = stmt.all(...params);

    // Parse the options JSON string and convert difficulties for each question
    questions = questions.map(q => {
      try {
        return {
          ...q,
          options: JSON.parse(q.options),
          difficulty: displayDifficulty(q.difficulty),
          subject: normalizeSubject(q.subject)
        };
      } catch (e) {
        console.error('Error parsing options for question:', {
          id: q.id,
          options: q.options,
          error: e.message
        });
        throw new Error('Error interno al procesar las preguntas');
      }
    });    // Return empty array instead of 404 when no questions found
    if (questions.length === 0) {
      return res.status(200).json({ 
        message: 'No se encontraron preguntas',
        questions: []
      });
    }

    res.json({ questions });
  } catch (error) {
    console.error('Error querying questions:', error);
    res.status(500).json({ error: 'Error al buscar preguntas' });
  }
});

// Add endpoint to get subjects from the database
app.get('/api/subjects', async (req, res) => {
  try {
    // Query the database for unique subjects
    const stmt = db.prepare('SELECT DISTINCT subject FROM questions ORDER BY subject');
    const subjects = stmt.all().map(row => row.subject);

    // If no subjects found in the database, provide default subjects
    if (!subjects || subjects.length === 0) {
      const defaultSubjects = ['Espanol', 'Matematicas', 'Ciencias', 'Social Studies'];
      res.json({ subjects: defaultSubjects });
      return;
    }

    res.json({ subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ 
      error: 'Error al obtener las materias. Por favor intente de nuevo.' 
    });
  }
});

// Add endpoint to get unique topics by subject
app.get('/api/topics', async (req, res) => {
  try {
    const { subject } = req.query;
    let query = 'SELECT DISTINCT topic FROM questions';
    const params = [];

    if (subject) {
      query += ' WHERE subject = ?';
      params.push(subject);
    }

    query += ' ORDER BY topic';

    const stmt = db.prepare(query);
    const topics = stmt.all(...params);

    res.json({ topics: topics.map(t => t.topic) });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ 
      error: 'Error al obtener los temas. Por favor intente de nuevo.' 
    });
  }
});

// Add endpoint to delete a question
app.delete('/api/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }
    
    res.json({ message: 'Pregunta eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Error al eliminar la pregunta. Por favor intente de nuevo.' });
  }
});

// Add endpoint to update a question
app.patch('/api/questions/:id', async (req, res) => {
  try {
    console.log('PATCH request received:', {
      params: req.params,
      body: req.body,
      headers: req.headers
    });

    const { id } = req.params;
    const { question, options, correctAnswer, subject, topic, difficulty } = req.body;
    
    // Set JSON content type
    res.setHeader('Content-Type', 'application/json');
    
    if (!question || !options || correctAnswer === undefined || !subject || !topic) {
      console.log('Validation failed:', { question, options, correctAnswer, subject, topic });
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ error: 'Se requieren exactamente 4 opciones' });
    }

    if (correctAnswer < 0 || correctAnswer > 3) {
      return res.status(400).json({ error: 'La respuesta correcta debe ser un número entre 0 y 3' });
    }

    // Normalize the difficulty value if provided
    const dbDifficulty = difficulty ? normalizeDifficulty(difficulty) : 'medium';

    const stmt = db.prepare(`
      UPDATE questions 
      SET question = ?, options = ?, correct_answer = ?, subject = ?, topic = ?, difficulty = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      question,
      JSON.stringify(options),
      correctAnswer,
      subject,
      topic,
      dbDifficulty,
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    // Return the updated question with converted display values
    const updatedQuestion = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    updatedQuestion.options = JSON.parse(updatedQuestion.options);
    updatedQuestion.difficulty = displayDifficulty(updatedQuestion.difficulty);
    updatedQuestion.subject = normalizeSubject(updatedQuestion.subject);
    
    res.json({ question: updatedQuestion });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Error al actualizar la pregunta. Por favor intente de nuevo.' });
  }
});

// Add redirect for old admin URL
app.get('/admin.html', (req, res) => {
    res.redirect('/admin');
});

// Add direct route for admin section
app.get('/admin', (req, res) => {
    res.sendFile('admin/index.html', { root: './public' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
