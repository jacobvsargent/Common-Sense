let category = [];
let modifier = [];
let object = [];
let correctGuesses = 0;
let incorrectGuesses = 0;
let playerData = {};
let dataLoaded = false;
let roundTimer = null;
let timeLeft = 0;
let currentRound = 0;
let gameMode = "standard"; // standard, timed, streak, describe
let streakCount = 0;
let highScore = 0;
let currentDescribeObject = null; // Stores the correct object for Describe mode
let currentPlayerTurn = "Player 1"; // Tracks which player's turn it is in Describe mode
let allObjects = []; // Stores all objects for Describe mode

// Load data from CSV
console.log("Attempting to load CSV file...");
Papa.parse("common_sense.csv", {
    download: true,
    header: true,
    complete: function(results) {
        console.log("CSV parse complete:", results.data);
        results.data.forEach(row => {
            if (row.deck && row.count) {
                let count = parseInt(row.count);
                if (row.deck.includes("Category")) {
                    for (let i = 0; i < count; i++) {
                        category.push(row.text);
                    }
                } else if (row.deck.includes("Modifier")) {
                    for (let i = 0; i < count; i++) {
                        modifier.push(row.text);
                    }
                } else if (row.deck.includes("Object")) {
                    for (let i = 0; i < count; i++) {
                        object.push(row.text);
                    }
                    // Also store unique objects for the Describe mode
                    if (!allObjects.includes(row.text)) {
                        allObjects.push(row.text);
                    }
                }
            }
        });
        dataLoaded = true;
        console.log("Data loaded successfully");
        console.log("Categories:", category);
        console.log("Modifiers:", modifier);
        console.log("Objects:", object);
        console.log("Unique Objects:", allObjects);
        
        // Enable game start once data is loaded
        document.getElementById("draw-cards-button").disabled = false;
        updateMessage("ready");
    },
    error: function(err) {
        console.error("Error parsing CSV:", err);
        document.getElementById("top-line").textContent = "Error loading game data. Please refresh and try again.";
    }
});

function unlockAllPlayers() {
    Object.values(playerData).forEach(player => {
        player.window.classList.remove("locked");
        player.locked = false;
    });
}

// Function to update the message box dynamically
function updateMessage(stage) {
    const messages = {
        ready: "Select a game mode and draw cards to start!",
        start: "Draw cards to start a new round!",
        selecting: "Players, make your selections...",
        locked: "Click Check to see if you've got Common Sense!",
        victory: "Now that's some Common Sense!",
        defeat: "Uh-oh, that's nonsensical!",
        timed: `Time remaining: ${timeLeft} seconds`,
        streak: `Current streak: ${streakCount} | High score: ${highScore}`,
        describePlayerA: `${currentPlayerTurn}, describe your object using the selections!`,
        describePlayerB: `${getOtherPlayer(currentPlayerTurn)}, select the object that matches the description!`
    };
    document.getElementById("top-line").textContent = messages[stage];
}

function getOtherPlayer(playerName) {
    return playerName === "Player 1" ? "Player 2" : "Player 1";
}

