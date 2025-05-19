require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { OpenAI } = require('openai');

const app = express();
const db = new Database('quiz.db');
const openai = new OpenAI(process.env.OPENAI_API_KEY);

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
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    topic TEXT,
    learning_objective TEXT,
    question TEXT,
    options TEXT,
    correct_answer INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
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
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: classificationPrompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.3,
    });    const classification = JSON.parse(completion.choices[0].message.content);
    console.log('Raw classification:', classification);
    
    // Validate the subject
    const validSubjects = ['Espanol', 'Matematicas', 'Ciencias', 'Social Studies'];
    if (!validSubjects.includes(classification.subject)) {
      throw new Error('Invalid subject. Must be one of: ' + validSubjects.join(', '));
    }
    
    return classification;
  } catch (error) {
    console.error('Error classifying description:', error);
    throw error;
  }
}

// Generate questions using OpenAI
async function generateQuestions(description, classification) {
  try {
    const questionPrompt = `
      Genera 3 preguntas de opción múltiple en español para la siguiente materia y tema. 
      Las preguntas deben ser apropiadas para estudiantes de primaria.
      
      Materia: ${classification.subject}
      Tema: ${classification.topic}
      Descripción: ${description}
      
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
            "correctAnswer": 0
          }
        ]
      }
      
      No incluyas ningún texto adicional antes o después del JSON.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: questionPrompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.5,
    });
    
    console.log('Raw GPT response:', completion.choices[0].message.content);

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

// API Endpoints
app.post('/api/generate', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Por favor ingresa una descripción' });
    }

    // First attempt to classify the description
    console.log('Classifying description:', description);
    const classification = await classifyDescription(description);
    console.log('Classification result:', classification);

    // Then generate questions
    console.log('Generating questions with classification:', classification);
    const generatedQuestions = await generateQuestions(description, classification);
    
    // Store questions in database
    const stmt = db.prepare(`
      INSERT INTO questions (subject, topic, learning_objective, question, options, correct_answer)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const questions = generatedQuestions.questions.map(q => {
      const result = stmt.run(
        q.subject,
        q.topic,
        description,
        q.question,
        JSON.stringify(q.options),
        q.correctAnswer
      );
      return { ...q, id: result.lastInsertRowid };
    });

    res.json({ questions });  } catch (error) {
    console.error('Server error:', error);
    // Check if it's a validation error or other error
    if (error.message.includes('Invalid subject')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al generar preguntas. Por favor intente de nuevo.' });
    }
  }
});

// Add endpoint to query questions
app.get('/api/questions', async (req, res) => {
  try {
    const { subject, topic } = req.query;
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

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    // Execute query
    const stmt = db.prepare(query);
    let questions = stmt.all(...params);

    // Parse the options JSON string for each question
    questions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    if (questions.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontraron preguntas con los criterios especificados' 
      });
    }

    res.json({ questions });
  } catch (error) {
    console.error('Error querying questions:', error);
    res.status(500).json({ 
      error: 'Error al buscar preguntas. Por favor intente de nuevo.' 
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

