// Store DOM elements globally so they persist
const elements = {};
const features = {};
let currentDifficulty = 'easy';
let currentScore = 0;
let totalAnswered = 0;

function initializeElement(id) {
    const element = document.getElementById(id);
    elements[id] = element;
    if (!element) {
        console.warn(`Element #${id} not found during initialization`);
        return false;
    }
    console.log(`Element #${id} found successfully`);
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    
    // Initialize DOM elements with error checking
    const elementIds = [
        'subjectSelect',
        'topicSelect',
        'difficultySelect',
        'searchBtn',
        'loadingIndicator',
        'questionsContainer',
        'quizComplete',
        'newQuizBtn',
        'completionMessage',
        'finalScore',
        'difficultyRecommendation'
    ];
      // Initialize features independently
    const initializeFeature = (name, requiredElements) => {
        console.log(`Initializing feature: ${name}`);
        const results = requiredElements.map(id => {
            const success = initializeElement(id);
            if (!success) {
                console.warn(`Missing element ${id} for feature ${name}`);
            }
            return success;
        });
        const isAvailable = results.every(result => result);
        features[name] = isAvailable;
        console.log(`Feature ${name} initialization ${isAvailable ? 'successful' : 'failed'}`);
        return isAvailable;
    };

    // Initialize each feature with its required elements
    initializeFeature('subjectSelection', ['subjectSelect']);
    initializeFeature('topicSelection', ['topicSelect']);
    initializeFeature('difficultySelection', ['difficultySelect']);
    initializeFeature('quizStart', ['searchBtn', 'questionsContainer']);
    initializeFeature('loadingIndicator', ['loadingIndicator']);
    initializeFeature('questionsContainer', ['questionsContainer']);
    
    // Split quiz completion into core and extra features
    const hasQuizComplete = initializeFeature('quizComplete', ['quizComplete', 'newQuizBtn']);
    const hasScoreDisplay = initializeFeature('scoreDisplay', ['completionMessage', 'finalScore']);
    const hasDifficultyRecommendation = initializeFeature('difficultyRecommendation', ['difficultyRecommendation']);

    // Add event listener for new quiz button
    if (elements.newQuizBtn) {
        elements.newQuizBtn.addEventListener('click', () => {
            // Reset everything and start over
            currentScore = 0;
            totalAnswered = 0;
            if (elements.quizComplete) {
                elements.quizComplete.style.display = 'none';
            }
            if (elements.questionsContainer) {
                elements.questionsContainer.innerHTML = '';
            }
            searchQuestions();
        });
    }

    // Log feature availability
    console.log('Features initialized:', features);

    // Function declarations
    async function loadSubjects() {
        if (!features.subjectSelection) {
            console.warn('Subject selection is not available');
            return;
        }

        try {
            elements.subjectSelect.innerHTML = '<option value="">Cargando materias...</option>';
            elements.subjectSelect.disabled = true;
            
            const response = await fetch('/api/subjects');
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const data = await response.json();
            
            elements.subjectSelect.innerHTML = '<option value="">Todas las Materias</option>';
            if (data.subjects?.length > 0) {
                data.subjects.forEach(subject => {                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject === 'Espanol' ? 'Español' : 
                                       subject === 'Matematicas' ? 'Matemáticas' : 
                                       subject === 'Social Studies' ? 'Estudios Sociales' :
                                       subject;
                    elements.subjectSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading subjects:', error);
            if (elements.subjectSelect) {
                elements.subjectSelect.innerHTML = '<option value="">Error al cargar materias</option>';
            }
        } finally {
            if (elements.subjectSelect) {
                elements.subjectSelect.disabled = false;
            }
        }
    }

    async function loadTopics() {
        if (!elements.topicSelect || !elements.subjectSelect) return;
        
        const subject = elements.subjectSelect.value;
        try {
            elements.topicSelect.innerHTML = '<option value="">Cargando temas...</option>';
            elements.topicSelect.disabled = true;
            
            const queryParams = new URLSearchParams();
            if (subject) {
                queryParams.append('subject', subject);
            }
            
            const response = await fetch(`/api/topics?${queryParams}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar los temas');
            }
            
            elements.topicSelect.innerHTML = '<option value="">Todos los Temas</option>';
            if (data.topics?.length > 0) {
                data.topics.forEach(topic => {
                    const option = document.createElement('option');
                    option.value = topic;
                    option.textContent = topic;
                    elements.topicSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading topics:', error);
            elements.topicSelect.innerHTML = '<option value="">Error al cargar temas</option>';
        } finally {
            elements.topicSelect.disabled = false;
        }
    }    async function searchQuestions() {
        const coreFeatures = ['questionsContainer'];
        const optionalFeatures = ['difficultySelection', 'quizComplete'];
        
        // Check core features
        const missingCore = coreFeatures.filter(feature => !features[feature]);
        if (missingCore.length > 0) {
            console.error('Core features not available:', missingCore);
            document.body.innerHTML = '<p class="error">Error: No se puede cargar el quiz. Faltan elementos esenciales.</p>';
            return;
        }
        
        // Log optional feature availability
        const missingOptional = optionalFeatures.filter(feature => !features[feature]);
        if (missingOptional.length > 0) {
            console.warn('Some optional features not available:', missingOptional);
        }

        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (elements.subjectSelect?.value) params.append('subject', elements.subjectSelect.value);
            if (elements.topicSelect?.value) params.append('topic', elements.topicSelect.value);
            params.append('difficulty', currentDifficulty);

            // Safe element access with null checks
            if (elements.loadingIndicator) {
                elements.loadingIndicator.style.display = 'block';
            }
            if (elements.questionsContainer) {
                elements.questionsContainer.innerHTML = '';
            }
            if (elements.searchBtn) {
                elements.searchBtn.disabled = true;
            }
            if (elements.quizComplete) {
                elements.quizComplete.style.display = 'none';
            }

            // Get quiz questions from new endpoint
            const response = await fetch(`/api/quiz-questions?${params}`);
            const data = await response.json();

            if (!data.success) {
                showMessage(data.message || 'No hay suficientes preguntas disponibles', 'info');
                return;
            }

            // Store quiz metadata
            if (elements.questionsContainer) {
                elements.questionsContainer.dataset.nextLevel = data.nextLevel;
                elements.questionsContainer.dataset.requiredScore = data.requiredScore;
            }

            displayQuestions(data.questions);
        } catch (error) {
            console.error('Error fetching quiz questions:', error);
            showMessage('Error al cargar las preguntas del quiz', 'error');
        } finally {
            if (elements.loadingIndicator) {
                elements.loadingIndicator.style.display = 'none';
            }
            if (elements.searchBtn) {
                elements.searchBtn.disabled = false;
            }
        }
    }

    function showMessage(message, className) {
        const container = elements.questionsContainer || document.querySelector('.container') || document.body;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-container ${className}`;
        
        // Different message styles based on type
        const iconMap = {
            'error': '❌',
            'info': 'ℹ️',
            'no-results': '🔍'
        };

        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-icon">${iconMap[className] || 'ℹ️'}</span>
                <p class="message-text">${message}</p>
                ${className === 'no-results' ? `
                    <div class="message-actions">
                        <button onclick="location.reload()" class="action-button">Intentar con otros criterios</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Clear existing content if it's the questions container
        if (container === elements.questionsContainer) {
            container.innerHTML = '';
        }
        
        container.appendChild(messageDiv);
    }

    function displayQuestions(questions) {
        if (!elements.questionsContainer) return;

        currentScore = 0;
        totalAnswered = 0;
        
        const scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'scoreDisplay';
        scoreDisplay.className = 'score-display';
        scoreDisplay.textContent = 'Puntuación: 0/0';
        
        elements.questionsContainer.innerHTML = '';
        elements.questionsContainer.appendChild(scoreDisplay);
        
        questions.forEach((q, qIndex) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';
            
            const title = document.createElement('h3');
            title.textContent = `Pregunta ${qIndex + 1}`;
            
            const questionText = document.createElement('p');
            questionText.textContent = q.question;
            
            const optionsForm = document.createElement('form');
            optionsForm.className = 'options';
            optionsForm.addEventListener('submit', e => e.preventDefault());
            
            q.options.forEach((option, oIndex) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'option';
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `q${q.id}`;
                input.value = oIndex;
                input.id = `q${q.id}_${oIndex}`;
                
                const label = document.createElement('label');
                label.htmlFor = `q${q.id}_${oIndex}`;
                label.textContent = option;
                
                optionDiv.appendChild(input);
                optionDiv.appendChild(label);
                optionsForm.appendChild(optionDiv);
                
                input.addEventListener('change', () => handleAnswerSelection(q, oIndex));
            });
            
            questionDiv.appendChild(title);
            questionDiv.appendChild(questionText);
            questionDiv.appendChild(optionsForm);
            elements.questionsContainer.appendChild(questionDiv);
        });
    }

    function handleAnswerSelection(question, selectedIndex) {
        const questionDiv = document.querySelector(`input[name="q${question.id}"]`).closest('.question');
        const options = questionDiv.querySelectorAll('input[type="radio"]');
        
        // Disable all options
        options.forEach(opt => opt.disabled = true);
        
        // Update score
        const isCorrect = selectedIndex === question.correct_answer;
        if (isCorrect) currentScore++;
        totalAnswered++;
        
        // Update score display
        const scoreDisplay = document.getElementById('scoreDisplay');
        if (scoreDisplay) {
            scoreDisplay.textContent = `Puntuación: ${currentScore}/${totalAnswered}`;
        }
        
        // Visual feedback
        const allOptionDivs = questionDiv.querySelectorAll('.option');
        allOptionDivs.forEach((div, idx) => {
            if (idx === question.correct_answer) {
                div.classList.add('correct');
            } else if (idx === selectedIndex && !isCorrect) {
                div.classList.add('incorrect');
            }
        });
        
        // Check if quiz level is complete
        if (totalAnswered === 3) {
            showQuizCompletion();
        }
    }

    async function showQuizCompletion() {
        const scorePercentage = (currentScore / 3) * 100;
        const nextLevel = elements.questionsContainer?.dataset.nextLevel;
        const requiredScore = parseFloat(elements.questionsContainer?.dataset.requiredScore || "0.8");
        const passed = scorePercentage >= (requiredScore * 100);

        let message, action;
        if (passed && nextLevel) {
            message = `¡Felicitaciones! Has completado este nivel con ${scorePercentage.toFixed(1)}% de aciertos. ¿Deseas continuar al siguiente nivel?`;
            action = async () => {
                currentDifficulty = nextLevel;
                if (elements.difficultySelect) {
                    elements.difficultySelect.value = nextLevel;
                }
                await searchQuestions();
            };
        } else if (passed) {
            message = `¡Felicitaciones! Has dominado todos los niveles de este tema con ${scorePercentage.toFixed(1)}% de aciertos.`;
            action = null;
        } else {
            message = `Has obtenido ${scorePercentage.toFixed(1)}% de aciertos. ¡Sigue practicando para mejorar tu comprensión!`;
            action = async () => {
                // Keep same difficulty level for retry
                await searchQuestions();
            };
        }

        if (elements.quizComplete) {
            elements.quizComplete.style.display = 'block';
            if (elements.completionMessage) {
                elements.completionMessage.textContent = message;
            }
            if (elements.finalScore) {
                elements.finalScore.textContent = `Puntuación final: ${currentScore}/3`;
            }
            if (elements.newQuizBtn) {
                if (action) {
                    elements.newQuizBtn.textContent = passed && nextLevel ? 'Continuar al siguiente nivel' : 'Intentar de nuevo';
                    elements.newQuizBtn.onclick = action;
                    elements.newQuizBtn.style.display = 'block';
                } else {
                    elements.newQuizBtn.style.display = 'none';
                }
            }
        } else {
            showMessage(message, passed ? 'success' : 'info');
            if (action) {
                const actionButton = document.createElement('button');
                actionButton.textContent = passed && nextLevel ? 'Continuar al siguiente nivel' : 'Intentar de nuevo';
                actionButton.onclick = action;
                actionButton.className = 'primary-button';
                elements.questionsContainer.appendChild(actionButton);
            }
        }
    }

    // Add event listeners based on available features
    function setupEventListeners() {
        // Subject selection
        if (features.subjectSelection) {
            elements.subjectSelect.addEventListener('change', () => {
                if (features.topicSelection) {
                    loadTopics();
                }
            });
        }

        // Quiz start
        if (features.quizStart && elements.searchBtn) {
            elements.searchBtn.addEventListener('click', searchQuestions);
        }

        // New quiz button
        if (features.quizComplete && elements.newQuizBtn) {
            elements.newQuizBtn.addEventListener('click', () => {
                currentScore = 0;
                totalAnswered = 0;
                if (elements.questionsContainer) {
                    elements.questionsContainer.innerHTML = '';
                }
                if (elements.quizComplete) {
                    elements.quizComplete.style.display = 'none';
                }
                searchQuestions();
            });
        }
    }

    // Initialize tooltips for missing features
    function setupTooltips() {
        if (!features.difficultySelection && elements.questionsContainer) {
            const notice = document.createElement('div');
            notice.className = 'feature-notice';
            notice.textContent = 'La selección de dificultad no está disponible. Usando dificultad media por defecto.';
            elements.questionsContainer.insertAdjacentElement('beforebegin', notice);
        }
    }

    // Call initialization functions
    setupEventListeners();
    setupTooltips();

    // Initial load if subject selection is available
    if (features.subjectSelection) {
        loadSubjects();
    }
});
