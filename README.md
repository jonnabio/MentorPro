# MentorPro

MentorPro is an interactive quiz generation and management system designed for educational purposes. It uses AI to automatically generate multiple-choice questions based on learning objectives, making it ideal for teachers and educational institutions.

## Features

- AI-powered question generation
- Multiple difficulty levels (Principiante/Intermedio/Avanzado)
- Subject categorization (Español, Matemáticas, Ciencias, Estudios Sociales)
- Dynamic topic organization
- Interactive quiz interface
- Admin panel for question management
- Real-time scoring and feedback
- Difficulty level recommendations based on performance

## Tech Stack

### Backend
- Node.js
- Express.js
- SQLite (using better-sqlite3)
- OpenAI API (GPT-3.5 Turbo)

### Frontend
- Vanilla JavaScript
- HTML5
- CSS3 (with CSS Variables for theming)

### Development Tools
- dotenv for environment management
- CORS for cross-origin resource sharing
- Git for version control

## Architecture

### Database Schema

```sql
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
```

### API Endpoints

#### Question Generation
- `POST /api/generate`
  - Generates new questions based on learning objectives
  - Uses OpenAI for classification and question generation
  - Parameters:
    - `description`: Learning objective text
    - `difficulty` (optional): easy/medium/hard

#### Question Management
- `GET /api/questions`
  - Retrieves questions with optional filtering
  - Query parameters:
    - `subject`: Filter by subject
    - `topic`: Filter by topic
    - `difficulty`: Filter by difficulty
    - `limit`: Limit number of questions

- `PATCH /api/questions/:id`
  - Updates an existing question
  - Parameters:
    - `question`: Question text
    - `options`: Array of answer options
    - `correctAnswer`: Index of correct answer
    - `subject`: Question subject
    - `topic`: Question topic

- `DELETE /api/questions/:id`
  - Deletes a question

#### Subject and Topic Management
- `GET /api/subjects`
  - Lists all available subjects
- `GET /api/topics`
  - Lists topics, optionally filtered by subject
  - Query parameters:
    - `subject`: Filter topics by subject

### File Structure

```
├── public/
│   ├── admin/
│   │   ├── admin.js
│   │   └── index.html
│   ├── index.html
│   ├── quiz.html
│   ├── quiz.js
│   └── styles.css
├── server.js
├── update_db.js
├── check_db.js
└── package.json
```

## Features in Detail

### Question Generation Process

1. **Learning Objective Analysis**
   - User inputs a learning objective
   - OpenAI analyzes and classifies the subject and topic
   - Validates against predefined subject categories

2. **Question Generation**
   - AI generates multiple-choice questions based on:
     - Classified subject and topic
     - Specified difficulty level
     - Learning objective context
   - Each question includes:
     - Question text
     - 4 answer options
     - Correct answer index
     - Subject and topic metadata

3. **Difficulty Levels**
   - Principiante (easy): Basic concepts, direct answers
   - Intermedio (medium): Understanding of basic concepts
   - Avanzado (hard): Critical thinking and concept application

### Quiz Interface

1. **Setup**
   - Subject selection
   - Topic selection
   - Difficulty selection
   - Randomized question selection

2. **Quiz Flow**
   - 5 questions per quiz
   - Immediate feedback on answers
   - Visual indication of correct/incorrect answers
   - Running score display

3. **Completion**
   - Final score display
   - Performance-based feedback
   - Difficulty level recommendations
   - Option to start new quiz

### Admin Interface

1. **Question Generation**
   - Learning objective input
   - AI-powered generation
   - Preview generated questions

2. **Question Management**
   - Search existing questions
   - Filter by subject and topic
   - Edit questions and answers
   - Delete questions
   - View question metadata

## Setup and Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with:
   ```
   OPENAI_API_KEY=your_api_key
   PORT=3000
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Server port (default: 3000)

## Development Guidelines

1. **Database Operations**
   - Use prepared statements for all queries
   - Include error handling for database operations
   - Validate input data before database operations

2. **API Response Format**
   - Success responses include relevant data
   - Error responses include descriptive messages
   - Consistent HTTP status code usage

3. **Code Style**
   - Use ES6+ features
   - Implement proper error handling
   - Include logging for debugging
   - Maintain consistent naming conventions

## Error Handling

The application implements comprehensive error handling:

1. **Database Errors**
   - Connection failures
   - Query execution errors
   - Data validation errors

2. **API Errors**
   - Invalid request parameters
   - Authentication failures
   - Rate limiting
   - Server errors

3. **OpenAI Integration Errors**
   - API key validation
   - Request failures
   - Response parsing errors
   - Rate limit handling

## Security Considerations

1. **Database Security**
   - Use of prepared statements to prevent SQL injection
   - Input validation and sanitization
   - Error message sanitization

2. **API Security**
   - CORS configuration
   - Input validation
   - Error handling without sensitive information exposure

3. **Environment Security**
   - Environment variable usage
   - Sensitive data protection
   - `.gitignore` configuration

## Performance Optimizations

1. **Database**
   - Connection pooling
   - Query optimization
   - Proper indexing

2. **Frontend**
   - Event delegation
   - Feature detection
   - Error boundary implementation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC License
