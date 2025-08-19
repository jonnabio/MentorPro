# MentorPro

MentorPro is an AI-powered educational quiz platform that generates high-quality multiple-choice questions in Spanish. Built with a dual-mode database architecture for seamless local development and production deployment with persistent data storage.

## 🎯 Key Features

### 🤖 AI-Powered Question Generation
- **Multi-provider LLM support** (OpenAI + OpenRouter)
- **Intelligent subject classification** with Spanish curriculum focus
- **Multiple difficulty levels** (fácil, medio, difícil)
- **Contextual question generation** with balanced difficulty distribution

### �️ Dual Database Architecture
- **Local Development**: SQLite for instant setup and testing
- **Production**: PostgreSQL (Render.com) for persistent, scalable storage
- **Automatic failover** and connection management
- **Zero-configuration database switching** based on environment

### 📊 Educational Management
- **Spanish curriculum alignment** (Matemáticas, Español, Ciencias, Estudios Sociales)
- **Topic-based organization** with dynamic categorization
- **Interactive quiz interface** with immediate feedback
- **Admin panel** for content management and generation

### 🚀 Production Ready
- **Render.com optimized** with automatic deployment
- **Environment-based configuration** for security
- **Comprehensive error handling** and debugging
- **Persistent question storage** that survives deployments

## 🚀 Quick Deploy to Render.com

### **Option 1: One-Click Deploy**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### **Option 2: Manual Setup** (Recommended for Production)

1. **Create PostgreSQL Database on Render.com:**
   - Go to Render.com dashboard → "New +" → "PostgreSQL"
   - Name: `mentorpro-database`
   - Plan: Free tier available

2. **Deploy Web Service:**
   - Connect your GitHub repository
   - Environment variables required:
   ```bash
   # Required - Database
   DATABASE_URL=postgresql://user:password@host.render.com/database
   
   # Required - OpenAI
   OPENAI_API_KEY=sk-proj-your_openai_key_here
   
   # Required - Security
   ACCESS_CODE=your_admin_password_here
   SESSION_SECRET=your_random_secret_here
   
   # Optional - Additional AI Provider
   OPENROUTER_API_KEY=your_openrouter_key_here
   
   # Auto-configured
   NODE_ENV=production
   PORT=10000
   ```

3. **Verify Deployment:**
   - Visit `https://your-app.onrender.com/health`
   - Should show: `"database": "connected"` and `"openai": "configured"`

### **Database Migration from Supabase**
If migrating from Supabase or other providers, MentorPro automatically creates the required table structure on first deployment. No manual migration needed!

## 🛠️ Local Development

### **Quick Start**
```bash
# Clone repository
git clone https://github.com/jonnabio/MentorPro.git
cd MentorPro

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your OpenAI API key

# Start development server
npm start
```

**Local Development Uses SQLite** - No database setup required! The app automatically creates `quiz.db` for local testing.

### **Environment Setup**
Create a `.env` file:
```bash
# Required for question generation
OPENAI_API_KEY=sk-proj-your_openai_key_here

# Optional: Additional AI provider
OPENROUTER_API_KEY=your_openrouter_key_here

# Local development settings
NODE_ENV=development
PORT=3000
```

### **Dual Database Architecture**

MentorPro intelligently switches between database types:

- **🔧 Development**: Uses SQLite (`quiz.db`) - Zero configuration
- **🚀 Production**: Uses PostgreSQL - Persistent and scalable

The `DatabaseManager` class automatically detects the environment and uses:
- `DATABASE_URL` or `SUPABASE_URL` → PostgreSQL mode
- No database URL → SQLite mode (development)

## ✨ Recent Updates & Features

### 🗄️ **Database Architecture Overhaul (August 2025)**
- **Dual-mode database manager** supporting both SQLite and PostgreSQL
- **Automatic environment detection** - SQLite for development, PostgreSQL for production
- **Seamless migration** from Supabase to Render.com managed PostgreSQL
- **Enhanced connection handling** with IPv4/IPv6 compatibility and timeout management
- **Production-ready persistence** ensuring questions survive deployments

