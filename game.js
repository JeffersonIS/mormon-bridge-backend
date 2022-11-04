module.exports = {
    initGame,
    addPlayerToGameState,
}


function initGame(player, numRounds){
    let newPlayer = new Player(player.name, player.number, player.socketId);
    let game = new Game(newPlayer, Number(numRounds));
    return game;
}

function addPlayerToGameState(roomState, playerName, numClients, socketId){
    let newPlayer = new Player(playerName, numClients + 1, socketId);
    roomState.players.push(newPlayer);
}

class Game {
    constructor(player, numRounds){
        this.roundNum = 0;
        this.gameStatus = 0; //0 is waiting for players, 1 is playing, and 2 is gameOver
        this.roundStatus = 0;
         //0 is betting, 1 is playing, 2 is scoring
        this.leadPlayerIndex = 1;
        this.leadPlayerId = null;
        this.dealerIndex = 0;
        this.currentPlayerTurnId = null;
        this.currentPlayerTurnIndex = 1;
        this.winnerLastTurnId = null;
        this.winnerLastTurnIndex = 1;

        this.leadCard = -1;
        this.trumpCard = -1;
        this.leadCardLastTurn = -1;
        this.trumpCardLastTurn = -1;
        this.winnerCardLastTurn = -1;
        this.winnerCardLastTurnIndex = 1;
        
        this.deck = this.makeDeck();
        this.numPlayers = 0;
        this.players = [player];
        this.numCardsToDeal = 0;//number of cards to deal for the current round based on round number
        this.numTotalRoundsToPlay = numRounds + (numRounds - 1);//needed because rounds go up to a maximum # of cards dealt, then back to 1. RoundNum !== cards dealt. This should be double
        this.turnaroundRoundNum = numRounds;
        this.roundTurnCount = 0;
        this.gameMessages = []; //initialize messages to hold five messsages
        this.roundOver = false;
        this.turnOver = false;
        this.gameOver = false;
        this.showModal = false;
        this.timer = null;
        this.gameWinner = '';
        this.deckStyleNum = this.getDeckStyleNum();
        this.disconnectedClients = {};
    }

    makeDeck(){
        let deck = [];
        for(let i=1; i<53; i++){
            deck.push(i);
        }
        return deck;
    }

    makeid() {
        var length = 5;
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
           result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    getDeckStyleNum(){
        let cards = [53,54,55,56,57,58,59]
        let card = cards[this.getRndmNum(0,6)];
        return card;
     }

    getRndmNum(min, max) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
     }
  }

class Player {
    constructor(name, number, id){
        this.name = name;
        this.number = number;
        this.socketId = id;
        this.points = 0;
        this.cardsInHand = [];
        this.cardPlayedThisTurn = null;
        this.cardPlayedLastTurn = null;
        this.tricksBetLastTurn = 0;
        this.tricsWonLastTurn = 0;
        this.isLead = null;
        this.isCurrentTurn = null;
        this.tricksWon = 0;
        this.tricksBet = 0;
        this.hasBet = null;
    }
}