function drawCards() {
    if (!dataLoaded) {
        alert("Data not loaded yet. Please wait a moment and try again.");
        return;
    }
    
    // Increment round counter
    currentRound++;
    document.getElementById("round-counter").textContent = `Round: ${currentRound}`;
    
    // Reset object selection area for Describe mode
    if (document.getElementById("object-selection-area")) {
        document.getElementById("object-selection-area").innerHTML = "";
        document.getElementById("object-selection-area").style.display = "none";
    }
    
    // Handle different game modes
    if (gameMode === "describe") {
        setupDescribeMode();
    } else {
        updateMessage("selecting");
        
        if (category.length && modifier.length && object.length) {
            const result = document.getElementById("result");
            result.textContent = `${randomChoice(category)} ${randomChoice(modifier)} ${randomChoice(object)}`;
        }
    }

    // Clear selections and reset lock state
    Object.values(playerData).forEach(player => {
        clearSelections(player.vars, {
            "Color": ["", "Red", "Blue", "Yellow", "Green", "Purple", "Orange", "Black", "White", "Pink", "Brown"],
            "Texture": ["", "Bumpy", "Sharp", "Sticky", "Smooth", "Slippery", "Squishy", "Firm", "Fluffy"],
            "Taste": ["", "Bitter", "Sour", "Salty", "Umami", "Sweet", "Spicy"],
            "Smell": ["", "Natural", "Neutral", "Pungent", "Chemical"],
            "Volume": ["", "Loud", "Quiet"]
        });
    });

    unlockAllPlayers();
    
    // Start timer for timed mode
    if (gameMode === "timed") {
        timeLeft = 30; // 30 second timer
        updateMessage("timed");
        clearInterval(roundTimer);
        roundTimer = setInterval(() => {
            timeLeft--;
            updateMessage("timed");
            
            if (timeLeft <= 0) {
                clearInterval(roundTimer);
                // Auto-lock players if time runs out
                Object.keys(playerData).forEach(playerName => {
                    if (!playerData[playerName].locked) {
                        toggleLock(playerData[playerName].lockButton, playerData[playerName].window, playerName);
                    }
                });
                checkMatch();
            }
        }, 1000);
    }
    
    // Update streak display for streak mode
    if (gameMode === "streak") {
        updateMessage("streak");
    }
}

function setupDescribeMode() {
    // Hide result text as we'll use another mechanism
    document.getElementById("result").textContent = "";
    
    // Determine which player gets to describe
    currentPlayerTurn = currentRound % 2 === 1 ? "Player 1" : "Player 2";
    const describingPlayer = currentPlayerTurn;
    const guessingPlayer = getOtherPlayer(describingPlayer);
    
    // Select a random object for the describing player
    currentDescribeObject = randomChoice(allObjects);
    console.log(`Describe mode: ${describingPlayer} describing "${currentDescribeObject}"`);
    
    // Show the object only to the describing player
    const describeObjectDisplay = document.createElement("div");
    describeObjectDisplay.id = "describe-object";
    describeObjectDisplay.className = "describe-object";
    describeObjectDisplay.textContent = `Your object is: ${currentDescribeObject}`;
    
    // Only show object to the describing player
    playerData[describingPlayer].window.querySelector(".grid-container").before(describeObjectDisplay);
    
    // Hide the other player's selections during describing phase
    playerData[guessingPlayer].window.style.opacity = "0.5";
    playerData[guessingPlayer].window.style.pointerEvents = "none";
    
    // Create an object selection area (initially hidden, will be shown after describing player locks in)
    if (!document.getElementById("object-selection-area")) {
        const objectSelectionArea = document.createElement("div");
        objectSelectionArea.id = "object-selection-area";
        objectSelectionArea.className = "object-selection-area";
        objectSelectionArea.style.display = "none";
        document.body.insertBefore(objectSelectionArea, document.getElementById("players"));
    }
    
    updateMessage("describePlayerA");
}

