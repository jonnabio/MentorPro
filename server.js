require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const DatabaseManager = require('./database');

const app = express();

// Initialize database with better error handling
let db;

async function initializeApp() {
  try {
    db = new DatabaseManager();
    await db.init();
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1); // Exit if we can't connect to the database
  }

  // Initialize OpenAI with better error handling
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('OpenAI initialization successful');
    return openaiClient;
  } catch (error) {
    console.error('OpenAI initialization error:', error);
    process.exit(1); // Exit if we can't initialize OpenAI
  }
}

// Initialize app and export openai for use in endpoints
let openai;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? true  // Allow all origins in production, or specify your Render URL
        : 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    exposedHeaders: ['Content-Type'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'MentorPro',
    version: '1.0.0'
  });
});

// Root endpoint redirect
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Initialize database - only create table if it doesn't exist
// This is now handled automatically by DatabaseManager.init()

// Classify the subject and topic using OpenAI with improved contextual analysis
async function classifyDescription(description) {
  const classificationPrompt = `
    Analiza cuidadosamente el siguiente texto y clasifica la materia y el tema según el enfoque educativo principal.

    GUÍA DE CLASIFICACIÓN POR MATERIA:

    1. Social Studies (Estudios Sociales):
       - Geografía política y física (territorio, regiones, cordilleras)
       - Recursos naturales y su impacto en la sociedad
       - Historia y desarrollo de lugares
       - Cultura y sociedad
       - Ubicación y características de territorios

    2. Ciencias:
       - Procesos naturales y sus causas
       - Química y física básica
       - Biología y seres vivos
       - Ecosistemas y medio ambiente
       - Experimentos y método científico

    3. Matematicas:
       - Operaciones y cálculos
       - Geometría y mediciones
       - Problemas matemáticos
       - Números y cantidades

    4. Espanol:
       - Gramática y escritura
       - Lectura y comprensión
       - Comunicación y expresión
       - Vocabulario y lenguaje

    CRITERIOS DE DECISIÓN:
    1. ¿Cuál es el OBJETIVO PRINCIPAL de la lección?
    2. ¿Qué HABILIDADES se están desarrollando?
    3. ¿Qué tipo de CONOCIMIENTO se está transmitiendo?

    EJEMPLO 1:
    "Volcanes y cordilleras de Costa Rica" -> Social Studies
    Razón: Enfoque en ubicación geográfica y características del territorio.

    EJEMPLO 2:
    "Proceso de erupción volcánica" -> Ciencias
    Razón: Enfoque en el proceso natural y sus causas.

    Texto a analizar: "${description}"

    Responde SOLO con un objeto JSON que incluya:
    {
      "subject": "materia exacta de la lista sin tildes",
      "topic": "tema específico identificado",
      "focus": "enfoque educativo principal",
      "gradeLevel": "nivel educativo detectado (1-6)"
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

// Import the question generator
const { generateQuestions } = require('./question_generator');

// Generate questions endpoint handler
async function handleQuestionGeneration(description, classification) {
  const maxRetries = 3;
  let retries = 0;

  debugQuestion('Starting Question Generation', { description, classification });

  while (retries < maxRetries) {
    try {
      debugQuestion('Generation Attempt', { attempt: retries + 1, maxRetries });      const messages = [
        {
          role: "system",
          content: `You are an expert educational content creator specializing in creating multiple-choice questions in Spanish for primary school students.

GRADE LEVEL: ${classification.gradeLevel}
SUBJECT: ${classification.subject}
FOCUS: ${classification.focus}

KEY REQUIREMENTS:
1. Create EXACTLY 9 questions in Spanish
2. Return ONLY valid JSON
3. Follow the exact structure provided
4. Make all options strings, including numbers
5. Use clear, age-appropriate language

SUCCESS CRITERIA:
1. Questions must be grade-appropriate
2. Options must be distinct and plausible
3. Correct answers must be clearly correct
4. Language must be clear and simple
5. All text in Spanish

INSTRUCCIONES IMPORTANTES:
1. Crea preguntas para estudiantes de ${classification.gradeLevel}
2. Usa vocabulario y conceptos apropiados para la edad
3. Incluye elementos visuales o descriptivos cuando sea necesario
4. Relaciona las preguntas con experiencias cotidianas
5. Asegura que las opciones sean claras y distintivas

REGLAS TÉCNICAS:
1. SIEMPRE genera EXACTAMENTE 9 preguntas
2. Responde SOLO con JSON válido
3. Usa comillas dobles para strings
4. NO uses tildes en subject/difficulty
5. Convierte números a strings: ["100", "200"]

GUÍA DE CONTENIDO POR MATERIA:

1. Social Studies:
   - Preguntas sobre ubicación geográfica
   - Características de territorios
   - Impacto en la sociedad
   - Aspectos culturales e históricos

2. Ciencias:
   - Procesos naturales
   - Experimentos y observaciones
   - Seres vivos y ecosistemas
   - Método científico

3. Matematicas:
   - Operaciones numéricas
   - Problemas prácticos
   - Geometría y mediciones
   - Números en formato consistente

4. Espanol:
   - Comprensión lectora
   - Gramática y vocabulario
   - Comunicación efectiva
   - Expresión escrita

DISTRIBUCIÓN OBLIGATORIA:
- 3 preguntas "difficulty": "easy" (conceptos básicos)
- 3 preguntas "difficulty": "medium" (aplicación)
- 3 preguntas "difficulty": "hard" (análisis)`
        },
        {
          role: "user",
          content: `Genera un objeto JSON con 9 preguntas de opción múltiple en español.

DETALLES DEL TEMA:
Materia: ${classification.subject}
Tema: ${classification.topic}
Descripción: ${description}

ESTRUCTURA JSON REQUERIDA:
{
  "questions": [
    {
      "subject": "${classification.subject}",
      "topic": "${classification.topic}",
      "question": "string (pregunta en español)",
      "options": ["opción 1", "opción 2", "opción 3", "opción 4"],
      "correctAnswer": 0,
      "difficulty": "easy"
    }
  ]
}

VALIDACIÓN:
1. Exactamente 9 preguntas
2. Cada pregunta debe tener todos los campos requeridos
3. Array "options" debe tener exactamente 4 opciones como strings
4. "correctAnswer" debe ser un número entre 0 y 3
5. "difficulty" debe ser "easy", "medium", o "hard"
6. Exactamente 3 preguntas de cada nivel de dificultad

NIVELES DE DIFICULTAD:
- easy: Conceptos básicos, preguntas directas
- medium: Comprensión y aplicación de conceptos
- hard: Pensamiento crítico, análisis complejo

NO incluir texto adicional fuera del objeto JSON.`
        }
      ];

      // Add subject-specific prompting
      const subjectPrompts = {
        'Social Studies': `
          TIPOS DE PREGUNTAS PARA ESTUDIOS SOCIALES:
          - Ubicación geográfica: "¿Dónde se encuentra...?"
          - Características: "¿Qué característica tiene...?"
          - Impacto social: "¿Cómo influye...?"

          - Historia: "¿Cuándo ocurrió...?"
          - Cultura: "¿Qué importancia tiene...?"
        `,
        'Ciencias': `
          TIPOS DE PREGUNTAS PARA CIENCIAS:
          - Procesos: "¿Cómo funciona...?"
          - Causas: "¿Por qué ocurre...?"
          - Efectos: "¿Qué sucede cuando...?"
          - Estructuras: "¿Qué partes tiene...?"
          - Comparaciones: "¿Cuál es la diferencia entre...?"
        `,
        'Matematicas': `
          TIPOS DE PREGUNTAS PARA MATEMÁTICAS:
          - Cálculos: "Resuelve..."
          - Problemas: "Calcula..."
          - Aplicación: "Si tienes..."
          - Razonamiento: "¿Cuánto necesitas para...?"
        `,
        'Espanol': `
          TIPOS DE PREGUNTAS PARA ESPAÑOL:
          - Significado: "¿Qué significa...?"
          - Gramática: "¿Cuál es la forma correcta...?"
          - Comprensión: "Según el texto..."
          - Vocabulario: "La palabra que completa..."
        `
      };

      // Add subject-specific guidance to the prompt
      messages[0].content += `\n\n${subjectPrompts[classification.subject] || ''}`;

      console.log('Sending request to OpenAI...');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000,
        presence_penalty: 0.2,
        frequency_penalty: 0.3,
        response_format: { type: "json_object" }
      });

      console.log('Received response from OpenAI');
      const content = completion.choices[0].message.content.trim();
      
      // Log the first 500 characters of content for debugging
      console.log('Response preview:', content.substring(0, 500) + '...');      try {
        debugQuestion('Validating OpenAI Response', { contentLength: content?.length });
          // Ensure we have content
        if (!content || typeof content !== 'string') {
          throw new Error('No content received from OpenAI');
        }        
        
        // Clean content and validate JSON structure
        const cleanContent = content.trim();
        debugQuestion('Content Validation', {
          startsWithBrace: cleanContent.startsWith('{'),
          endsWithBrace: cleanContent.endsWith('}'),
          length: cleanContent.length
        });

        if (!cleanContent.startsWith('{') || !cleanContent.endsWith('}')) {
          throw new Error('Invalid JSON structure received');
        }

        // Parse the JSON
        console.log('Attempting to parse response as JSON...');
        const parsedResponse = JSON.parse(cleanContent);
        
        // Validate basic structure
        if (!parsedResponse || typeof parsedResponse !== 'object') {
          throw new Error('Invalid response format: not an object');
        }
        
        if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
          throw new Error('Invalid response format: missing questions array');
        }

        console.log(`Parsed ${parsedResponse.questions.length} questions successfully`);
        console.log('Validating questions...');

        // Ensure all options are strings
        parsedResponse.questions = parsedResponse.questions.map(q => ({
          ...q,
          options: q.options.map(opt => String(opt))
        }));

        // Count questions by difficulty
        const difficultyCount = {easy: 0, medium: 0, hard: 0};
        
        parsedResponse.questions.forEach((q, i) => {
          console.log(`Validating question ${i + 1}/${parsedResponse.questions.length}`);

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

        if (parsedResponse.questions.length !== 9) {
          throw new Error(`Expected exactly 9 questions, got ${parsedResponse.questions.length}`);
        }

        if (difficultyCount.easy !== 3 || difficultyCount.medium !== 3 || difficultyCount.hard !== 3) {
          throw new Error(`Incorrect difficulty distribution. Got: easy=${difficultyCount.easy}, medium=${difficultyCount.medium}, hard=${difficultyCount.hard}`);
        }        // Validate subject-specific content
        if (!validateSubjectContent(parsedResponse.questions, classification)) {
          throw new Error('Las preguntas generadas no cumplen con los criterios específicos de la materia');
        }

        console.log('All validations passed successfully!');
        console.log('Questions by difficulty:', difficultyCount);

        return { questions: parsedResponse.questions };
      } catch (parseError) {
        console.error('=== Parse Error Details ===');
        console.error('Error:', parseError.message);
        console.error('Stack:', parseError.stack);
        console.error('Raw content causing error:', content);
        
        if (retries >= maxRetries - 1) {
          throw new Error(`Failed to generate valid questions after ${maxRetries} attempts. Last error: ${parseError.message}`);
        }
        
        retries++;
        console.log(`Retrying question generation in ${Math.min(1000 * Math.pow(2, retries), 10000)}ms...`);
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 10000)));
      }
    } catch (error) {
      console.error('=== Generation Error Details ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
      console.error('Classification:', classification);
      console.error('Description:', description);
      
      if (retries >= maxRetries - 1) {
        console.error('All retry attempts failed');
        throw new Error('No se pudieron generar preguntas después de varios intentos. Por favor intente con una descripción diferente.');
      }
      
      retries++;
      
      if (error.name === 'OpenAIError') {
        if (error.status === 429) {
          console.log('Rate limit hit, waiting longer before retry...');
          await new Promise(resolve => setTimeout(resolve, Math.min(5000 * Math.pow(2, retries), 30000)));
        } else {
          console.error('OpenAI API error:', error.status, error.message);
          throw new Error('Error en el servicio de OpenAI. Por favor intente de nuevo más tarde.');
        }
      } else if (error.message.includes('API key')) {
        throw new Error('Error de configuración del servidor.');
      } else {
        console.log(`Retrying after error in ${Math.min(1000 * Math.pow(2, retries), 10000)}ms...`);
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 10000)));
      }
    }
  }

  console.error('=== Question Generation Failed ===');
  console.error(`Failed to generate valid questions after ${maxRetries} attempts`);
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

// Add helper function for validating subject-specific content
function validateSubjectContent(questions, classification) {
  debugQuestion('Validating Subject Content', { subject: classification.subject });

  // Helper to check if text includes any word from a list
  const includesAny = (text, words) => words.some(word => text.toLowerCase().includes(word.toLowerCase()));

  // Common question patterns
  const commonPatterns = {
    interrogative: ['qué', 'que', 'cuál', 'cual', 'cómo', 'como', 'dónde', 'donde',
                   'por qué', 'por que', 'cuándo', 'cuando', 'cuánto', 'cuanto'],
    location: ['dónde', 'donde', 'ubicación', 'lugar', 'región', 'zona', 'área'],
    description: ['describe', 'explica', 'indica', 'menciona', 'señala'],
    analysis: ['analiza', 'compara', 'relaciona', 'diferencia', 'distingue']
  };

  const subjectValidations = {
    'Social Studies': (q) => {
      const questionText = q.question.toLowerCase();
      const topicWords = ['ubicación', 'territorio', 'región', 'característica', 'lugar', 
                         'país', 'provincia', 'ciudad', 'cordillera', 'montaña', 'río'];
      return topicWords.some(word => questionText.includes(word)) ||
             commonQuestionWords.some(word => questionText.includes(word));
    },
    'Ciencias': (q) => {
      const questionText = q.question.toLowerCase();
      const scienceWords = ['proceso', 'causa', 'efecto', 'sistema', 'función', 
                          'organismo', 'estructura', 'cambio'];
      return scienceWords.some(word => questionText.includes(word)) ||
             commonQuestionWords.some(word => questionText.includes(word));
    },
    'Matematicas': (q) => {
      // Allow mixed numeric and word representations
      const hasNumericOption = q.options.some(opt => !isNaN(opt.replace(/[,.]/g, '')));
      const hasCalculation = q.question.toLowerCase().includes('calcula') ||
                           q.question.toLowerCase().includes('resuelve');
      return hasNumericOption || hasCalculation;
    },
    'Espanol': (q) => {
      const questionText = q.question.toLowerCase();
      const languageWords = ['palabra', 'oración', 'texto', 'significa', 'escribe',
                           'lee', 'completa'];
      return languageWords.some(word => questionText.includes(word)) ||
             commonQuestionWords.some(word => questionText.includes(word));
    }
  };

  const validSubjects = ['Social Studies', 'Ciencias', 'Matematicas', 'Espanol'];
  if (!validSubjects.includes(classification.subject)) {
    console.error('Invalid subject:', classification.subject);
    return false;
  }

  const validator = subjectValidations[classification.subject];
  if (!validator) {
    console.error('No validator found for subject:', classification.subject);
    return false;
  }

  return questions.every((q, i) => {
    const isValid = validator(q);
    if (!isValid) {
      console.error('Question failed subject validation:', { index: i, question: q });
    }
    return isValid;
  });
}

// API Endpoints
app.post('/api/generate', async (req, res) => {
  console.log('/api/generate: Received generate request:', req.body);
  const startTime = Date.now();
  
  try {
    const { description } = req.body;
    
    if (!description) {
      console.log('/api/generate: Missing description in request');
      updateMetrics(false, Date.now() - startTime);
      return res.status(400).json({ error: 'Por favor ingresa una descripción' });
    }

    console.log('/api/generate: Processing request to generate questions for all difficulty levels');
    
    // Log the generation request
    logActivity(`Question generation started: "${description.substring(0, 50)}..."`);
    
    // First attempt to classify the description
    console.log('/api/generate: Classifying description:', description);
    const classification = await classifyDescription(description);
    console.log('/api/generate: Classification result:', classification);

    // Generate questions for all difficulty levels    console.log('/api/generate: Calling generateQuestions...');
    const generatedQuestions = await generateQuestions(openai, description, classification);
    console.log('/api/generate: generateQuestions returned:', generatedQuestions);
    
    // Store questions in database
    console.log('/api/generate: Storing generated questions in database...');
    
    const questions = [];
    for (const q of generatedQuestions.questions) {
      const result = await db.insertQuestion(
        q.subject,
        q.topic,
        description,
        q.question,
        q.options,
        q.correctAnswer,
        q.difficulty
      );
      console.log('/api/generate: Inserted question with ID:', result.id);
      questions.push({ ...q, id: result.id });
    }

    console.log('/api/generate: Successfully stored', questions.length, 'questions.');
    
    // Update metrics and log success
    updateMetrics(true, Date.now() - startTime);
    logActivity(`Generated ${questions.length} questions successfully`);
    
    res.json({ questions });  } catch (error) {
    console.error('/api/generate: Server error during generation:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    // Update metrics for failed request
    updateMetrics(false, Date.now() - startTime);
    logActivity(`Question generation failed: ${error.message}`);
    
    // Handle different types of errors with appropriate status codes and messages
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
    
    // Build filter object
    const filters = {};
    if (subject) filters.subject = subject;
    if (topic) filters.topic = topic;
    if (difficulty) filters.difficulty = normalizeDifficulty(difficulty);
    if (limit) filters.limit = parseInt(limit);

    // Log query details
    console.log('Executing query with filters:', filters);

    // Execute query using DatabaseManager
    let questions = await db.getQuestions(filters);

    // Convert difficulties for display and normalize subjects
    questions = questions.map(q => ({
      ...q,
      difficulty: displayDifficulty(q.difficulty),
      subject: normalizeSubject(q.subject)
    }));

    // Return empty array instead of 404 when no questions found
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
    // Query the database for unique subjects using DatabaseManager
    const subjects = await db.getSubjects();

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
    
    // Use DatabaseManager to get topics
    const topics = await db.getTopics(subject);

    res.json({ topics });
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
    
    const result = await db.deleteQuestion(id);
    
    if (!result.success) {
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

    const result = await db.updateQuestion(id, {
      question,
      options,
      correctAnswer,
      subject,
      topic,
      difficulty: dbDifficulty
    });

    if (!result.success) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    // Return the updated question with converted display values
    const updatedQuestion = result.question;
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

// Monitor route
app.get('/monitor', (req, res) => {
    res.sendFile('monitor.html', { root: './public' });
});

// Add endpoint for quiz questions
app.get('/api/quiz-questions', async (req, res) => {
  try {
    const { subject, topic, difficulty = 'easy' } = req.query;
    const QUESTIONS_PER_LEVEL = 3;

    // Build filter object
    const filters = {
      subject,
      topic: topic !== 'all' ? topic : null,
      difficulty: normalizeDifficulty(difficulty),
      limit: QUESTIONS_PER_LEVEL,
      random: true
    };

    let questions = await db.getQuestions(filters);

    // Format questions
    questions = questions.map(q => ({
      ...q,
      difficulty: displayDifficulty(q.difficulty),
      subject: normalizeSubject(q.subject)
    }));

    if (questions.length < QUESTIONS_PER_LEVEL) {
      return res.json({
        success: false,
        message: 'No hay suficientes preguntas disponibles para este nivel. Por favor contacte al administrador para generar más preguntas.',
        questions: []
      });
    }

    const nextLevel = {
      'easy': 'medium',
      'medium': 'hard',
      'hard': null
    }[normalizeDifficulty(difficulty)];

    res.json({
      success: true,
      questions,
      requiredScore: 0.8, // 80% required to advance
      nextLevel
    });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    res.status(500).json({ error: 'Error al obtener las preguntas del quiz' });
  }
});

// Monitor API Endpoints
let currentProvider = 'openai';
let selectedModel = 'gpt-3.5-turbo';
let providerStatus = {
  openai: { status: 'online', enabled: true, responseTime: 0, usageToday: 0, costToday: 0 },
  openrouter: { status: 'offline', enabled: false, responseTime: 0, usageToday: 0, costToday: 0 }
};
let metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0
};
let activityLog = [];

// Helper function to log activity
function logActivity(description) {
  const entry = {
    description,
    timestamp: Date.now()
  };
  activityLog.unshift(entry);
  if (activityLog.length > 100) {
    activityLog = activityLog.slice(0, 100);
  }
}

// Get provider status
app.get('/api/providers/status', async (req, res) => {
  try {
    // Test OpenAI connection
    try {
      const startTime = Date.now();
      await openai.models.list();
      const responseTime = Date.now() - startTime;
      providerStatus.openai = {
        ...providerStatus.openai,
        status: 'online',
        responseTime
      };
    } catch (error) {
      providerStatus.openai = {
        ...providerStatus.openai,
        status: 'offline',
        error: error.message
      };
    }

    // Test OpenRouter connection if key is available
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const startTime = Date.now();
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const responseTime = Date.now() - startTime;
          providerStatus.openrouter = {
            ...providerStatus.openrouter,
            status: 'online',
            responseTime
          };
        } else {
          throw new Error('API request failed');
        }
      } catch (error) {
        providerStatus.openrouter = {
          ...providerStatus.openrouter,
          status: 'offline',
          error: error.message
        };
      }
    }

    res.json({
      success: true,
      providers: providerStatus
    });
  } catch (error) {
    console.error('Error checking provider status:', error);
    res.status(500).json({ error: 'Error checking provider status' });
  }
});

// Toggle provider
app.post('/api/providers/:provider/toggle', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!providerStatus[provider]) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    providerStatus[provider].enabled = !providerStatus[provider].enabled;
    
    if (providerStatus[provider].enabled && providerStatus[provider].status === 'online') {
      currentProvider = provider;
      logActivity(`Provider switched to ${provider}`);
    }

    res.json({
      success: true,
      enabled: providerStatus[provider].enabled,
      currentProvider
    });
  } catch (error) {
    console.error('Error toggling provider:', error);
    res.status(500).json({ error: 'Error toggling provider' });
  }
});

// Get available models
app.get('/api/models', async (req, res) => {
  try {
    const models = [];

    // OpenAI models
    if (providerStatus.openai.status === 'online') {
      models.push(
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', cost: '$0.001/1K tokens' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai', cost: '$0.03/1K tokens' }
      );
    }

    // OpenRouter models (if available)
    if (providerStatus.openrouter.status === 'online' && process.env.OPENROUTER_API_KEY) {
      models.push(
        { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct', provider: 'openrouter', cost: 'free' },
        { id: 'openchat/openchat-7b:free', name: 'OpenChat 7B', provider: 'openrouter', cost: 'free' },
        { id: 'google/gemma-7b-it:free', name: 'Gemma 7B IT', provider: 'openrouter', cost: 'free' },
        { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B Instruct', provider: 'openrouter', cost: 'free' }
      );
    }

    res.json({
      success: true,
      models,
      currentModel: selectedModel,
      currentProvider
    });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Error getting available models' });
  }
});

// Select model
app.post('/api/model/select', async (req, res) => {
  try {
    const { modelId, provider } = req.body;

    if (!modelId || !provider) {
      return res.status(400).json({ error: 'Model ID and provider are required' });
    }

    selectedModel = modelId;
    currentProvider = provider;
    
    logActivity(`Model changed to ${modelId} (${provider})`);

    res.json({
      success: true,
      selectedModel,
      currentProvider
    });
  } catch (error) {
    console.error('Error selecting model:', error);
    res.status(500).json({ error: 'Error selecting model' });
  }
});

// Get metrics
app.get('/api/metrics', async (req, res) => {
  try {
    res.json({
      success: true,
      metrics: {
        ...metrics,
        currentProvider,
        selectedModel,
        providersOnline: Object.values(providerStatus).filter(p => p.status === 'online').length
      }
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Error getting metrics' });
  }
});

// Get recent activity
app.get('/api/activity', async (req, res) => {
  try {
    res.json({
      success: true,
      activity: activityLog.slice(0, 20) // Return last 20 activities
    });
  } catch (error) {
    console.error('Error getting activity:', error);
    res.status(500).json({ error: 'Error getting activity log' });
  }
});

// Test connection
app.post('/api/test-connection', async (req, res) => {
  try {
    const results = {};

    // Test OpenAI
    try {
      const startTime = Date.now();
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });
      results.openai = {
        status: 'success',
        responseTime: Date.now() - startTime,
        response: completion.choices[0].message.content
      };
    } catch (error) {
      results.openai = {
        status: 'error',
        error: error.message
      };
    }

    // Test OpenRouter if available
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const startTime = Date.now();
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 5
          })
        });

        if (response.ok) {
          const data = await response.json();
          results.openrouter = {
            status: 'success',
            responseTime: Date.now() - startTime,
            response: data.choices[0].message.content
          };
        } else {
          throw new Error('API request failed');
        }
      } catch (error) {
        results.openrouter = {
          status: 'error',
          error: error.message
        };
      }
    }

    logActivity('Connection test completed');

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Error testing connections' });
  }
});

// Update metrics (called by other endpoints)
function updateMetrics(success, responseTime) {
  metrics.totalRequests++;
  if (success) {
    metrics.successfulRequests++;
  } else {
    metrics.failedRequests++;
  }
  
  // Update average response time
  const totalTime = metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime;
  metrics.averageResponseTime = Math.round(totalTime / metrics.totalRequests);
}

// Initialize activity log
// Initialize activity log
logActivity('MentorPro Monitor started');

// Start server after initialization is complete
async function startServer() {
  try {
    const openaiClient = await initializeApp();
    openai = openaiClient;
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('App initialization failed:', error);
    process.exit(1);
  }
}

startServer();
