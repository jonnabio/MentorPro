# MentorPro

MentorPro is an interactive quiz generation and management system designed for educational purposes. It uses AI to automatically generate multiple-choice questions based on learning objectives, making it ideal for teachers and educational institutions.

## Latest Updates and Improvements

### Architecture Improvements
- Modularized question generation with separate generator module
- Added debug utilities for enhanced monitoring and logging
- Improved OpenAI integration with GPT-3.5 Turbo 16K
- Better separation of concerns in server architecture
- Enhanced retry mechanisms with exponential backoff

### Enhanced Error Handling & Reliability
- Comprehensive error handling for OpenAI API interactions with specific error messages
- Robust retry mechanism for AI question generation with up to 3 attempts
- Improved database connection error handling
- Better validation of AI responses and data structures

### AI Question Generation Improvements
- Strict validation of generated questions format and content
- Enforcement of exact distribution of difficulty levels (3 easy, 3 medium, 3 hard)
- Enhanced subject classification with standardized categories
- Response format validation and automatic correction
- Rate limit handling for OpenAI API calls

### UI/UX Enhancements
- Modern dark mode theme with CSS variables
- Improved loading states and error messages
- Dynamic feature availability detection
- Smooth animations and transitions
- Better responsive design
- Comprehensive user feedback system
- Adaptive difficulty recommendations based on performance

### Data Management
- Normalized difficulty levels in database (easy, medium, hard)
- Standardized subject names without special characters
- Improved search and filtering capabilities
- Dynamic topic management based on subjects
- Automatic question randomization for quizzes

## Features

- AI-powered question generation
- Multiple difficulty levels (Principiante/Intermedio/Avanzado)
- Subject categorization (Español, Matemáticas, Ciencias, Estudios Sociales)
- Dynamic topic organization
- Interactive quiz interface
- Admin panel for question management
- Real-time scoring and feedback
- Difficulty level recommendations based on performance
- Feature detection and graceful degradation
- Advanced error handling and recovery

## Tech Stack

### Backend
- Node.js
- Express.js with improved error handling
- SQLite (using better-sqlite3) with optimized queries
- OpenAI API (GPT-3.5 Turbo) with retry mechanism

### Frontend
- Vanilla JavaScript with modern ES6+ features
- HTML5 with semantic markup
- CSS3 with modern features:
  - CSS Variables for theming
  - Flexbox for layouts
  - CSS Grid for responsive design
  - CSS Animations
- Progressive enhancement and feature detection

### Development Tools
- dotenv for environment management
- CORS for cross-origin resource sharing
- Git for version control

## Architecture

### Core Components

1. **Main Server (server.js)**
   - Express.js application setup
   - API endpoint definitions
   - Database initialization
   - OpenAI client configuration
   - Error handling middleware

2. **Question Generator (question_generator.js)**
   - AI-powered question generation logic
   - Question format validation
   - Subject-specific prompt management
   - Retry mechanism with backoff
   - Response validation and processing

3. **Debug Utilities (utils/debug.js)**
   - Structured logging system
   - Question generation debugging
   - Response validation monitoring
   - Error tracking and reporting
   - Performance monitoring

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
  - Multi-stage process:
    1. Classification of subject and grade level
    2. Generation of questions with balanced difficulty
    3. Validation and format checking
  - Parameters:
    - `description`: Learning objective text
    - `difficulty` (optional): easy/medium/hard
  - Response:
    - Array of 9 questions (3 per difficulty level)
    - Each question includes metadata and validation status
    - Debug information in development mode

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
├── utils/
│   └── debug.js      # Debug utilities for logging and monitoring
├── server.js         # Main server application
├── question_generator.js  # Question generation module
├── update_db.js     # Database update utilities
├── check_db.js      # Database verification tools
└── package.json
```

## Features in Detail

### Question Generation Process

1. **Learning Objective Analysis**
   - User inputs a learning objective
   - OpenAI analyzes and classifies the subject and topic
   - Validates against predefined subject categories
   - Multiple retry attempts with exponential backoff
   - Comprehensive error handling and validation
   - Logging and monitoring via debug utilities
   - Grade level detection and validation
   - Enhanced classification with subject-specific prompts

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
   - 9 questions per quiz (3 of each difficulty level)
   - Immediate feedback on answers with animations
   - Visual indication of correct/incorrect answers
   - Running score display with real-time updates
   - Progress tracking and statistics
   - Smooth transitions between questions
   - Error recovery and state management

3. **Completion**
   - Final score display
   - Performance-based feedback
   - Difficulty level recommendations
   - Option to start new quiz

### Admin Interface

1. **Question Generation**
   - Learning objective input with validation
   - AI-powered generation with retry mechanism
   - Preview generated questions with validation
   - Real-time error feedback and suggestions
   - Progress indicators and loading states
   - Automatic classification and categorization

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
   - Use debug utilities for structured logging
   - Maintain consistent naming conventions
   - Split functionality into logical modules
   - Document key functions and components

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