function createObjectSelectionForGuesser() {
    const selectionArea = document.getElementById("object-selection-area");
    selectionArea.innerHTML = "";
    
    // Create description display
    const descriptionDisplay = document.createElement("div");
    descriptionDisplay.className = "description-display";
    descriptionDisplay.innerHTML = "<h3>Object Description:</h3>";
    
    // Get the describing player's selections
    const describingPlayer = currentPlayerTurn;
    const selections = [];
    
    for (const key in playerData[describingPlayer].vars) {
        const value = playerData[describingPlayer].vars[key].value;
        if (value) {
            selections.push(`<span class="description-attribute">${key}: <strong>${value}</strong></span>`);
        }
    }
    
    if (selections.length === 0) {
        descriptionDisplay.innerHTML += "<p>No description provided!</p>";
    } else {
        descriptionDisplay.innerHTML += `<p>${selections.join(" • ")}</p>`;
    }
    
    selectionArea.appendChild(descriptionDisplay);
    
    // Create a list of objects to choose from (including the correct one)
    const objectList = document.createElement("div");
    objectList.className = "object-buttons";
    
    // Create array with the correct object and 6 random ones
    const objectChoices = [currentDescribeObject];
    while (objectChoices.length < 7) {
        const randomObj = randomChoice(allObjects);
        if (!objectChoices.includes(randomObj)) {
            objectChoices.push(randomObj);
        }
    }
    
    // Shuffle the array
    shuffleArray(objectChoices);
    
    // Create buttons for each object
    objectChoices.forEach(objText => {
        const objButton = document.createElement("button");
        objButton.className = "object-button";
        objButton.textContent = objText;
        objButton.onclick = () => selectObject(objText);
        objectList.appendChild(objButton);
    });
    
    selectionArea.appendChild(objectList);
    selectionArea.style.display = "block";
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function selectObject(selectedObject) {
    const guessingPlayer = getOtherPlayer(currentPlayerTurn);
    const isCorrect = selectedObject === currentDescribeObject;
    
    // Display result
    const resultDisplay = document.createElement("div");
    resultDisplay.className = isCorrect ? "describe-result correct" : "describe-result incorrect";
    resultDisplay.innerHTML = isCorrect ? 
        `<h3>Correct! That's Common Sense!</h3>` : 
        `<h3>Incorrect! That's nonsensical!</h3><p>The correct object was: ${currentDescribeObject}</p>`;
    
    // Disable all buttons
    const buttons = document.querySelectorAll(".object-button");
    buttons.forEach(button => {
        button.disabled = true;
        if (button.textContent === currentDescribeObject) {
            button.classList.add("correct-object");
        } else if (button.textContent === selectedObject && !isCorrect) {
            button.classList.add("incorrect-object");
        }
    });
    
    document.getElementById("object-selection-area").appendChild(resultDisplay);
    
    // Update scores
    if (isCorrect) {
        correctGuesses++;
        updateMessage("victory");
        
        // Update individual player scores - both get points for successful communication
        updatePlayerScore(currentPlayerTurn, true);
        updatePlayerScore(guessingPlayer, true);
        
        playSound("success");
    } else {
        incorrectGuesses++;
        updateMessage("defeat");
        
        playSound("failure");
    }
    
    // Update the display for correct/incorrect count
    document.getElementById("correct-label").textContent = `Correct: ${correctGuesses}`;
    document.getElementById("incorrect-label").textContent = `Incorrect: ${incorrectGuesses}`;
    
    // Calculate and update match percentage
    const totalGuesses = correctGuesses + incorrectGuesses;
    const matchPercentage = totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;
    document.getElementById("match-percentage").textContent = `Match Rate: ${matchPercentage}%`;
    
    // Add to history
    addToHistory(`${currentPlayerTurn} described "${currentDescribeObject}"`, isCorrect);
    
    // Enable draw cards button
    document.getElementById("draw-cards-button").disabled = false;
    
    // Reset player windows
    resetPlayersForNextRound();
}

function resetPlayersForNextRound() {
    // Remove the object description from the describing player
    const describeObject = document.getElementById("describe-object");
    if (describeObject) {
        describeObject.remove();
    }
    
    // Reset opacity and interaction for both players
    Object.values(playerData).forEach(player => {
        player.window.style.opacity = "1";
        player.window.style.pointerEvents = "auto";
    });
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function createPlayerWindow(playerName) {
    const playerWindow = document.createElement("div");
    playerWindow.className = "player-window";
    playerWindow.id = playerName;

    const title = document.createElement("h2");
    title.textContent = playerName;
    playerWindow.appendChild(title);

    const attributes = {
        "Color": ["", "Red", "Blue", "Yellow", "Green", "Purple", "Orange", "Black", "White", "Pink", "Brown"],
        "Texture": ["", "Bumpy", "Sharp", "Sticky", "Smooth", "Slippery", "Squishy", "Firm", "Fluffy"],
        "Taste": ["", "Bitter", "Sour", "Salty", "Umami", "Sweet", "Spicy"],
        "Smell": ["", "Natural", "Neutral", "Pungent", "Chemical"],
        "Volume": ["", "Loud", "Quiet"]
    };

    const varsDict = {};

    const lockButton = document.createElement("button");
    lockButton.textContent = "Lock In";
    lockButton.className = "lock-button";
    lockButton.onclick = () => toggleLock(lockButton, playerWindow, playerName);
    playerWindow.appendChild(lockButton);

    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear";
    clearButton.className = "clear-button";
    clearButton.onclick = () => clearSelections(varsDict, attributes);
    playerWindow.appendChild(clearButton);

    const gridContainer = document.createElement("div");
    gridContainer.className = "grid-container";
    for (const label in attributes) {
        const gridItem = document.createElement("div");
        gridItem.className = "grid-item";

        const labelElement = document.createElement("label");
        labelElement.textContent = label;
        gridItem.appendChild(labelElement);

        const select = document.createElement("select");
        attributes[label].forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
        varsDict[label] = select;
        gridItem.appendChild(select);

        gridContainer.appendChild(gridItem);
    }
    playerWindow.appendChild(gridContainer);

    playerData[playerName] = { 
        vars: varsDict, 
        locked: false, 
        lockButton, 
        window: playerWindow,
        score: 0
    };

    document.getElementById("players").appendChild(playerWindow);
    
    // Create score display
    const scoreDisplay = document.createElement("div");
    scoreDisplay.id = `${playerName.replace(" ", "-")}-score`;
    scoreDisplay.className = "player-score";
    scoreDisplay.textContent = `${playerName} Score: 0`;
    playerWindow.appendChild(scoreDisplay);
}

function clearSelections(varsDict, attributes) {
    for (const label in varsDict) {
        varsDict[label].value = attributes[label][0];
        varsDict[label].classList.remove("match", "no-match");
    }
}

function toggleLock(button, window, playerName) {
    console.log("Toggling lock for ", playerName);
    const player = playerData[playerName];
    console.log("Initial lock status was ", player.locked);
    player.locked = !player.locked;
    
    if (player.locked) {
        window.classList.add("locked");
        for (const key in player.vars) {
            player.vars[key].style.display = "none";
            const label = player.vars[key].previousElementSibling;
            if (label && label.tagName === "LABEL") {
                label.style.display = "none";
            }
        }
        button.textContent = "Locked In!";
        
        // Special handling for Describe mode
        if (gameMode === "describe") {
            if (playerName === currentPlayerTurn) {
                // Describing player has locked in, now show options to the guesser
                const guessingPlayer = getOtherPlayer(currentPlayerTurn);
                
                // Reset the guessing player's window
                playerData[guessingPlayer].window.style.opacity = "1";
                playerData[guessingPlayer].window.style.pointerEvents = "auto";
                
                // Create the object selection interface
                createObjectSelectionForGuesser();
                
                // Update message
                updateMessage("describePlayerB");
                
                // Disable draw cards during guessing phase
                document.getElementById("draw-cards-button").disabled = true;
            }
        }
    } else {
        window.classList.remove("locked");
        for (const key in player.vars) {
            player.vars[key].style.display = "block";
            const label = player.vars[key].previousElementSibling;
            if (label && label.tagName === "LABEL") {
                label.style.display = "block";
            }
        }
        button.textContent = "Lock In";
    }
    
    // For standard modes, enable check button if all players are locked
    if (gameMode !== "describe") {
        document.getElementById("check-button").disabled = !Object.values(playerData).every(p => p.locked);
        
        if (Object.values(playerData).every(p => p.locked)) {
            updateMessage("locked");
        }
    }
}

function updatePlayerScore(playerName, increment) {
    const player = playerData[playerName];
    if (increment) {
        player.score += 1;
    }
    document.getElementById(`${playerName.replace(" ", "-")}-score`).textContent = `${playerName} Score: ${player.score}`;
}

function checkMatch() {
    // Clear any active timer
    if (roundTimer) {
        clearInterval(roundTimer);
    }
    
    const player1Choices = Object.values(playerData["Player 1"].vars).map(select => select.value);
    const player2Choices = Object.values(playerData["Player 2"].vars).map(select => select.value);

    const match = player1Choices.every((choice, index) => choice === player2Choices[index]);
    const nonEmptyChoices = player1Choices.filter(choice => choice !== "").length;

    // Update the correct or incorrect guess counter
    if (match && nonEmptyChoices > 0) {
        correctGuesses++;
        updateMessage("victory");
        
        // Update individual player scores
        updatePlayerScore("Player 1", true);
        updatePlayerScore("Player 2", true);
        
        // For streak mode
        if (gameMode === "streak") {
            streakCount++;
            if (streakCount > highScore) {
                highScore = streakCount;
            }
            updateMessage("streak");
        }
        
        // Play success sound
        playSound("success");
    } else {
        incorrectGuesses++;
        updateMessage("defeat");
        
        // For streak mode, reset streak
        if (gameMode === "streak") {
            streakCount = 0;
            updateMessage("streak");
        }
        
        // Play failure sound
        playSound("failure");
    }

    // Update the display for correct/incorrect count
    document.getElementById("correct-label").textContent = `Correct: ${correctGuesses}`;
    document.getElementById("incorrect-label").textContent = `Incorrect: ${incorrectGuesses}`;

    // Calculate and update match percentage
    const totalGuesses = correctGuesses + incorrectGuesses;
    const matchPercentage = totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;
    document.getElementById("match-percentage").textContent = `Match Rate: ${matchPercentage}%`;
    
    // Apply shading based on match
    Object.keys(playerData["Player 1"].vars).forEach(key => {
        const p1Value = playerData["Player 1"].vars[key].value;
        const p2Value = playerData["Player 2"].vars[key].value;

        if (p1Value === "" || p2Value === "") {
            playerData["Player 1"].vars[key].classList.remove("match", "no-match");
            playerData["Player 2"].vars[key].classList.remove("match", "no-match");
        } else if (p1Value === p2Value) {
            playerData["Player 1"].vars[key].classList.add("match");
            playerData["Player 2"].vars[key].classList.add("match");
            playerData["Player 1"].vars[key].classList.remove("no-match");
            playerData["Player 2"].vars[key].classList.remove("no-match");
        } else {
            playerData["Player 1"].vars[key].classList.add("no-match");
            playerData["Player 2"].vars[key].classList.add("no-match");
            playerData["Player 1"].vars[key].classList.remove("match");
            playerData["Player 2"].vars[key].classList.remove("match");
        }
    });

    // Unlock players and make selections visible again
    Object.values(playerData).forEach(player => {
        player.locked = false;
        player.window.classList.remove("locked");
        player.lockButton.textContent = "Lock In";

        for (const key in player.vars) {
            player.vars[key].style.display = "block";
            const label = player.vars[key].previousElementSibling;
            if (label && label.tagName === "LABEL") {
                label.style.display = "block";
            }
        }
    });

    // Reset the game state and disable the check button until a new round starts
    document.getElementById("check-button").disabled = true;
    
    // Add the question and result to the history
    addToHistory(document.getElementById("result").textContent, match);
}

function setGameMode(mode) {
    gameMode = mode;
    
    // Reset game stats
    currentRound = 0;
    correctGuesses = 0;
    incorrectGuesses = 0;
    streakCount = 0;
    document.getElementById("correct-label").textContent = "Correct: 0";
    document.getElementById("incorrect-label").textContent = "Incorrect: 0";
    document.getElementById("match-percentage").textContent = "Match Rate: 0%";
    document.getElementById("round-counter").textContent = "Round: 0";
    
    // Clear history
    document.getElementById("history-list").innerHTML = "";
    
    // Reset player scores
    Object.keys(playerData).forEach(playerName => {
        playerData[playerName].score = 0;
        updatePlayerScore(playerName, false);
    });
    
    // Update UI based on mode
    const modeButtons = document.querySelectorAll(".mode-button");
    modeButtons.forEach(button => {
        button.classList.remove("active-mode");
        if (button.getAttribute("data-mode") === mode) {
            button.classList.add("active-mode");
        }
    });
    
    // For Describe mode, hide the check button as it's not needed
    document.getElementById("check-button").style.display = mode === "describe" ? "none" : "inline-block";
    
    // Clear any object selection area
    if (document.getElementById("object-selection-area")) {
        document.getElementById("object-selection-area").innerHTML = "";
        document.getElementById("object-selection-area").style.display = "none";
    }
    
    // Update message based on mode
    if (mode === "streak") {
        updateMessage("streak");
    } else {
        updateMessage("ready");
    }
}

function addToHistory(question, matched) {
    const historyList = document.getElementById("history-list");
    const historyItem = document.createElement("div");
    historyItem.className = matched ? "history-item match" : "history-item no-match";
    
    const questionText = document.createElement("span");
    questionText.textContent = question;
    
    const resultIcon = document.createElement("span");
    resultIcon.className = "result-icon";
    resultIcon.textContent = matched ? "✓" : "✗";
    
    historyItem.appendChild(resultIcon);
    historyItem.appendChild(questionText);
    
    // Add to beginning of list
    if (historyList.firstChild) {
        historyList.insertBefore(historyItem, historyList.firstChild);
    } else {
        historyList.appendChild(historyItem);
    }
    
    // Limit history to last 10 items
    if (historyList.children.length > 10) {
        historyList.removeChild(historyList.lastChild);
    }
}

function playSound(type) {
    const audio = new Audio();
    if (type === "success") {
        audio.src = "https://soundbible.com/grab.php?id=1003&type=mp3"; // Success sound
    } else if (type === "failure") {
        audio.src = "https://soundbible.com/grab.php?id=1204&type=mp3"; // Failure sound
    }
    audio.play().catch(e => console.warn("Audio playback not allowed:", e));
}

function setupGameUI() {
    // Create game mode selector
    const modeSelector = document.createElement("div");
    modeSelector.id = "mode-selector";
    modeSelector.innerHTML = `
        <h3>Game Mode:</h3>
        <button class="mode-button active-mode" data-mode="standard" onclick="setGameMode('standard')">Standard</button>
        <button class="mode-button" data-mode="timed" onclick="setGameMode('timed')">Timed (30s)</button>
        <button class="mode-button" data-mode="streak" onclick="setGameMode('streak')">Streak</button>
        <button class="mode-button" data-mode="describe" onclick="setGameMode('describe')">Describe</button>
    `;
    
    // Create stats area
    const statsArea = document.createElement("div");
    statsArea.id = "stats-area";
    statsArea.innerHTML = `
        <div id="round-counter">Round: 0</div>
        <div id="match-percentage">Match Rate: 0%</div>
    `;
    
    // Create history panel
    const historyPanel = document.createElement("div");
    historyPanel.id = "history-panel";
    historyPanel.innerHTML = `
        <h3>History</h3>
        <div id="history-list"></div>
    `;
    
    // Insert elements into DOM
    const controlsArea = document.createElement("div");
    controlsArea.id = "controls-area";
    
    document.body.insertBefore(controlsArea, document.getElementById("players"));
    controlsArea.appendChild(modeSelector);
    controlsArea.appendChild(statsArea);
    document.body.insertBefore(historyPanel, document.getElementById("footer"));
    
    // Initially disable draw button until data is loaded
    document.getElementById("draw-cards-button").disabled = true;
}

// Initialize game
function initGame() {
    createPlayerWindow("Player 1");
    createPlayerWindow("Player 2");
    setupGameUI();
    setGameMode("standard");
}

// Initialize game when document is loaded
document.addEventListener("DOMContentLoaded", initGame);
