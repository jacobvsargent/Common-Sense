// Host.js - Logic for the game host

let gameId = null;
let players = {};
let currentRound = null;
let playerAnswers = {};
let playerScores = {}; // Track player scores across rounds
let currentRoundNumber = 1;
let totalRounds = 5;
let difficulty = 'Medium';
let playerReadyForNext = {}; // Track who is ready for next round

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
const leaderboardElement = document.getElementById('leaderboard');
const gameEndElement = document.getElementById('game-end');
const finalLeaderboardElement = document.getElementById('final-leaderboard');
const newGameBtn = document.getElementById('new-game');

// Setting elements
const roundsSlider = document.getElementById('rounds-slider');
const roundsValue = document.getElementById('rounds-value');
const difficultySlider = document.getElementById('difficulty-slider');
const difficultyValue = document.getElementById('difficulty-value');
const displayRounds = document.getElementById('display-rounds');
const displayDifficulty = document.getElementById('display-difficulty');
const currentRoundNumberElement = document.getElementById('current-round-number');
const totalRoundsDisplayElement = document.getElementById('total-rounds-display');

// Next round status elements
const nextRoundStatus = document.getElementById('next-round-status');
const playersNotReadyElement = document.getElementById('players-not-ready');
const playerReadyStatusElement = document.getElementById('player-ready-status');

// Settings sliders
const roundsOptions = [1, 3, 5, 7, 9, 'Infinite'];
const difficultyOptions = ['Easy', 'Medium', 'Hard'];

roundsSlider.addEventListener('input', function() {
  const value = roundsOptions[parseInt(this.value)];
  roundsValue.textContent = value;
  totalRounds = value;
});

difficultySlider.addEventListener('input', function() {
  const value = difficultyOptions[parseInt(this.value)];
  difficultyValue.textContent = value;
  difficulty = value;
});

// Initialize slider values
roundsValue.textContent = roundsOptions[parseInt(roundsSlider.value)];
difficultyValue.textContent = difficultyOptions[parseInt(difficultySlider.value)];
totalRounds = roundsOptions[parseInt(roundsSlider.value)];
difficulty = difficultyOptions[parseInt(difficultySlider.value)];

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
    playerScores: {}, // Initialize scores in Firebase
    totalRounds: totalRounds,
    difficulty: difficulty,
    currentRoundNumber: 1,
    playerReadyForNext: {},
    created: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    roomCodeElement.textContent = gameId;
    displayRounds.textContent = totalRounds;
    displayDifficulty.textContent = difficulty;
    roomDisplay.classList.remove('hidden');
    createGameBtn.classList.add('hidden');
    document.getElementById('game-settings').classList.add('hidden');
    
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
    
    // Listen for player scores
    gameRef.child('playerScores').on('value', (snapshot) => {
      playerScores = snapshot.val() || {};
    });
    
    // Listen for player ready status
    gameRef.child('playerReadyForNext').on('value', (snapshot) => {
      playerReadyForNext = snapshot.val() || {};
      updateNextRoundStatus();
      
      // Check if all players are ready for next round
      const readyCount = Object.keys(playerReadyForNext).length;
      const totalPlayers = Object.keys(players).length;
      
      if (readyCount === totalPlayers && totalPlayers > 0 && resultsDisplay.classList.contains('hidden') === false) {
        // All players are ready, check if game should end or continue
        if (totalRounds !== 'Infinite' && currentRoundNumber > totalRounds) {
          // This is now handled by the "Show Final Results" button
          // Don't automatically show game end
        } else {
          // Start next round
          setTimeout(() => {
            startNewRound();
          }, 1000);
        }
      }
    });
    
    // Listen for current round number
    gameRef.child('currentRoundNumber').on('value', (snapshot) => {
      currentRoundNumber = snapshot.val() || 1;
      currentRoundNumberElement.textContent = currentRoundNumber;
    });
    
    totalRoundsDisplayElement.textContent = totalRounds;
  });
}

// Start the game
startGameBtn.addEventListener('click', startGame);

