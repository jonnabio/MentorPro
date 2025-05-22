// Store DOM elements globally so they persist
const elements = {};
const features = {};

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

    let currentScore = 0;
    let totalAnswered = 0;

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
        // Define core required features and nice-to-have features
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
        }        try {
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
            }            // Build query parameters with fallbacks for missing elements            // Build query parameters, only include non-empty values
            const params = {};
            if (elements.subjectSelect?.value) params.subject = elements.subjectSelect.value;
            if (elements.topicSelect?.value) params.topic = elements.topicSelect.value;
            if (elements.difficultySelect?.value) params.difficulty = elements.difficultySelect.value;
            params.limit = '5';

            const queryParams = new URLSearchParams(params);
            console.log('Query parameters:', Object.fromEntries(queryParams.entries()));console.log('Sending request with params:', queryParams.toString());
            const response = await fetch(`/api/questions?${queryParams}`);
            console.log('Server response status:', response.status);
            const data = await response.json();
            console.log('Server response data:', data);
              // Log the full response details
            console.log('Full response:', {
                status: response.status,
                statusText: response.statusText,
                data: data,
                headers: Object.fromEntries([...response.headers])
            });

            if (!response.ok) {
                throw new Error(data.error || `Error al buscar preguntas (${response.status}: ${response.statusText})`);
            }            if (!data.questions?.length) {
                console.log('No questions found in response');
                showMessage('No se encontraron preguntas para los criterios seleccionados. Intenta con otros criterios o genera nuevas preguntas usando el botón "Generar".', 'info');
                return;
            }

            displayQuestions(data.questions);
        } catch (error) {
            // Only log as error if it's not a normal "no questions" response
            if (!error.message.includes('No se encontraron preguntas')) {
                console.error('Error searching questions:', error);
            } else {
                console.log('Search completed with no results:', error.message);
            }
            
            // Provide more helpful error messages based on the error type
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'No se pudo conectar al servidor. Por favor verifica tu conexión.';
            } else if (error.message.includes('404')) {
                errorMessage = 'No se encontraron preguntas para los criterios seleccionados. Puedes generar nuevas preguntas usando el botón "Generar".';
            }
            showMessage(errorMessage, error.message.includes('No se encontraron preguntas') ? 'info' : 'error');
        } finally {
            // Reset UI state
            if (elements.loadingIndicator) {
                elements.loadingIndicator.style.display = 'none';
            }
            if (elements.searchBtn) {
                elements.searchBtn.disabled = false;
            }
        }        function showMessage(message, className) {
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
        const isCorrect = selectedIndex === question.correct_answer;
        const questionDiv = document.querySelector(`input[name="q${question.id}"]`).closest('.question');
        const options = questionDiv.querySelectorAll('input[type="radio"]');
        
        // Disable all options
        options.forEach(opt => opt.disabled = true);
        
        // Update score
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
        
        // Check if quiz is complete
        if (totalAnswered === 5) {
            showQuizCompletion();
        }
    }    function showQuizCompletion() {
        console.log('Showing quiz completion with features:', features);
        const scorePercentage = (currentScore / 5) * 100;
        
        // Check if questionsContainer exists before attempting to modify it
        if (!elements.questionsContainer) {
            console.error('Questions container not found');
            return;
        }

        // Ensure the quiz completion section is cleared
        if (elements.quizComplete) {
            elements.quizComplete.style.display = 'none';
        }

        // Use the appropriate container based on feature availability
        const completionContainer = elements.quizComplete || elements.questionsContainer;

        if (features.quizComplete && elements.quizComplete && elements.newQuizBtn) {
            console.log('Using full quiz completion display');
            elements.quizComplete.style.display = 'block';
            
            // Set up the completion message
            if (elements.completionMessage) {
                elements.completionMessage.textContent = scorePercentage >= 80 ? 
                    '¡Felicitaciones!' : '¡Sigue practicando!';
            }
            
            // Set up the score display
            if (elements.finalScore) {
                elements.finalScore.textContent = `Puntuación final: ${currentScore}/5 (${scorePercentage}%)`;
            }
            
            // Set up the difficulty recommendation
            if (elements.difficultyRecommendation && elements.difficultySelect) {
                const currentDifficulty = elements.difficultySelect.value;
                let nextDifficulty = '';
                
                if (scorePercentage >= 80) {
                    if (currentDifficulty !== 'hard') {                        nextDifficulty = currentDifficulty === 'easy' ? 'medium' : 'hard';
                        elements.difficultyRecommendation.textContent = 
                            `¡Buen trabajo! Intenta el siguiente quiz en nivel ${nextDifficulty === 'medium' ? 'Intermedio' : 'Avanzado'}.`;
                    } else {
                        elements.difficultyRecommendation.textContent = '¡Excelente! Has dominado el nivel difícil.';
                    }
                } else {
                    if (currentDifficulty !== 'easy') {
                        nextDifficulty = currentDifficulty === 'hard' ? 'medium' : 'easy';                        elements.difficultyRecommendation.textContent = 
                            `Intenta practicar más en nivel ${nextDifficulty === 'medium' ? 'Intermedio' : 'Principiante'}.`;
                    } else {
                        elements.difficultyRecommendation.textContent = 'Sigue practicando en este nivel para mejorar.';
                    }
                }
                
                // Update difficulty for next quiz if recommended
                if (nextDifficulty && elements.difficultySelect) {
                    elements.difficultySelect.value = nextDifficulty;
                }
            }
        } else {
            // Fallback to basic completion message
            console.log('Using basic quiz completion display');
            const basicCompletionHtml = `
                <div class="quiz-complete-basic">
                    <h2>Quiz Completado</h2>
                    <p>Puntuación final: ${currentScore}/5 (${scorePercentage}%)</p>
                    <button onclick="window.location.reload()" class="primary-button">Nuevo Quiz</button>
                </div>
            `;
            
            elements.questionsContainer.insertAdjacentHTML('beforeend', basicCompletionHtml);
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
