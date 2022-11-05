module.exports = {
  makeid,
  addMessage,
  shuffle,
  dealCards,
  getTrump,
  getPlayer,
  // getTrickWinner,
  scorePoints,
  removeCardsPlayedThisTurn,
  getSuit,
  getPlayerIndex,
  resetPlayerBets,
  getCardName,
  resetGameState,
  getGameWinner,
  getCurrentWinningCard,
};

const hearts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const diamonds = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
const spades = [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39];
const clubs = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52];
const cardPrefixes = [
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Jack",
  "Queen",
  "King",
  "Ace",
];
const suitLookup = ["Hearts", "Diamonds", "Spades", "Clubs"];

function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
  //   return 1;
}

function addMessage(gameState, message) {
  gameState.gameMessages.unshift(message);
  // gameState.gameMessages.pop();
}

function shuffle() {
  let array = [];
  for (let i = 1; i < 53; i++) {
    array.push(i);
  }
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

function dealCards(gameState) {
  for (let i = 0; i < gameState.numCardsToDeal; i++) {
    gameState.players.forEach((player, count) => {
      //get and remove card from deck and give it to player
      let rndmNum = getRndmNum(0, gameState.deck.length - 1);
      let indexOfCard = gameState.deck.indexOf(rndmNum);
      let card = gameState.deck.splice(indexOfCard, 1)[0];
      player.cardsInHand.push(card);
    });
  }
}

function getTrump(gameState) {
  let rndmNum = getRndmNum(0, gameState.deck.length - 1);
  let indexOfCard = gameState.deck.indexOf(rndmNum);
  let trumpCard = gameState.deck.splice(indexOfCard, 1)[0];
  gameState.trumpCard = trumpCard;
}

function getRndmNum(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getPlayer(gameState, playerId) {
  let players = gameState.players.slice();
  let player = players.find((item) => {
    return item.socketId === playerId;
  });
  return player;
}

function getPlayerIndex(gameState, playerId) {
  let players = gameState.players.slice();
  let index;
  players.find((item, count) => {
    if (item.socketId === playerId) {
      index = count;
    }
  });
  return index;
}

function getCurrentWinningCard(gameState, card, playerId){
  let trumpCard = gameState.trumpCard;
  let leadCard = gameState.leadCard;

  let trumpSuit = getSuit(trumpCard);
  let leadSuit = getSuit(leadCard);

  let cardSuit = getSuit(card);

  let playerIndex = getPlayerIndex(gameState, playerId);
  let player = gameState.players[playerIndex];

  //Check if card is first to be played
  if(gameState.leadCard === card){
    gameState.currentWinningCard = card;
    gameState.currentWinningCardSuit = cardSuit;
    gameState.currentWinningPlayer = player;
    return;
  }

  //check if card is of lead suit
  if (cardSuit === leadSuit && card >= gameState.currentWinningCard) {
    gameState.currentWinningCard = card;
    gameState.currentWinningCardSuit = cardSuit;
    gameState.currentWinningPlayer = player;
    }

  //check if the card is trump, if trump has been played and if it is higher
  if (cardSuit === trumpSuit) {
    if(gameState.currentWinningCardSuit !== trumpSuit){
      gameState.currentWinningCard = card;
      gameState.currentWinningCardSuit = cardSuit;
      gameState.currentWinningPlayer = player;
    } else {
      if(card > trumpCard){
        gameState.currentWinningCard = card;
        gameState.currentWinningCardSuit = cardSuit;
        gameState.currentWinningPlayer = player;
        }
    }
  }
  
}

// function getTrickWinner(gameState) {
//   let trumpCard = gameState.trumpCard;
//   let leadCard = gameState.leadCard;

//   let trumpSuit = getSuit(trumpCard);
//   let leadSuit = getSuit(leadCard);

//   let winnerId = gameState.leadPlayerId; //default winner
//   let winnerCard =
//     gameState.players[gameState.leadPlayerIndex].cardPlayedThisTurn;
//   let highestTrumpPlayed = -1;
//   let highestLeadPlayed = -1;

//   // console.log(`trump is a ${trumpCard} of ${trumpSuit}`);
//   // console.log(`lead is a ${leadCard} of ${leadSuit}`)

//   gameState.players.forEach((player) => {
//     let cardSuit = getSuit(player.cardPlayedThisTurn);

//     // console.log(
//     //   `${player.name} played a ${cardSuit} of ${player.cardPlayedThisTurn}`
//     // );

//     //check if card is highest lead if trump has not been played
//     if (highestTrumpPlayed === -1) {
//       if (
//         cardSuit === leadSuit &&
//         player.cardPlayedThisTurn >= highestLeadPlayed
//       ) {
//         winnerCard = player.cardPlayedThisTurn;
//         winnerId = player.socketId;
//         highestLeadPlayed = player.cardPlayedThisTurn;
//       }
//     }

//     //check if the card is trump and if it is higher
//     if (
//       cardSuit === trumpSuit &&
//       player.cardPlayedThisTurn >= highestTrumpPlayed
//     ) {
//       winnerCard = player.cardPlayedThisTurn;
//       winnerId = player.socketId;
//       highestTrumpPlayed = player.cardPlayedThisTurn;
//     }
//   });

//   // gameState.winnerLastTurnId = winnerId;
//   // gameState.winnerLastTurnIndex = getPlayerIndex(gameState, winnerId);
//   // gameState.winnerCardLastTurn = winnerCard;
//   let player = getPlayer(gameState, winnerId);

//   addMessage(
//     gameState,
//     `${player.name} won with ${getCardName(player.cardPlayedThisTurn)}`
//   );
//   console.log('winners',gameState.currentWinningPlayer, player)

//   player.tricksWon += 1;
//   return winnerId;
// }

function scorePoints(gameState) {
  gameState.players.forEach((player) => {
    player.points +=
      player.tricksBet === player.tricksWon
        ? 10 + player.tricksBet
        : player.tricksWon;
  });
}

function resetPlayerBets(gameState) {
  gameState.players.forEach((player) => {
    player.tricksBetLastTurn = player.tricksBet;
    player.tricksWonLastTurn = player.tricksWon;

    player.tricksBet = 0;
    player.tricksWon = 0;
    player.hasBet = null;
  });
}

function removeCardsPlayedThisTurn(gameState) {
  gameState.players.forEach((player) => {
    let cardIndex = player.cardsInHand.indexOf(player.cardPlayedThisTurn);
    player.cardsInHand.splice(cardIndex, 1);
    player.cardPlayedLastTurn = player.cardPlayedThisTurn;
    player.cardPlayedThisTurn = null;
  });
}

function getSuit(card) {
  let deck = [hearts, diamonds, spades, clubs];

  let suitIndex;
  deck.forEach((suit, count) => {
    if (suit.indexOf(card) > -1) {
      suitIndex = count;
    }
  });

  let suit = suitLookup[suitIndex];
  return suit;
}

function getCardName(card) {
  let deck = {
    Hearts: hearts,
    Diamonds: diamonds,
    Spades: spades,
    Clubs: clubs,
  };

  let suit = getSuit(card);
  let suittedDeck = deck[suit];
  let index = suittedDeck.indexOf(card);
  let name = cardPrefixes[index];
  return `${name} of ${suit}`;
}

function getGameWinner(gameState) {
  let winner = "";
  let highestPoints = -1;
  gameState.players.forEach((player) => {
    if (player.points > highestPoints) {
      winner = player.name;
      highestPoints = player.points;
    }
  });

  gameState.gameWinner = winner;
}

function resetGameState(gameState) {
  gameState.roundNum = 0;
  gameState.gameStatus = 0;
  gameState.roundStatus = 0;
  gameState.leadPlayerIndex = 1;
  gameState.leadPlayerId = null;
  gameState.dealerIndex = 0;
  gameState.currentPlayerTurnId = null;
  gameState.currentPlayerTurnIndex = 1;
  gameState.winnerLastTurnId = null;
  gameState.winnerLastTurnIndex = 1;

  gameState.leadCard = -1;
  gameState.trumpCard = -1;
  gameState.leadCardLastTurn = -1;
  gameState.trumpCardLastTurn = -1;
  gameState.winnerCardLastTurn = -1;
  gameState.winnerCardLastTurnIndex = 1;

  gameState.deck = [];
  gameState.numPlayers = gameState.players.length;
  gameState.numCardsToDeal = 0;
  gameState.roundTurnCount = 0;
  gameState.gameMessages = [];
  gameState.roundOver = false;
  gameState.turnOver = false;
  gameState.gameOver = false;
  gameState.showModal = false;
  gameState.timer = null;
  gameState.gameWinner = "";
  gameState.totalBets = 0;

  gameState.players.forEach((player) => {
    player.points = 0;
    player.cardsInHand = [];
    player.cardPlayedThisTurn = null;
    player.cardPlayedLastTurn = null;
    player.tricksBetLastTurn = 0;
    player.tricsWonLastTurn = 0;
    player.isLead = null;
    player.isCurrentTurn = null;
    player.tricksWon = 0;
    player.tricksBet = 0;
    player.hasBet = null;
    player.isReadyForNextTurn = false;
  });
}