### 🔧 **Deployment & Infrastructure**
- **Render.com optimization** with automated deployment pipeline
- **Environment variable management** with secure credential handling
- **Network connectivity fixes** for PostgreSQL connections
- **Comprehensive setup guides** for database creation and configuration
- **Health monitoring endpoint** for production diagnostics

### 🤖 **AI Integration Improvements**
- **Enhanced error handling** for OpenAI API interactions
- **Robust retry mechanisms** with exponential backoff
- **Question validation** ensuring proper format and content
- **Spanish-focused prompts** for educational content generation
- **Balanced difficulty distribution** (3 fácil, 3 medio, 3 difícil per session)

### 🎨 **User Experience Enhancements**
- **Modern responsive design** with mobile-first approach
- **Spanish language interface** throughout the application
- **Real-time feedback** during question generation
- **Error recovery** with helpful diagnostic messages
- **Progressive enhancement** for feature availability

### 🛡️ **Security & Reliability**
- **Environment-based configuration** preventing credential exposure
- **Session management** with secure random secret generation
- **Input validation** and sanitization for all user inputs
- **Comprehensive logging** for debugging and monitoring
- **Graceful degradation** when services are unavailable

## 🏗️ Tech Stack

### **Backend**
- **Node.js + Express.js** with comprehensive error handling
- **Dual Database System:**
  - **SQLite** (better-sqlite3) for local development
  - **PostgreSQL** (pg) for production on Render.com
- **OpenAI API** (GPT-3.5/4) with retry mechanism and rate limiting
- **Environment-based configuration** for seamless deployment

### **Frontend**
- **Vanilla JavaScript** with modern ES6+ features
- **Responsive HTML5** with semantic markup and accessibility
- **Modern CSS3** featuring:
  - CSS Variables for consistent theming
  - Flexbox and Grid for responsive layouts
  - Smooth animations and transitions
  - Mobile-first responsive design

### **Production Infrastructure**
- **Render.com** for hosting and PostgreSQL database
- **GitHub Actions** for automated deployment
- **Environment variable management** for secure configuration
- **Health monitoring** and diagnostic endpoints

### **Development Tools**
- **dotenv** for local environment management
- **CORS** for cross-origin resource sharing
- **Debug utilities** for structured logging and monitoring
- **Git** with automated deployment pipeline

## 🏛️ Architecture

### **Core Components**

1. **DatabaseManager (database.js)**
   - **Dual-mode architecture** supporting SQLite and PostgreSQL
   - **Automatic environment detection** and database switching
   - **Connection pooling** and timeout management for production
   - **Schema initialization** and table creation
   - **Error handling** with helpful diagnostic messages

2. **Main Server (server.js)**
   - Express.js application with comprehensive middleware
   - RESTful API endpoints for question management
   - OpenAI client configuration and error handling
   - Session management and security middleware
   - Health monitoring and diagnostic endpoints

3. **Question Generator (question_generator.js)**
   - AI-powered question generation with OpenAI integration
   - Subject classification and validation
   - Spanish-language prompt engineering
   - Retry mechanism with exponential backoff
   - Response validation and format checking

4. **Admin Interface (public/admin/)**
   - Question generation interface with real-time feedback
   - Content management and editing capabilities
   - Search and filtering functionality
   - Error handling and user guidance

### **Database Schema**

**PostgreSQL (Production):**
```sql
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(100),
    topic VARCHAR(255),
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**SQLite (Development):**
```sql
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    topic TEXT,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_answer INTEGER NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Environment Detection Logic**

```javascript
// Automatic database mode selection
if (process.env.DATABASE_URL || process.env.SUPABASE_URL) {
    // Production: Use PostgreSQL
    this.dbType = 'postgres';
} else {
    // Development: Use SQLite
    this.dbType = 'sqlite';
}
```

### **API Endpoints**

#### **Health & Monitoring**
- `GET /health`
  - **Purpose**: System health check and configuration verification
  - **Response**: Database status, OpenAI configuration, environment info
  - **Usage**: Production monitoring and deployment verification

