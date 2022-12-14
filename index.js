const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const {
  makeid,
  addMessage,
  shuffle,
  dealCards,
  getTrump,
  // getTrickWinner,
  scorePoints,
  removeCardsPlayedThisTurn,
  getPlayerIndex,
  resetPlayerBets,
  getCardName,
  resetGameState,
  getGameWinner,
  getCurrentWinningCard,
} = require("./utils");
const { initGame, addPlayerToGameState } = require("./game");

const port = process.env.PORT || 3001;
const state = {};
const clientRooms = {};

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://mormonbridge.netlify.app",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (client) => {
  console.log(`User Connected: ${client.id}`);

  client.emit("sendId", client.id);

  client.on("disconnect", handleDisconnect);
  client.on("newGame", handleNewGame);
  client.on("joinGame", handleJoinGame);
  client.on("startGame", handleStartGame);
  client.on("placeBet", handlePlaceBet);
  client.on("playCard", handlePlayCard);
  client.on("advanceTurn", handleAdvanceTurn);

  function handleNewGame(playerName, numRounds) {
    let roomName = makeid(5);
    clientRooms[client.id] = roomName;
    client.emit("roomCode", roomName);

    //Set PlayerName and initial player data
    let player = {
      name: playerName,
      number: 1,
      socketId: client.id,
    };

    //initialize game state
    state[roomName] = initGame(player, numRounds);

    client.join(roomName);
    emitGameState(roomName, state[roomName]);
  }

  function handleJoinGame(req) {
    let roomName = req.roomName;
    const room = getRoom(roomName);

    if (!state[roomName]) {
      client.emit("unknownCode");
      return;
    }
    //check if game if already started with gameStatus > 0
    if (state[roomName].gameStatus > 0) {
      client.emit("gameAlreadyStarted");
      return;
    }

    const numClients = room ? room.size : 0;

    if (numClients === 0) {
      client.emit("unknownCode");
      return;
    } else if (numClients > 7) {
      client.emit("roomFull");
      return;
    }

    clientRooms[client.id] = roomName;
    client.join(roomName);
    addPlayerToGameState(
      state[roomName],
      req.playerName,
      numClients,
      client.id
    );

    client.emit("enterRoom", roomName, client.id);

    emitGameState(roomName, state[roomName]);
  }

  function handleDisconnect() {
    console.log('handling disconnect')
    let roomName = clientRooms[client.id];
    client.leave(roomName);
    let gameState = state[roomName];

    if (gameState) {
      //find player and remove from players array
      let playerIndex = getPlayerIndex(gameState, client.id);
      if (playerIndex) {
        let player = gameState.players[playerIndex];
        gameState.disconnectedClients[client.id] = player;

        gameState.players.splice(playerIndex, 1);
        gameState.numPlayers = gameState.players.length;

        addMessage(gameState, `${player.name} was disconnected`);
        if (gameState.players.length < 2) {
          gameState = null;
        }
      }
    }
    emitGameState(roomName, gameState);
  }

  function handleStartGame(roomName) {
    let gameState = state[roomName];
    gameState.numPlayers = gameState.players.length;
    gameState.gameStatus = 1;
    gameState.currentPlayerTurnId =
      gameState.players[gameState.currentPlayerTurnIndex].socketId;
    gameState.leadPlayerId =
      gameState.players[gameState.leadPlayerIndex].socketId;

    handleStartRound(roomName);
    emitGameState(roomName, gameState);
  }
});

function emitGameState(roomName, gameState) {
  io.sockets.in(roomName).emit("gameState", gameState);
}

function handleStartRound(roomName) {
  let gameState = state[roomName];
  gameState.roundNum += 1;
  gameState.roundStatus = 0;
  gameState.roundTurnCount = 0;
  gameState.totalBets = 0;
  gameState.currentWinningCard = gameState.deckStyleNum;
  gameState.leadCard = gameState.deckStyleNum;
  gameState.trumpCardLastTurn = gameState.trumpCard;
  gameState.trumpCard = null;

  //get 'numCardsToDeal' for the current round
  if (gameState.roundNum > gameState.turnaroundRoundNum) {
    gameState.numCardsToDeal =
      gameState.turnaroundRoundNum -
      (gameState.roundNum - gameState.turnaroundRoundNum);
  } else {
    gameState.numCardsToDeal = gameState.roundNum;
  }

  //Advance lead player if not the first round
  if (gameState.roundNum > 1) {
    gameState.dealerIndex += 1;

    if (gameState.dealerIndex > gameState.numPlayers - 1) {
      gameState.dealerIndex = 0;
    }

    gameState.leadPlayerIndex = gameState.dealerIndex + 1;
    gameState.currentPlayerTurnIndex = gameState.dealerIndex + 1;

    if (gameState.leadPlayerIndex > gameState.numPlayers - 1) {
      gameState.leadPlayerIndex = 0;
      gameState.currentPlayerTurnIndex = 0;
    }

    gameState.leadPlayerId =
      gameState.players[gameState.leadPlayerIndex].socketId;
    gameState.currentPlayerTurnId =
      gameState.players[gameState.currentPlayerTurnIndex].socketId;
  }

  addMessage(gameState, `Please bet`);
  addMessage(
    gameState,
    `${gameState.players[gameState.leadPlayerIndex].name} leads`
  );

  gameState.deck = shuffle();
  dealCards(gameState);
  getTrump(gameState);
}