function startGame() {
  if (Object.keys(players).length < 2) {
    alert('You need at least 2 players to start the game!');
    return;
  }
  
  // Initialize scores for all players
  const initialScores = {};
  Object.keys(players).forEach(playerId => {
    initialScores[playerId] = 0;
  });
  
  // Set initial scores in Firebase
  db.ref(`games/${gameId}/playerScores`).set(initialScores)
    .then(() => {
      playerScores = initialScores;
      // Set game status to active
      return db.ref(`games/${gameId}/status`).set('active');
    })
    .then(() => startNewRound());
}

// Start a new round
function startNewRound() {
  // Clear previous answers and ready states
  db.ref(`games/${gameId}/playerAnswers`).remove();
  db.ref(`games/${gameId}/playerReadyForNext`).remove();
  playerReadyForNext = {};
  
  // Generate a random question based on difficulty
  const category = getFilteredCategory();
  const modifier = getFilteredModifier();
  const object = weightedRandom(commonSenseData.objects);
  
  const senses = getSensesFromCategory(category);
  
  currentRound = {
    question: `${category.text} ${modifier.text} ${object.text}?`,
    senses: senses,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  // Update Firebase with current round and incremented round number
  Promise.all([
    db.ref(`games/${gameId}/currentRound`).set(currentRound),
    db.ref(`games/${gameId}/currentRoundNumber`).set(currentRoundNumber)
  ]).then(() => {
    // Display the question
    currentQuestionElement.textContent = currentRound.question;
    resultsDisplay.classList.add('hidden');
    gameEndElement.classList.add('hidden');
    nextRoundStatus.classList.add('hidden');
    playerStatusElement.parentElement.classList.remove('hidden'); // Show waiting status
    
    // Reset player status
    updatePlayerStatus();
    
    // Increment round number for next time (AFTER setting it to Firebase)
    currentRoundNumber++;
  });
}

// Filter categories based on difficulty
function getFilteredCategory() {
  let allowedCategories = [];
  
  if (difficulty === 'Easy') {
    // Only single sense categories
    allowedCategories = commonSenseData.categories.filter(category => {
      const senses = getSensesFromCategory(category);
      return senses.length === 1;
    });
  } else if (difficulty === 'Medium') {
    // Single and double sense categories only
    allowedCategories = commonSenseData.categories.filter(category => {
      const senses = getSensesFromCategory(category);
      return senses.length <= 2;
    });
  } else {
    // Hard - all categories allowed
    allowedCategories = commonSenseData.categories;
  }
  
  return weightedRandom(allowedCategories);
}

// Filter modifiers based on difficulty
function getFilteredModifier() {
  let allowedModifiers = [];
  
  if (difficulty === 'Easy' || difficulty === 'Medium') {
    // Exclude "SECOND MOST" modifier
    allowedModifiers = commonSenseData.modifiers.filter(modifier => {
      return !modifier.text.includes('SECOND MOST');
    });
  } else {
    // Hard - all modifiers allowed
    allowedModifiers = commonSenseData.modifiers;
  }
  
  return weightedRandom(allowedModifiers);
}

// Calculate which players get points for this round
function calculateRoundPoints() {
  const senses = currentRound.senses;
  const pointsThisRound = {};
  
  // Initialize points for this round
  Object.keys(players).forEach(playerId => {
    pointsThisRound[playerId] = 0;
  });
  
  // For each sense, check who matches with whom
  senses.forEach(sense => {
    // Map of answers to player IDs who gave that answer
    const answerMap = {};
    
    // Build the answer map
    Object.keys(playerAnswers).forEach(playerId => {
      const answer = playerAnswers[playerId][sense];
      if (!answerMap[answer]) {
        answerMap[answer] = [];
      }
      answerMap[answer].push(playerId);
    });
    
    // Award points to players who match at least one other player
    Object.values(answerMap).forEach(playerIds => {
      if (playerIds.length > 1) {
        // Multiple players gave this answer, award points to all
        playerIds.forEach(playerId => {
          pointsThisRound[playerId]++;
        });
      }
    });
  });
  
  // Update total scores
  Object.keys(pointsThisRound).forEach(playerId => {
    if (!playerScores[playerId]) {
      playerScores[playerId] = 0;
    }
    playerScores[playerId] += pointsThisRound[playerId];
  });
  
  // Save updated scores to Firebase
  db.ref(`games/${gameId}/playerScores`).set(playerScores);
  
  return pointsThisRound;
}

// Show results after all players have answered
function showResults() {
  // Calculate points for this round
  const roundPoints = calculateRoundPoints();
  
  // Calculate total points earned this round and maximum possible points
  const totalPointsEarned = Object.values(roundPoints).reduce((sum, points) => sum + points, 0);
  const playerCount = Object.keys(players).length;
  const sensesCount = currentRound.senses.length;
  const maxPossiblePoints = playerCount * sensesCount;
  
  // Update result header based on total points earned
  let consensusStatus;
  if (totalPointsEarned === 0) {
    consensusStatus = "nonsensical";
    resultHeaderElement.textContent = "Nonsensical!";
    resultHeaderElement.className = "failure";
  } else if (totalPointsEarned === maxPossiblePoints) {
    consensusStatus = "common";
    resultHeaderElement.textContent = "That's Common Sense!";
    resultHeaderElement.className = "success";
  } else {
    consensusStatus = "partial";
    resultHeaderElement.textContent = "Partial Sense...";
    resultHeaderElement.className = "partial";
  }
  
  // Save consensus status to Firebase for player screens
  db.ref(`games/${gameId}/roundResult`).set({
    consensusStatus: consensusStatus,
    totalPointsEarned: totalPointsEarned,
    maxPossiblePoints: maxPossiblePoints
  });
  
  // Update the integrated leaderboard with player responses
  updateIntegratedLeaderboard(roundPoints);
  
  // Hide the waiting for players status section
  playerStatusElement.parentElement.classList.add('hidden');
  
  // Show results display
  resultsDisplay.classList.remove('hidden');
  
  // Check if this is the last round - UPDATED LOGIC
  if (totalRounds !== 'Infinite' && currentRoundNumber > totalRounds) {
    // This is the last round - show "Show Final Results" button instead of next round status
    showFinalResultsButton();
  } else {
    // Show next round status after a delay
    setTimeout(() => {
      nextRoundStatus.classList.remove('hidden');
      updateNextRoundStatus();
    }, 2000);
  }
}

// NEW: Show the "Show Final Results" button after the last round
function showFinalResultsButton() {
  // Create and add the "Show Final Results" button
  const finalResultsBtn = document.createElement('button');
  finalResultsBtn.id = 'show-final-results';
  finalResultsBtn.className = 'btn-primary';
  finalResultsBtn.textContent = 'Show Final Results';
  finalResultsBtn.style.marginTop = '20px';
  finalResultsBtn.style.fontSize = '1.2rem';
  finalResultsBtn.style.padding = '15px 30px';
  
  // Remove any existing final results button
  const existingBtn = document.getElementById('show-final-results');
  if (existingBtn) {
    existingBtn.remove();
  }
  
  // Add the button to the results display
  resultsDisplay.appendChild(finalResultsBtn);
  
  // Add click event listener
  finalResultsBtn.addEventListener('click', showGameEnd);
}

// Update the integrated leaderboard
function updateIntegratedLeaderboard(roundPoints) {
  // Sort players by score (highest first)
  const sortedPlayers = Object.keys(playerScores).sort((a, b) => {
    return playerScores[b] - playerScores[a];
  });
  
  let leaderboardHTML = `
    <h3>Round Results & Leaderboard</h3>
    <div class="round-question">"${currentRound.question}"</div>
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Total Score</th>
          <th>This Round</th>`;
  
  // Add column headers for each sense
  currentRound.senses.forEach(sense => {
    leaderboardHTML += `<th>${sense}</th>`;
  });
  
  leaderboardHTML += `
        </tr>
      </thead>
      <tbody>
  `;
  
  sortedPlayers.forEach((playerId, index) => {
    const playerName = players[playerId] ? players[playerId].name : 'Unknown';
    const playerScore = playerScores[playerId] || 0;
    const pointsEarned = roundPoints[playerId] || 0;
    const rank = index + 1;
    
    // Add classes for top 3 positions
    let rankClass = '';
    if (rank === 1) rankClass = 'first-place';
    else if (rank === 2) rankClass = 'second-place';
    else if (rank === 3) rankClass = 'third-place';
    
    leaderboardHTML += `
      <tr class="${rankClass}">
        <td>${rank}</td>
        <td>${playerName}</td>
        <td>${playerScore}</td>
        <td class="${pointsEarned > 0 ? 'points-earned' : ''}">${pointsEarned > 0 ? '+' + pointsEarned : '0'}</td>`;
    
    // Add player answers for each sense
    currentRound.senses.forEach(sense => {
      const playerAnswer = playerAnswers[playerId] && playerAnswers[playerId][sense] 
        ? playerAnswers[playerId][sense] 
        : "-";
      leaderboardHTML += `<td class="player-answer">${playerAnswer}</td>`;
    });
    
    leaderboardHTML += `</tr>`;
  });
  
  leaderboardHTML += '</tbody></table>';
  leaderboardElement.innerHTML = leaderboardHTML;
}

// Update next round status
function updateNextRoundStatus() {
  const totalPlayers = Object.keys(players).length;
  const readyPlayers = Object.keys(playerReadyForNext).length;
  const notReadyCount = totalPlayers - readyPlayers;
  
  playersNotReadyElement.textContent = notReadyCount;
  
  // Update player ready status list
  playerReadyStatusElement.innerHTML = '';
  
  for (const playerId in players) {
    const playerElement = document.createElement('li');
    playerElement.className = 'player-status-item';
    
    if (playerReadyForNext[playerId]) {
      playerElement.classList.add('answered');
      playerElement.innerHTML = `<span>${players[playerId].name} ✓</span>`;
    } else {
      playerElement.innerHTML = `<span>${players[playerId].name} ...</span>`;
    }
    
    playerReadyStatusElement.appendChild(playerElement);
  }
}

// Show game end screen
function showGameEnd() {
  resultsDisplay.classList.add('hidden');
  gameEndElement.classList.remove('hidden');
  
  // Hide round counter and current question elements
  const roundCounter = document.querySelector('.round-counter');
  if (roundCounter) {
    roundCounter.classList.add('hidden');
  }
  
  const questionDisplay = document.querySelector('.question-display');
  if (questionDisplay) {
    questionDisplay.classList.add('hidden');
  }
  
  // Also hide the current question element specifically
  if (currentQuestionElement) {
    currentQuestionElement.style.display = 'none';
  }
  
  // Create final leaderboard
  const sortedPlayers = Object.keys(playerScores).sort((a, b) => {
    return playerScores[b] - playerScores[a];
  });
  
  let finalHTML = `
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Final Score</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  sortedPlayers.forEach((playerId, index) => {
    const playerName = players[playerId] ? players[playerId].name : 'Unknown';
    const playerScore = playerScores[playerId] || 0;
    const rank = index + 1;
    
    let rankClass = '';
    if (rank === 1) rankClass = 'first-place';
    else if (rank === 2) rankClass = 'second-place';
    else if (rank === 3) rankClass = 'third-place';
    
    finalHTML += `
      <tr class="${rankClass}">
        <td>${rank}</td>
        <td>${playerName}</td>
        <td>${playerScore}</td>
      </tr>`;
  });
  
  finalHTML += '</tbody></table>';
  finalLeaderboardElement.innerHTML = finalHTML;

  const questionDisplayBackup = document.querySelector('.question-display');
  if (questionDisplayBackup) {
    questionDisplayBackup.classList.add('hidden');
  }

  // Create a new game
  newGameBtn.addEventListener('click', createGame);
}

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