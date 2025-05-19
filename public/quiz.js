document.addEventListener('DOMContentLoaded', () => {
    const subjectSelect = document.getElementById('subjectSelect');
    const topicSelect = document.getElementById('topicSelect');
    const searchBtn = document.getElementById('searchBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const questionsContainer = document.getElementById('questionsContainer');
    let currentScore = 0;
    let totalAnswered = 0;

    // Load subjects on page load
    loadSubjects();

    // Load topics when subject changes
    subjectSelect.addEventListener('change', loadTopics);

    // Search for questions when button is clicked
    searchBtn.addEventListener('click', searchQuestions);

    async function loadSubjects() {
        try {
            console.log('Loading subjects...');
            subjectSelect.innerHTML = '<option value="">Cargando materias...</option>';
            subjectSelect.disabled = true;
            
            const response = await fetch('/api/subjects');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Expected JSON but got ${contentType}`);
            }
            
            const data = await response.json();
            console.log('Subjects data:', data);
            
            subjectSelect.innerHTML = '<option value="">Todas las Materias</option>';
            if (data.subjects && data.subjects.length > 0) {
                data.subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject === 'Espanol' ? 'Español' : 
                                       subject === 'Matematicas' ? 'Matemáticas' : 
                                       subject;
                    subjectSelect.appendChild(option);
                });
            } else {
                console.warn('No subjects received from server');
            }
        } catch (error) {
            console.error('Error loading subjects:', error);
            subjectSelect.innerHTML = '<option value="">Error al cargar materias</option>';
        } finally {
            subjectSelect.disabled = false;
        }
    }

    // Load topics when subject changes
    subjectSelect.addEventListener('change', loadTopics);

    // Search for questions when button is clicked
    searchBtn.addEventListener('click', searchQuestions);

    // Initial load of topics for selected subject
    loadTopics();

    async function loadTopics() {
        const subject = subjectSelect.value;
        
        try {
            topicSelect.innerHTML = '<option value="">Cargando temas...</option>';
            topicSelect.disabled = true;
            
            const queryParams = new URLSearchParams();
            if (subject) {
                queryParams.append('subject', subject);
            }
            
            const response = await fetch(`/api/topics?${queryParams}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar los temas');
            }
            
            topicSelect.innerHTML = '<option value="">Todos los Temas</option>';
            if (data.topics && data.topics.length > 0) {
                data.topics.forEach(topic => {
                    const option = document.createElement('option');
                    option.value = topic;
                    option.textContent = topic;
                    topicSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading topics:', error);
            topicSelect.innerHTML = '<option value="">Error al cargar temas</option>';
        } finally {
            topicSelect.disabled = false;
        }
    }

    async function searchQuestions() {
        const subject = subjectSelect.value;
        const topic = topicSelect.value;

        try {
            // Show loading indicator
            loadingIndicator.style.display = 'block';
            questionsContainer.innerHTML = '';
            searchBtn.disabled = true;
            
            const queryParams = new URLSearchParams();
            if (subject) queryParams.append('subject', subject);
            if (topic) queryParams.append('topic', topic);

            const response = await fetch(`/api/questions?${queryParams}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al buscar preguntas');
            }

            if (!data.questions || data.questions.length === 0) {
                questionsContainer.innerHTML = '<p class="no-results">No se encontraron preguntas</p>';
                return;
            }

            displayQuestions(data.questions);
        } catch (error) {
            console.error('Error searching questions:', error);
            questionsContainer.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none';
            searchBtn.disabled = false;
        }
    }

    function displayQuestions(questions) {
        // Reset score for new set of questions
        currentScore = 0;
        totalAnswered = 0;
        
        const scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'scoreDisplay';
        scoreDisplay.className = 'score-display';
        scoreDisplay.textContent = 'Puntuación: 0/0';
        
        questionsContainer.innerHTML = '';
        questionsContainer.appendChild(scoreDisplay);
        
        questions.forEach((q, qIndex) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';
            questionDiv.innerHTML = `
                <h3>Pregunta ${qIndex + 1}</h3>
                <p>${q.question}</p>
                <div class="options">
                    ${q.options.map((option, oIndex) => `
                        <div class="option">
                            <input type="radio" 
                                   name="q${q.id}" 
                                   value="${oIndex}" 
                                   id="q${q.id}_${oIndex}" />
                            <label for="q${q.id}_${oIndex}">${option}</label>
                        </div>
                    `).join('')}
                </div>
            `;
            questionsContainer.appendChild(questionDiv);

            // Add keyboard navigation and event listeners
            const optionsDiv = questionDiv.querySelector('.options');
            const options = optionsDiv.querySelectorAll('input[type="radio"]');
            
            options.forEach((option, index) => {
                option.addEventListener('change', (e) => {
                    const selectedIndex = parseInt(e.target.value);
                    const isCorrect = selectedIndex === q.correct_answer;
                    
                    // Remove previous result classes
                    optionsDiv.querySelectorAll('.option').forEach(optionDiv => {
                        optionDiv.classList.remove('correct', 'incorrect');
                        optionDiv.querySelector('input').disabled = true;
                    });

                    // Add appropriate class to selected option
                    const selectedOption = e.target.closest('.option');
                    selectedOption.classList.add(isCorrect ? 'correct' : 'incorrect');

                    // Show correct answer if wrong
                    if (!isCorrect) {
                        optionsDiv.querySelectorAll('.option')[q.correct_answer]
                            .classList.add('correct');
                    }

                    // Update score
                    totalAnswered++;
                    if (isCorrect) currentScore++;
                    
                    // Update score display
                    const scorePercentage = Math.round((currentScore / totalAnswered) * 100);
                    scoreDisplay.textContent = `Puntuación: ${currentScore}/${totalAnswered} (${scorePercentage}%)`;
                });

                // Add keyboard navigation
                option.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        const nextInput = options[index + 1] || options[0];
                        nextInput.focus();
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prevInput = options[index - 1] || options[options.length - 1];
                        prevInput.focus();
                    }
                });
            });
        });
    }
});
