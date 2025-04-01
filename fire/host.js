// Host.js - Logic for the game host

let gameId = null;
let players = {};
let currentRound = null;
let playerAnswers = {};

// DOM Elements
const createGameBtn = document.getElementById('create-game');
const roomDisplay = document.getElementById('room-display');
const roomCodeElement = document.getElementById('room-code');
const playerCountElement = document.getElementById('player-count');
const playerListElement = document.getElementById('player-list');
const startGameBtn = document.getElementById('start-game');
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const currentQuestionElement = document.getElementById('current-question');
const playerStatusElement = document.getElementById('player-status');
const resultsDisplay = document.getElementById('results-display');
const resultHeaderElement = document.getElementById('result-header');
const answerBreakdownElement = document.getElementById('answer-breakdown');
const nextRoundBtn = document.getElementById('next-round');

// Create a new game
createGameBtn.addEventListener('click', createGame);

function createGame() {
  // Generate a random 4-letter room code
  gameId = generateRoomCode();
  
  // Set up Firebase game instance
  const gameRef = db.ref(`games/${gameId}`);
  
  gameRef.set({
    status: 'waiting',
    players: {},
    currentRound: null,
    created: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    roomCodeElement.textContent = gameId;
    roomDisplay.classList.remove('hidden');
    createGameBtn.classList.add('hidden');
    
    // Listen for player joins
    gameRef.child('players').on('value', (snapshot) => {
      players = snapshot.val() || {};
      updatePlayerList();
    });
    
    // Listen for game status changes
    gameRef.child('status').on('value', (snapshot) => {
      const status = snapshot.val();
      
      if (status === 'active') {
        setupScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
      } else if (status === 'waiting') {
        setupScreen.classList.remove('hidden');
        gameScreen.classList.add('hidden');
        resultsDisplay.classList.add('hidden');
      }
    });
    
    // Listen for player answers
    gameRef.child('playerAnswers').on('value', (snapshot) => {
      playerAnswers = snapshot.val() || {};
      updatePlayerStatus();
      
      // Check if all players have answered
      if (Object.keys(playerAnswers).length === Object.keys(players).length &&
          Object.keys(players).length > 0) {
        // Show results after a short delay
        setTimeout(showResults, 1000);
      }
    });
  });
}

// Start the game
startGameBtn.addEventListener('click', startGame);

function startGame() {
  if (Object.keys(players).length < 2) {
    alert('You need at least 2 players to start the game!');
    return;
  }
  
  db.ref(`games/${gameId}/status`).set('active')
    .then(() => startNewRound());
}

// Start a new round
function startNewRound() {
  // Clear previous answers
  db.ref(`games/${gameId}/playerAnswers`).remove();
  
  // Generate a random question
  const category = weightedRandom(commonSenseData.categories);
  const modifier = weightedRandom(commonSenseData.modifiers);
  const object = weightedRandom(commonSenseData.objects);
  
  const senses = getSensesFromCategory(category);
  
  currentRound = {
    question: `${category.text} ${modifier.text} ${object.text}?`,
    senses: senses,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  // Update Firebase
  db.ref(`games/${gameId}/currentRound`).set(currentRound)
    .then(() => {
      // Display the question
      currentQuestionElement.textContent = currentRound.question;
      resultsDisplay.classList.add('hidden');
      
      // Reset player status
      updatePlayerStatus();
    });
}

// Show results after all players have answered
function showResults() {
  // Determine if all players gave the same answer
  const allAnswers = Object.values(playerAnswers);
  let isCommonSense = true;
  
  if (allAnswers.length > 0) {
    const firstAnswer = JSON.stringify(allAnswers[0]);
    
    for (let i = 1; i < allAnswers.length; i++) {
      if (JSON.stringify(allAnswers[i]) !== firstAnswer) {
        isCommonSense = false;
        break;
      }
    }
  } else {
    isCommonSense = false;
  }
  
  // Display results
  resultHeaderElement.textContent = isCommonSense ? "Common Sense!" : "Nonsensical!";
  resultHeaderElement.className = isCommonSense ? "success" : "failure";
  
  // Build answer breakdown
  let breakdownHTML = '<div class="answer-grid">';
  
  // Create table header with player names
  breakdownHTML += '<table class="result-table"><thead><tr><th>Sense</th>';
  
  Object.keys(players).forEach(playerId => {
    breakdownHTML += `<th>${players[playerId].name}</th>`;
  });
  
  breakdownHTML += '</tr></thead><tbody>';
  
  // Add rows for each sense
  currentRound.senses.forEach(sense => {
    breakdownHTML += `<tr><td>${sense}</td>`;
    
    Object.keys(players).forEach(playerId => {
      const playerAnswer = playerAnswers[playerId] || {};
      const answerForSense = playerAnswer[sense] || "-";
      breakdownHTML += `<td>${answerForSense}</td>`;
    });
    
    breakdownHTML += '</tr>';
  });
  
  breakdownHTML += '</tbody></table></div>';
  answerBreakdownElement.innerHTML = breakdownHTML;
  resultsDisplay.classList.remove('hidden');
}

// Next round button
nextRoundBtn.addEventListener('click', startNewRound);

// Helper Functions
function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

function updatePlayerList() {
  playerCountElement.textContent = Object.keys(players).length;
  playerListElement.innerHTML = '';
  
  for (const playerId in players) {
    const playerElement = document.createElement('div');
    playerElement.className = 'player-item';
    playerElement.textContent = players[playerId].name;
    playerListElement.appendChild(playerElement);
  }
  
  // Enable start button if there are at least 2 players
  if (Object.keys(players).length >= 2) {
    startGameBtn.classList.remove('disabled');
    startGameBtn.disabled = false;
  } else {
    startGameBtn.classList.add('disabled');
    startGameBtn.disabled = true;
  }
}

function updatePlayerStatus() {
  playerStatusElement.innerHTML = '';
  
  for (const playerId in players) {
    const playerElement = document.createElement('li');
    playerElement.className = 'player-status-item';
    
    if (playerAnswers[playerId]) {
      playerElement.classList.add('answered');
      playerElement.innerHTML = `<span>${players[playerId].name} ✓</span>`;
    } else {
      playerElement.innerHTML = `<span>${players[playerId].name} ...</span>`;
    }
    
    playerStatusElement.appendChild(playerElement);
  }
}
