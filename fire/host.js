// Host.js - Logic for the game host

let gameId = null;
let players = {};
let currentRound = null;
let playerAnswers = {};
let playerScores = {}; // Track player scores across rounds

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
    playerScores: {}, // Initialize scores in Firebase
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
    
    // Listen for player scores
    gameRef.child('playerScores').on('value', (snapshot) => {
      playerScores = snapshot.val() || {};
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
      playerStatusElement.parentElement.classList.remove('hidden'); // Show waiting status
      
      // Reset player status
      updatePlayerStatus();
    });
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