#### **Question Generation**
- `POST /api/generate`
  - **Purpose**: AI-powered question generation
  - **Process**:
    1. Classification of subject and topic from description
    2. Generation of balanced questions (3 per difficulty level)
    3. Validation and database storage
  - **Parameters**: `{ description: "Descripción del tema" }`
  - **Response**: Array of 9 questions with metadata
  - **Error Handling**: Comprehensive OpenAI and database error management

#### **Question Management**
- `GET /api/questions`
  - **Filtering**: `?subject=Matematicas&topic=Algebra&difficulty=medio`
  - **Pagination**: `?limit=20&offset=0`
  - **Search**: Dynamic filtering by multiple criteria

- `PATCH /api/questions/:id`
  - **Purpose**: Update existing questions
  - **Validation**: Content validation and format checking

- `DELETE /api/questions/:id`
  - **Purpose**: Remove questions from database
  - **Security**: Input validation and error handling

#### **Metadata Management**
- `GET /api/subjects` - Available subjects in Spanish
- `GET /api/topics?subject=Matematicas` - Topics filtered by subject

### **File Structure**

```
MentorPro/
├── 📁 public/
│   ├── 📁 admin/          # Admin interface
│   │   ├── admin.js       # Question generation and management
│   │   └── index.html     # Admin dashboard
│   ├── index.html         # Main landing page
│   ├── quiz.html          # Interactive quiz interface
│   ├── quiz.js           # Quiz logic and scoring
│   ├── monitor.html       # System monitoring (optional)
│   ├── monitor.js        # Health monitoring tools
│   └── styles.css        # Unified styling
├── 📁 utils/
│   └── debug.js          # Debug utilities and logging
├── 📄 database.js        # Dual-mode database manager
├── 📄 server.js          # Main application server
├── 📄 question_generator.js  # AI question generation
├── 📄 update_db.js       # Database migration tools
├── 📄 check_db.js        # Database verification
├── 📄 DEPLOYMENT.md      # Deployment instructions
├── 📄 RENDER_ENV_VARS.md # Environment variable guide
├── 📄 RENDER_POSTGRES_SETUP.md  # Database setup guide
└── 📄 package.json       # Dependencies and scripts
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

## 🚀 Deployment Guide

### **Render.com Setup (Recommended)**

1. **Create PostgreSQL Database:**
   ```bash
   # Go to Render.com dashboard
   # New + → PostgreSQL
   # Name: mentorpro-database
   # Database: mentorpro  
   # User: mentorpro_user
   # Plan: Free
   ```

2. **Deploy Web Service:**
   ```bash
   # Connect GitHub repository
   # Build Command: npm install
   # Start Command: node server.js
   ```

3. **Configure Environment Variables:**
   ```bash
   DATABASE_URL=postgresql://user:pass@host.render.com/db
   OPENAI_API_KEY=sk-proj-your_key_here
   ACCESS_CODE=your_admin_password
   SESSION_SECRET=random_secret_string
   NODE_ENV=production
   PORT=10000
   ```

4. **Verify Deployment:**
   - Check `/health` endpoint
   - Test question generation
   - Verify data persistence

### **Local Development:**
```bash
git clone https://github.com/jonnabio/MentorPro.git
cd MentorPro
npm install
cp .env.example .env  # Add your OpenAI API key
npm start  # Uses SQLite automatically
```

### **Environment Migration:**
- **Development → Production**: Automatically switches from SQLite to PostgreSQL
- **No data migration required**: Tables created automatically on first run
- **Configuration-driven**: Uses environment variables for database selection

## 🔧 Configuration Files

- **`.env.example`**: Template for local development environment
- **`RENDER_ENV_VARS.md`**: Complete guide for production environment variables
- **`RENDER_POSTGRES_SETUP.md`**: Step-by-step database setup instructions
- **`DEPLOYMENT.md`**: Comprehensive deployment guide with troubleshooting

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

## 🛡️ Error Handling & Reliability

### **Database Error Management**
- **Connection failures**: Automatic retry with exponential backoff
- **Schema validation**: Ensures table structure compatibility
- **Query optimization**: Prepared statements prevent SQL injection
- **Environment switching**: Graceful fallback between database types

### **AI Integration Reliability**
- **OpenAI API errors**: Comprehensive error categorization and handling
- **Rate limiting**: Intelligent retry mechanisms with backoff
- **Response validation**: Ensures generated content meets quality standards
- **Token management**: Optimized prompts for cost efficiency

### **Production Monitoring**
- **Health endpoints**: Real-time system status monitoring
- **Diagnostic logging**: Structured error reporting and debugging
- **Performance tracking**: Response time and success rate monitoring
- **Graceful degradation**: Application continues functioning during partial outages

### **Security Implementation**
- **Environment isolation**: Separate configurations for development and production
- **Credential management**: Secure environment variable handling
- **Input validation**: Comprehensive sanitization of user inputs
- **Session security**: Random secret generation and secure session handling

## 📈 Performance & Optimization

### **Database Performance**
- **Connection pooling**: Efficient resource management in production
- **Query optimization**: Indexed searches and prepared statements
- **Data validation**: Client-side and server-side validation layers
- **Caching strategies**: Optimized for frequently accessed data

### **Frontend Optimization**
- **Progressive enhancement**: Core functionality works without JavaScript
- **Responsive design**: Mobile-first approach with efficient CSS
- **Error boundaries**: Graceful handling of client-side errors
- **Loading states**: User feedback during async operations

### **AI Cost Optimization**
- **Prompt engineering**: Efficient question generation with minimal tokens
- **Batch processing**: Multiple questions generated in single API calls
- **Response caching**: Avoid duplicate generations for similar content
- **Model selection**: Optimal model choice for educational content generation

## 🎓 Educational Focus

### **Spanish Curriculum Alignment**
- **Subject Categories**: Matemáticas, Español, Ciencias, Estudios Sociales
- **Difficulty Progression**: Fácil → Medio → Difícil with contextual examples
- **Cultural Relevance**: Content appropriate for Spanish-speaking students
- **Academic Standards**: Aligned with educational best practices

### **Question Quality Assurance**
- **Format Validation**: Ensures proper multiple-choice structure
- **Content Review**: AI-generated questions validated for accuracy
- **Difficulty Balance**: Automatic distribution across complexity levels
- **Educational Value**: Focus on learning objectives and skill development

## 🤝 Contributing

### **Development Workflow**
1. **Fork the repository** and create a feature branch
2. **Set up local environment** with SQLite (zero configuration)
3. **Make your changes** with comprehensive testing
4. **Test in both environments** (SQLite locally, PostgreSQL in staging)
5. **Submit pull request** with detailed description

### **Code Standards**
- **ES6+ JavaScript**: Modern syntax and features
- **Modular architecture**: Clear separation of concerns
- **Comprehensive error handling**: Graceful failure management
- **Documentation**: Clear comments and README updates
- **Testing**: Both unit and integration testing encouraged

### **Contribution Areas**
- **AI prompt optimization**: Improve question generation quality
- **UI/UX enhancements**: Better user experience and accessibility
- **Database optimizations**: Performance and scalability improvements
- **New features**: Subject expansion, quiz types, analytics
- **Documentation**: Setup guides, tutorials, API documentation

## 📄 License

**ISC License** - See LICENSE file for details.

---

## 🔗 Links & Resources

- **Production Demo**: [mentorpro.onrender.com](https://mentorpro.onrender.com)
- **GitHub Repository**: [github.com/jonnabio/MentorPro](https://github.com/jonnabio/MentorPro)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Environment Setup**: [RENDER_ENV_VARS.md](./RENDER_ENV_VARS.md)
- **Database Setup**: [RENDER_POSTGRES_SETUP.md](./RENDER_POSTGRES_SETUP.md)

---

**Built with ❤️ for Spanish-language education | Desarrollado con ❤️ para la educación en español**
