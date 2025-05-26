const { debugQuestion } = require('./utils/debug');

/**
 * Generates multiple choice questions based on the given description and classification
 */
async function generateQuestions(openai, description, classification) {
  const maxRetries = 3;
  let retries = 0;

  debugQuestion('Starting Question Generation', { description, classification });

  while (retries < maxRetries) {
    try {
      debugQuestion('Generation Attempt', { attempt: retries + 1, maxRetries });

      const messages = [
        getSystemPrompt(classification),
        getUserPrompt(description, classification),
        getExamplePrompt(classification)
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages,
        temperature: 0.5,  // Lower temperature for more consistent output
        max_tokens: 4000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content.trim();
      debugQuestion('Raw Response', { content: content.substring(0, 500) + '...' });

      const result = await validateAndProcessResponse(content, classification);
      debugQuestion('Validation Success', { questionCount: result.questions.length });
      
      return result;
    } catch (error) {
      debugQuestion('Generation Error', { 
        error: error.message,
        attempt: retries + 1,
        maxRetries
      });

      if (retries >= maxRetries - 1) {
        throw new Error('No se pudieron generar preguntas después de varios intentos. Por favor intente con una descripción más clara.');
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, Math.min(2000 * retries, 10000)));
    }
  }
}

function getSystemPrompt(classification) {
  return {
    role: "system",
    content: `Eres un experto educador de nivel primaria especializado en crear preguntas de opción múltiple adaptadas al nivel ${classification.gradeLevel}.

ENFOQUE PRINCIPAL:
- Materia: ${classification.subject}
- Nivel: ${classification.gradeLevel}
- Tema: ${classification.topic}

REQUISITOS CLAVE:
1. Genera EXACTAMENTE 9 preguntas en español
2. Adapta el lenguaje al nivel educativo
3. Usa vocabulario apropiado para la edad
4. Haz preguntas claras y específicas
5. Proporciona opciones plausibles pero distinguibles`
  };
}

function getUserPrompt(description, classification) {
  return {
    role: "user",
    content: `Genera 9 preguntas de opción múltiple sobre:
"${description}"

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

REQUISITOS:
1. Todo el texto en español
2. 3 preguntas de cada nivel: easy, medium, hard
3. Opciones claras y distintas
4. Una sola respuesta correcta
5. Sin texto fuera del JSON`
  };
}

function getExamplePrompt(classification) {
  return {
    role: "assistant",
    content: `{
  "questions": [
    {
      "subject": "${classification.subject}",
      "topic": "${classification.topic}",
      "question": "¿Dónde se encuentra...?",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": 0,
      "difficulty": "easy"
    }
  ]
}`
  };
}

async function validateAndProcessResponse(content, classification) {
  if (!content) {
    throw new Error('No se recibió respuesta del servicio');
  }

  const cleanContent = content.trim();
  if (!cleanContent.startsWith('{') || !cleanContent.endsWith('}')) {
    throw new Error('Formato de respuesta inválido');
  }

  const parsed = JSON.parse(cleanContent);
  
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('Formato inválido: falta el array de preguntas');
  }

  // Validate and clean up each question
  const questions = parsed.questions.map((q, i) => ({
    ...q,
    options: q.options.map(opt => String(opt).trim())
  }));

  // Validate structure and difficulty distribution
  validateQuestions(questions);

  return { questions };
}

function validateQuestions(questions) {
  if (questions.length !== 9) {
    throw new Error(`Se requieren exactamente 9 preguntas, se recibieron ${questions.length}`);
  }

  const difficultyCount = { easy: 0, medium: 0, hard: 0 };
  
  questions.forEach((q, i) => {
    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
        typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
      throw new Error(`Pregunta ${i + 1}: formato inválido`);
    }

    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
      throw new Error(`Pregunta ${i + 1}: dificultad inválida "${q.difficulty}"`);
    }

    difficultyCount[q.difficulty]++;
  });

  if (difficultyCount.easy !== 3 || difficultyCount.medium !== 3 || difficultyCount.hard !== 3) {
    throw new Error(`Distribución de dificultad incorrecta: ${JSON.stringify(difficultyCount)}`);
  }
}

module.exports = { generateQuestions };
