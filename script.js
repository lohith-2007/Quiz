// Game State
let gameState = {
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    correctAnswers: 0,
    questionResults: [],
    timer: null,
    timeRemaining: 30,
    selectedSettings: {
        category: '',
        difficulty: '',
        amount: 10
    }
};

// DOM Elements
const screens = {
    start: document.getElementById('startScreen'),
    game: document.getElementById('gameScreen'),
    results: document.getElementById('resultScreen'),
    loading: document.getElementById('loadingScreen'),
    error: document.getElementById('errorScreen')
};

const elements = {
    startBtn: document.getElementById('startBtn'),
    nextBtn: document.getElementById('nextBtn'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    changeCategoryBtn: document.getElementById('changeCategoryBtn'),
    retryBtn: document.getElementById('retryBtn'),
    
    categorySelect: document.getElementById('category'),
    difficultySelect: document.getElementById('difficulty'),
    numQuestionsSelect: document.getElementById('numQuestions'),
    
    questionEl: document.getElementById('question'),
    answersEl: document.getElementById('answers'),
    currentScoreEl: document.getElementById('currentScore'),
    currentQuestionEl: document.getElementById('currentQuestion'),
    totalQuestionsEl: document.getElementById('totalQuestions'),
    timerEl: document.getElementById('timer'),
    progressEl: document.getElementById('progress'),
    
    finalScoreEl: document.getElementById('finalScore'),
    correctAnswersEl: document.getElementById('correctAnswers'),
    totalAnsweredEl: document.getElementById('totalAnswered'),
    accuracyEl: document.getElementById('accuracy'),
    questionBreakdownEl: document.getElementById('questionBreakdown'),
    newHighScoreEl: document.getElementById('newHighScore'),
    highScoreEl: document.getElementById('highScore')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHighScore();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    elements.startBtn.addEventListener('click', startGame);
    elements.nextBtn.addEventListener('click', nextQuestion);
    elements.playAgainBtn.addEventListener('click', () => {
        resetGame();
        startGame();
    });
    elements.changeCategoryBtn.addEventListener('click', () => {
        resetGame();
        showScreen('start');
    });
    elements.retryBtn.addEventListener('click', startGame);
}

// API Functions
async function fetchQuestions() {
    const { category, difficulty, amount } = gameState.selectedSettings;
    
    let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
    if (category) url += `&category=${category}`;
    if (difficulty) url += `&difficulty=${difficulty}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.response_code === 0) {
            return data.results;
        } else {
            throw new Error('Failed to fetch questions');
        }
    } catch (error) {
        console.error('Error fetching questions:', error);
        throw error;
    }
}

// Game Functions
async function startGame() {
    // Get selected settings
    gameState.selectedSettings = {
        category: elements.categorySelect.value,
        difficulty: elements.difficultySelect.value,
        amount: parseInt(elements.numQuestionsSelect.value)
    };
    
    showScreen('loading');
    
    try {
        gameState.questions = await fetchQuestions();
        gameState.currentQuestionIndex = 0;
        gameState.score = 0;
        gameState.correctAnswers = 0;
        gameState.questionResults = [];
        
        elements.totalQuestionsEl.textContent = gameState.questions.length;
        showScreen('game');
        displayQuestion();
    } catch (error) {
        showScreen('error');
    }
}

function displayQuestion() {
    const question = gameState.questions[gameState.currentQuestionIndex];
    
    // Update progress
    const progress = ((gameState.currentQuestionIndex) / gameState.questions.length) * 100;
    elements.progressEl.style.width = `${progress}%`;
    
    // Update question counter
    elements.currentQuestionEl.textContent = gameState.currentQuestionIndex + 1;
    
    // Display question
    elements.questionEl.innerHTML = decodeHTML(question.question);
    
    // Prepare answers
    const answers = [...question.incorrect_answers, question.correct_answer];
    shuffleArray(answers);
    
    // Display answers
    elements.answersEl.innerHTML = '';
    answers.forEach(answer => {
        const button = document.createElement('button');
        button.className = 'answer-btn';
        button.innerHTML = decodeHTML(answer);
        button.addEventListener('click', () => selectAnswer(answer, question.correct_answer));
        elements.answersEl.appendChild(button);
    });
    
    // Start timer
    startTimer();
    
    // Hide next button
    elements.nextBtn.style.display = 'none';
}

function selectAnswer(selectedAnswer, correctAnswer) {
    clearInterval(gameState.timer);
    
    const isCorrect = selectedAnswer === correctAnswer;
    
    // Update score
    if (isCorrect) {
        gameState.score += 100;
        gameState.correctAnswers++;
        elements.currentScoreEl.textContent = gameState.score;
    }
    
    // Store result
    gameState.questionResults.push({
        question: gameState.questions[gameState.currentQuestionIndex].question,
        correct: isCorrect,
        selectedAnswer: selectedAnswer,
        correctAnswer: correctAnswer
    });
    
    // Visual feedback
    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach(button => {
        button.classList.add('disabled');
        if (button.innerHTML === decodeHTML(correctAnswer)) {
            button.classList.add('correct');
        } else if (button.innerHTML === decodeHTML(selectedAnswer) && !isCorrect) {
            button.classList.add('incorrect');
        }
        button.disabled = true;
    });
    
    // Show next button
    setTimeout(() => {
        elements.nextBtn.style.display = 'block';
    }, 1000);
}

function nextQuestion() {
    gameState.currentQuestionIndex++;
    
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        endGame();
    } else {
        displayQuestion();
    }
}

function startTimer() {
    gameState.timeRemaining = 30;
    elements.timerEl.textContent = gameState.timeRemaining;
    
    gameState.timer = setInterval(() => {
        gameState.timeRemaining--;
        elements.timerEl.textContent = gameState.timeRemaining;
        
        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.timer);
            timeUp();
        }
    }, 1000);
}

function timeUp() {
    const question = gameState.questions[gameState.currentQuestionIndex];
    
    // Store result as incorrect
    gameState.questionResults.push({
        question: question.question,
        correct: false,
        selectedAnswer: 'Time up!',
        correctAnswer: question.correct_answer
    });
    
    // Show correct answer
    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach(button => {
        button.classList.add('disabled');
        if (button.innerHTML === decodeHTML(question.correct_answer)) {
            button.classList.add('correct');
        }
        button.disabled = true;
    });
    
    // Show next button
    elements.nextBtn.style.display = 'block';
}

function endGame() {
    // Calculate stats
    const accuracy = gameState.questions.length > 0 
        ? Math.round((gameState.correctAnswers / gameState.questions.length) * 100)
        : 0;
    
    // Update results screen
    elements.finalScoreEl.textContent = gameState.score;
    elements.correctAnswersEl.textContent = gameState.correctAnswers;
    elements.totalAnsweredEl.textContent = gameState.questions.length;
    elements.accuracyEl.textContent = accuracy;
    
    // Check for high score
    const highScore = getHighScore();
    if (gameState.score > highScore) {
        saveHighScore(gameState.score);
        elements.newHighScoreEl.style.display = 'block';
    } else {
        elements.newHighScoreEl.style.display = 'none';
    }
    
    // Display question breakdown
    displayQuestionBreakdown();
    
    showScreen('results');
}

function displayQuestionBreakdown() {
    elements.questionBreakdownEl.innerHTML = '';
    
    gameState.questionResults.forEach((result, index) => {
        const resultDiv = document.createElement('div');
        resultDiv.className = `question-result ${result.correct ? 'correct' : 'incorrect'}`;
        resultDiv.innerHTML = `
            <span>${result.correct ? '✓' : '✗'} Question ${index + 1}: ${decodeHTML(result.question.substring(0, 50))}...</span>
        `;
        elements.questionBreakdownEl.appendChild(resultDiv);
    });
}

function resetGame() {
    clearInterval(gameState.timer);
    gameState = {
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        correctAnswers: 0,
        questionResults: [],
        timer: null,
        timeRemaining: 30,
        selectedSettings: {
            category: '',
            difficulty: '',
            amount: 10
        }
    };
    elements.currentScoreEl.textContent = '0';
}

// Utility Functions
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screens[screenName].classList.add('active');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

// Local Storage Functions
function saveHighScore(score) {
    localStorage.setItem('triviaHighScore', score.toString());
    elements.highScoreEl.textContent = score;
}

function getHighScore() {
    return parseInt(localStorage.getItem('triviaHighScore') || '0');
}

function loadHighScore() {
    const highScore = getHighScore();
    elements.highScoreEl.textContent = highScore;
                                              }
