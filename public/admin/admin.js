document.addEventListener('DOMContentLoaded', () => {
    const learningObjectiveInput = document.getElementById('learningObjective');
    const generateBtn = document.getElementById('generateBtn');
    const questionsContainer = document.getElementById('questionsContainer');

    // Initial load of subjects and topics
    loadSubjects();
    loadTopics();

    generateBtn.addEventListener('click', async () => {
        if (!learningObjectiveInput.value.trim()) {
            alert('Por favor ingresa un objetivo de aprendizaje');
            return;
        }

        try {
            generateBtn.disabled = true;
            questionsContainer.innerHTML = '<p class="loading">Generando preguntas...</p>';

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: learningObjectiveInput.value
                })
            });

            const data = await response.json();
            if (response.ok) {
                displayQuestions(data.questions);
            } else {
                throw new Error(data.error || 'Error al generar preguntas');
            }
        } catch (error) {
            questionsContainer.innerHTML = `<p style="color: #ff4444;">Error: ${error.message}</p>`;
        } finally {
            generateBtn.disabled = false;
        }
    });
});

// Load subjects from the database
async function loadSubjects() {
    const subjectSelect = document.getElementById('searchSubject');
    
    try {
        subjectSelect.innerHTML = '<option value="">Cargando materias...</option>';
        subjectSelect.disabled = true;
        
        const response = await fetch('/api/subjects');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al cargar las materias');
        }
        
        subjectSelect.innerHTML = '<option value="">Todas las Materias</option>';
        if (data.subjects?.length > 0) {
            data.subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject === 'Espanol' ? 'Español' : 
                                   subject === 'Matematicas' ? 'Matemáticas' :
                                   subject === 'Social Studies' ? 'Estudios Sociales' :
                                   subject;
                subjectSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
        subjectSelect.innerHTML = '<option value="">Error al cargar materias</option>';
    } finally {
        subjectSelect.disabled = false;
    }
}

// Load topics based on selected subject
async function loadTopics() {
    const subject = document.getElementById('searchSubject').value;
    const topicSelect = document.getElementById('searchTopic');
    
    try {
        topicSelect.innerHTML = '<option value="">Cargando temas...</option>';
        
        const queryParams = new URLSearchParams();
        if (subject) queryParams.append('subject', subject);
        
        const response = await fetch(`/api/topics?${queryParams}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al cargar los temas');
        }
        
        topicSelect.innerHTML = '<option value="">Todos los Temas</option>' +
            data.topics.map(topic => `<option value="${topic}">${topic}</option>`).join('');
    } catch (error) {
        console.error('Error loading topics:', error);
        topicSelect.innerHTML = '<option value="">Error al cargar temas</option>';
    }
}

// Search questions function
async function searchQuestions() {
    const subject = document.getElementById('searchSubject').value;
    const topic = document.getElementById('searchTopic').value;
    const searchResults = document.getElementById('searchResults');

    try {
        searchResults.innerHTML = '<p class="loading">Buscando preguntas...</p>';
        
        const queryParams = new URLSearchParams();
        if (subject) queryParams.append('subject', subject);
        if (topic) queryParams.append('topic', topic);

        const response = await fetch(`/api/questions?${queryParams}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al buscar preguntas');
        }

        if (!data.questions || data.questions.length === 0) {
            searchResults.innerHTML = '<p class="no-results">No se encontraron preguntas</p>';
            return;
        }

        displayQuestions(data.questions, searchResults);
    } catch (error) {
        console.error('Error searching questions:', error);
        searchResults.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

// Function to display questions
function displayQuestions(questions, targetContainer = document.getElementById('questionsContainer')) {
    targetContainer.innerHTML = questions.map((q, index) => `
        <div class="question" data-id="${q.id}">
            <div class="question-header">
                <h3>Pregunta ${index + 1}</h3>
                <div class="question-controls">
                    <button class="edit-btn" onclick="editQuestion(${q.id})">Editar</button>
                    <button class="delete-btn" onclick="deleteQuestion(${q.id})">Eliminar</button>
                </div>
            </div>
            <p>${q.question}</p>
            <div class="options">
                ${q.options.map((option, i) => `
                    <div class="option ${i === q.correct_answer ? 'correct' : ''}">
                        ${option}
                    </div>
                `).join('')}
            </div>
            <div class="metadata">
                <span>Materia: ${q.subject}</span>
                <span>Tema: ${q.topic}</span>
            </div>
        </div>
    `).join('');
}

// Delete question function
async function deleteQuestion(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
        return;
    }

    try {
        const response = await fetch(`/api/questions/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al eliminar la pregunta');
        }

        // Reload questions
        searchQuestions();
    } catch (error) {
        console.error('Error deleting question:', error);
        alert(error.message);
    }
}

// Edit question function
async function editQuestion(id) {
    const questionDiv = document.querySelector(`.question[data-id="${id}"]`);
    if (!questionDiv) return;

    const question = questionDiv.querySelector('p').textContent;
    const options = Array.from(questionDiv.querySelectorAll('.option'))
        .map(option => option.textContent.trim());
    const correctAnswer = options.findIndex(
        (_, i) => questionDiv.querySelector(`.option:nth-child(${i + 1})`).classList.contains('correct')
    );
    const subject = questionDiv.querySelector('.metadata span:first-child').textContent.replace('Materia: ', '');
    const topic = questionDiv.querySelector('.metadata span:last-child').textContent.replace('Tema: ', '');

    // Replace question display with edit form
    questionDiv.innerHTML = `
        <div class="edit-form">
            <textarea class="edit-question">${question}</textarea>
            ${options.map((option, i) => `
                <input type="text" class="edit-option" value="${option}">
            `).join('')}
            <div class="edit-metadata">
                <input type="text" class="edit-subject" value="${subject}">
                <input type="text" class="edit-topic" value="${topic}">
                <select class="edit-correct-answer">
                    ${options.map((_, i) => `
                        <option value="${i}" ${i === correctAnswer ? 'selected' : ''}>
                            Opción ${i + 1}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="edit-controls">
                <button class="save-btn" onclick="saveQuestion(${id})">Guardar</button>
                <button class="cancel-btn" onclick="searchQuestions()">Cancelar</button>
            </div>
        </div>
    `;
}

// Save edited question
async function saveQuestion(id) {
    const questionDiv = document.querySelector(`.question[data-id="${id}"]`);
    if (!questionDiv) return;

    const question = questionDiv.querySelector('.edit-question').value;
    const options = Array.from(questionDiv.querySelectorAll('.edit-option'))
        .map(input => input.value.trim());
    const correctAnswer = parseInt(questionDiv.querySelector('.edit-correct-answer').value);
    const subject = questionDiv.querySelector('.edit-subject').value;
    const topic = questionDiv.querySelector('.edit-topic').value;

    try {
        const response = await fetch(`/api/questions/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question,
                options,
                correctAnswer,
                subject,
                topic
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al actualizar la pregunta');
        }

        // Reload questions
        searchQuestions();
    } catch (error) {
        console.error('Error updating question:', error);
        alert(error.message);
    }
}
