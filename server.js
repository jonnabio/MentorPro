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

// Initialize database
db.exec(`
  DROP TABLE IF EXISTS questions;
  CREATE TABLE questions (
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

// Generate questions using OpenAI
async function generateQuestions(description, classification, difficulty = 'medium') {
  try {
    const difficultyInstructions = {
      easy: "Las preguntas deben ser básicas, usando conceptos simples y respuestas directas.",
      medium: "Las preguntas deben requerir un entendimiento básico de los conceptos.",
      hard: "Las preguntas deben requerir pensamiento crítico y aplicación de conceptos."
    };

    const questionPrompt = `
      Genera 3 preguntas de opción múltiple en español para la siguiente materia y tema. 
      Las preguntas deben ser apropiadas para estudiantes de primaria.
      
      Materia: ${classification.subject}
      Tema: ${classification.topic}
      Descripción: ${description}
      Dificultad: ${difficulty}
      
      Instrucciones de dificultad: ${difficultyInstructions[difficulty]}
      
      IMPORTANTE: La respuesta debe ser un objeto JSON válido con este formato exacto.
      Todas las propiedades deben estar entre comillas dobles.
      El valor de correctAnswer debe ser un número del 0 al 3 sin comillas.
      
      {
        "questions": [
          {
            "subject": "${classification.subject}",
            "topic": "${classification.topic}",
            "question": "pregunta aquí",
            "options": ["opción 1", "opción 2", "opción 3", "opción 4"],
            "correctAnswer": 0,
            "difficulty": "${difficulty}"
          }
        ]
      }
      
      No incluyas ningún texto adicional antes o después del JSON.
    `;    console.log('Sending question generation request to OpenAI...');
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: questionPrompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.5,
    });
      console.log('Raw GPT response:', completion.choices[0].message.content);

    // Validate that we have a response and it has content
    if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error('Invalid response structure from OpenAI');
    }

    const content = completion.choices[0].message.content.trim();
    console.log('Attempting to parse response:', content);

    try {
      const parsedResponse = JSON.parse(content);
      
      // Validate response structure
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      // Validate each question
      parsedResponse.questions.forEach((q, i) => {
        if (!q.subject || !q.topic || !q.question || !Array.isArray(q.options) || 
            q.options.length !== 4 || typeof q.correctAnswer !== 'number' ||
            q.correctAnswer < 0 || q.correctAnswer > 3) {
          throw new Error(`Invalid question format at index ${i}`);
        }
      });

      return parsedResponse;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', {
        error: parseError.message,
        response: completion.choices[0].message.content
      });
      throw new Error('Error al procesar la respuesta. Formato inválido.');
    }
  } catch (error) {
    console.error('Error generating questions:', {
      error: error.message,
      stack: error.stack,
      classification,
      difficulty,
      description
    });
      // More specific error messages based on the error type
    if (error.message.includes('JSON')) {
      throw new Error('Error al procesar la respuesta de las preguntas. Formato inválido.');
    } else if (error.message.includes('API key')) {
      throw new Error('Error de configuración del servidor.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('Se ha excedido el límite de solicitudes. Por favor intente de nuevo más tarde.');
    } else if (error.name === 'OpenAIError') {
      console.error('OpenAI specific error:', error);
      if (error.status === 429) {
        throw new Error('Se ha excedido el límite de solicitudes. Por favor intente de nuevo más tarde.');
      } else {
        throw new Error('Error en el servicio de OpenAI. Por favor intente de nuevo más tarde.');
      }
    } else {
      throw new Error('Error al generar preguntas: ' + error.message);
    }
  }
}

// API Endpoints
app.post('/api/generate', async (req, res) => {
  try {
    console.log('Received generate request:', req.body);
    
    const { description, difficulty = 'medium' } = req.body;
    
    if (!description) {
      console.log('Missing description in request');
      return res.status(400).json({ error: 'Por favor ingresa una descripción' });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      console.log('Invalid difficulty:', difficulty);
      return res.status(400).json({ error: 'Dificultad inválida. Debe ser: easy, medium, o hard' });
    }

    // First attempt to classify the description
    console.log('Classifying description:', description);
    const classification = await classifyDescription(description);
    console.log('Classification result:', classification);

    // Then generate questions with difficulty
    console.log('Generating questions with classification:', classification);
    const generatedQuestions = await generateQuestions(description, classification, difficulty);
    
    // Store questions in database
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
      return { ...q, id: result.lastInsertRowid };
    });

    res.json({ questions });  } catch (error) {
    console.error('Server error:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });    // Handle different types of errors with appropriate status codes and messages
    if (error.message.includes('Invalid subject')) {
      res.status(400).json({ 
        error: error.message 
      });
    } else if (error.message.includes('API key')) {
      console.error('OpenAI API Key error:', error);
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
      console.error('OpenAI API error:', error);
      res.status(500).json({ 
        error: 'Error en el servicio de OpenAI. Por favor intente de nuevo más tarde.' 
      });
    } else {
      console.error('Unexpected error:', error);
      res.status(500).json({ 
        error: 'Error inesperado. Por favor intente de nuevo.' 
      });
    }
  }
});

// Add endpoint to query questions
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
      params.push(difficulty);
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

    console.log('Query results:', {
      count: questions.length,
      first: questions[0]
    });

    // Parse the options JSON string for each question
    questions = questions.map(q => {
      try {
        return {
          ...q,
          options: JSON.parse(q.options)
        };
      } catch (e) {
        console.error('Error parsing options for question:', {
          id: q.id,
          options: q.options,
          error: e.message
        });
        throw new Error('Error interno al procesar las preguntas');
      }
    });

    if (questions.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron preguntas',
        questions: []
      });
    }

    res.json({ questions });
  } catch (error) {
    console.error('Error querying questions:', error);
    res.status(500).json({ error: 'Error al buscar preguntas' });
  }
});

// Add endpoint to get subjects
app.get('/api/subjects', async (req, res) => {
  try {
    const validSubjects = ['Espanol', 'Matematicas', 'Ciencias', 'Social Studies'];
    res.json({ subjects: validSubjects });
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
    const { question, options, correctAnswer, subject, topic } = req.body;
    
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

    const stmt = db.prepare(`
      UPDATE questions 
      SET question = ?, options = ?, correct_answer = ?, subject = ?, topic = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      question,
      JSON.stringify(options),
      correctAnswer,
      subject,
      topic,
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    const updatedQuestion = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    updatedQuestion.options = JSON.parse(updatedQuestion.options);
    
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