function handlePlayCard(card, roomName, playerId) {
  let gameState = state[roomName];

  if (!card) {
    return;
  }

  let player = gameState.players[gameState.currentPlayerTurnIndex];
  player.cardPlayedThisTurn = card;
  addMessage(gameState, `${player.name} played ${getCardName(card)}`);

  //check if lead has not been set
  if (gameState.leadCard > 52) {
    gameState.leadCard = card;
    gameState.leadCardLastTurn = card;
  }

  //CHEKCK IF TURN IS OVER (if all players have played)
  let allPlayersPlayedThisTurn = true;
  gameState.players.forEach((player) => {
    if (!player.cardPlayedThisTurn) {
      allPlayersPlayedThisTurn = false;
      return;
    }
  });

  //GET WINNING CARD
  getCurrentWinningCard(gameState, card, playerId);

  //TURN IS OVER
  if (allPlayersPlayedThisTurn) {
    gameState.roundTurnCount += 1;

    //GET TRICK WINNER
    let winnerId = gameState.currentWinningPlayer.socketId
    let winnerIndex = getPlayerIndex(gameState, winnerId);
    let player = gameState.players[winnerIndex];
    player.tricksWon += 1;

    //set lead to person who won the trick
    gameState.leadPlayerId = winnerId;
    gameState.leadPlayerIndex = winnerIndex;
    gameState.currentPlayerTurnIndex = winnerIndex;
    gameState.currentPlayerTurnId = winnerId;

    gameState.turnOver = true;
    gameState.roundStatus += 1;

    //do this after all players have selected to advance to next turn
    emitGameState(roomName, gameState);
    
  } else {
    //if the turn is not over advance currentPlayer
    gameState.currentPlayerTurnIndex === gameState.numPlayers - 1
      ? (gameState.currentPlayerTurnIndex = 0)
      : (gameState.currentPlayerTurnIndex += 1);

    gameState.currentPlayerTurnId =
      gameState.players[gameState.currentPlayerTurnIndex].socketId;

    emitGameState(roomName, gameState);
  }
}

function handleAdvanceTurn(roomName, playerId){
  let gameState = state[roomName];
  let advanceRound = true;
  gameState.players[getPlayerIndex(gameState, playerId)].isReadyForNextTurn = true;

  gameState.players.forEach(player => {
    if(!player.isReadyForNextTurn){
      advanceRound = false;
    }
  })

  if(advanceRound){
    gameState.turnOver = false;
    gameState.currentWinningCard = gameState.deckStyleNum;
    gameState.currentWinningCardSuit = null;
    gameState.currentWinningPlayer = null;
    gameState.leadCard = gameState.deckStyleNum;
    gameState.roundStatus = 1;
  
    gameState.players.forEach(player => {
      player.isReadyForNextTurn = false;      
    })
        //ROUND OVER.
    if (gameState.roundTurnCount === gameState.numCardsToDeal) {
      scorePoints(gameState);
      resetPlayerBets(gameState);
      removeCardsPlayedThisTurn(gameState);
      gameState.leadCard = gameState.deckStyleNum;
  

      //IF GAME OVER
      if (gameState.roundNum === gameState.numTotalRoundsToPlay) {
        getGameWinner(gameState);
        setRoundAndTurnOverInterval(roomName, gameState, "game");
        emitGameState(roomName, gameState);
        return;
      }

      //set round interval, start next round
      setRoundAndTurnOverInterval(roomName, gameState, "round");
      handleStartRound(roomName);
      emitGameState(roomName, gameState);
      return;
    }

    removeCardsPlayedThisTurn(gameState);
    emitGameState(roomName, gameState);
  }
}

function handlePlaceBet(bet, roomName, playerId) {
  let gameState = state[roomName];

  gameState.players.find((player) => {
    if (player.socketId === playerId) {
      player.hasBet = true;
      player.tricksBet = Number(bet);
      addMessage(gameState, `${player.name} bet`);
    }
  });

  //check if all players have bet
  let advanceRound = true;
  gameState.players.forEach((player) => {
    if (!player.hasBet) {
      advanceRound = false;
      return;
    } 
  });

  if (advanceRound) {
    
    gameState.roundStatus += 1;
    let totalBets = 0;
    gameState.players.forEach(player => {
      totalBets += player.tricksBet;
    })
    gameState.totalBets += totalBets;

    addMessage(gameState, `${gameState.players[gameState.leadPlayerIndex].name}'s turn`);
  }

  emitGameState(roomName, gameState);
}

function getRoom(roomName) {
  return io.sockets.adapter.rooms.get(roomName);
}

function setRoundAndTurnOverInterval(roomName, gameState, flag) {
  let seconds;

  if (flag === "round") {
    seconds = 10;
    gameState.roundOver = true;
  } else {
    seconds = 10;
    gameState.roundOver = true;
    gameState.gameOver = true;
  }

  gameState.showModal = true;

  const intervalId = setInterval(() => {
    seconds -= 1;

    if (seconds > -1) {
      //do this each interval
      gameState.timer = seconds;
      emitGameState(roomName, gameState);
    } else {
      //do this after time expires
      gameState.timer = 0;
      gameState.showModal = false;
      if(flag === "round"){
        gameState.roundOver = false;
      }

      if (flag === "game") {
        gameState.gameOver = false;
        gameState.gameStatus = 0;
        resetGameState(gameState, roomName);
      }
      emitGameState(roomName, gameState);
      clearInterval(intervalId);
    }
  }, 1000);
}

server.listen(port, () => {
  console.log(`SERVER RUNNING on ${port}`);
});
