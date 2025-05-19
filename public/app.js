document.addEventListener('DOMContentLoaded', () => {
    const learningObjectiveInput = document.getElementById('learningObjective');
    const generateBtn = document.getElementById('generateBtn');
    const questionsContainer = document.getElementById('questionsContainer');

    // Initial load of topics
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
                },                body: JSON.stringify({
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

// Search questions function - defined in global scope
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
    targetContainer.innerHTML = questions.map((q, qIndex) => `
        <div class="question" data-id="${q.id}">
            <div class="question-header">
                <h3>Pregunta ${qIndex + 1}</h3>
                <div class="question-controls">
                    <button class="edit-btn" onclick="editQuestion(${q.id})">Editar</button>
                    <button class="delete-btn" onclick="deleteQuestion(${q.id})">Eliminar</button>
                </div>
            </div>
            <div class="question-content" id="question-content-${q.id}">
                <p>${q.question}</p>
                <div class="options">
                    ${q.options.map((option, oIndex) => `
                        <label class="option ${oIndex === q.correctAnswer ? 'correct' : ''}">
                            <input type="radio" name="q${q.id}_${qIndex}" value="${oIndex}" 
                                   ${oIndex === q.correctAnswer ? 'data-correct="true"' : ''} />
                            ${option}
                        </label>
                    `).join('')}
                </div>
                <div class="question-meta">
                    <span class="subject-label">Materia: ${q.subject}</span>
                    <span class="topic-label">Tema: ${q.topic}</span>
                </div>
            </div>
            <div class="edit-form" id="edit-form-${q.id}" style="display: none;">
                <input type="text" class="edit-question-text" value="${q.question}" />
                ${q.options.map((option, index) => `
                    <input type="text" class="edit-option" value="${option}" 
                           data-option-index="${index}" />
                `).join('')}
                <select class="edit-correct-answer">
                    ${q.options.map((_, index) => `
                        <option value="${index}" ${index === q.correctAnswer ? 'selected' : ''}>
                            Opción ${index + 1}
                        </option>
                    `).join('')}
                </select>
                <select class="edit-subject">
                    ${['Espanol', 'Matematicas', 'Ciencias', 'Social Studies']
                        .map(subj => `<option value="${subj}" ${subj === q.subject ? 'selected' : ''}>${subj}</option>`)
                        .join('')}
                </select>
                <input type="text" class="edit-topic" value="${q.topic}" />
                <div class="edit-controls">
                    <button onclick="saveQuestion(${q.id})" class="save-btn">Guardar</button>
                    <button onclick="cancelEdit(${q.id})" class="cancel-btn">Cancelar</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Function to delete a question
async function deleteQuestion(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta pregunta?')) {
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

        // Remove the question from the UI
        document.querySelector(`[data-id="${id}"]`).remove();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Function to show edit form
function editQuestion(id) {
    const contentDiv = document.getElementById(`question-content-${id}`);
    const editForm = document.getElementById(`edit-form-${id}`);
    
    contentDiv.style.display = 'none';
    editForm.style.display = 'block';
}

// Function to cancel edit
function cancelEdit(id) {
    const contentDiv = document.getElementById(`question-content-${id}`);
    const editForm = document.getElementById(`edit-form-${id}`);
    
    contentDiv.style.display = 'block';
    editForm.style.display = 'none';
}

// Function to save question changes
async function saveQuestion(id) {
    const questionElement = document.querySelector(`[data-id="${id}"]`);
    const editForm = document.getElementById(`edit-form-${id}`);
    const contentDiv = document.getElementById(`question-content-${id}`);
    
    try {
        // Get form values
        const question = editForm.querySelector('.edit-question-text').value.trim();
        const options = Array.from(editForm.querySelectorAll('.edit-option')).map(input => input.value.trim());
        const correctAnswer = parseInt(editForm.querySelector('.edit-correct-answer').value);
        const subject = editForm.querySelector('.edit-subject').value.trim();
        const topic = editForm.querySelector('.edit-topic').value.trim();

        // Client-side validation
        if (!question || !topic || !subject) {
            throw new Error('Todos los campos son requeridos');
        }

        if (options.some(opt => !opt)) {
            throw new Error('Todas las opciones deben tener un valor');
        }

        if (!Array.isArray(options) || options.length !== 4) {
            throw new Error('Se requieren exactamente 4 opciones');
        }

        if (correctAnswer < 0 || correctAnswer > 3) {
            throw new Error('La respuesta correcta debe ser un número entre 0 y 3');
        }

        console.log('Sending update request:', { id, question, options, correctAnswer, subject, topic });

        const response = await fetch(`/api/questions/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                question,
                options,
                correctAnswer,
                subject,
                topic
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        // Handle error responses
        if (!response.ok) {
            let errorMessage = 'Error al actualizar la pregunta';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
            throw new Error(errorMessage);
        }

        // Parse success response
        const data = await response.json();
        const q = data.question;

        // Update the UI
        contentDiv.innerHTML = `
            <p>${q.question}</p>
            <div class="options">
                ${q.options.map((option, oIndex) => `
                    <label class="option ${oIndex === q.correctAnswer ? 'correct' : ''}">
                        <input type="radio" name="q${q.id}_${q.id}" value="${oIndex}" 
                               ${oIndex === q.correctAnswer ? 'data-correct="true"' : ''} />
                        ${option}
                    </label>
                `).join('')}
            </div>
            <div class="question-meta">
                <span class="subject-label">Materia: ${q.subject}</span>
                <span class="topic-label">Tema: ${q.topic}</span>
            </div>
        `;

        // Switch back to content view
        contentDiv.style.display = 'block';
        editForm.style.display = 'none';
    } catch (error) {
        console.error('Save error:', error);
        alert('Error: ' + error.message);
    }
}
