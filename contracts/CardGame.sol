// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CardGame {
    struct Card {
        uint attack;
        uint health;
    }
    struct Player {
        uint hp;
        uint[] deck;
    }

    mapping(uint => Card) public cards;
    mapping(address => Player) public players;

    address public player1;
    address public player2;
    address public currentTurn;
    bool public gameActive;
    address public winner;

    event GameStarted(address player1, address player2);
    event CardPlayed(address player, uint cardIndex, uint damage);
    event GameEnded(address winner, string reason);

    constructor() {
        cards[0] = Card(5, 5);
        cards[1] = Card(7, 3);
        cards[2] = Card(3, 8);
    }

    function startGame() internal {
        delete players[player1].deck;
        delete players[player2].deck;
        
        players[player1].hp = 30;
        players[player2].hp = 30;

        // Initialize standard deck (0, 1, 2)
        uint[] memory baseDeck = new uint[](3);
        baseDeck[0] = 0;
        baseDeck[1] = 1;
        baseDeck[2] = 2;

        // Shuffle and Assign for Player 1
        uint[] memory deck1 = shuffle(baseDeck, player1);
        for(uint i=0; i<3; i++) players[player1].deck.push(deck1[i]);

        // Shuffle and Assign for Player 2
        uint[] memory deck2 = shuffle(baseDeck, player2);
        for(uint i=0; i<3; i++) players[player2].deck.push(deck2[i]);

        currentTurn = player1;
        gameActive = true;
        winner = address(0);
        
        emit GameStarted(player1, player2);
    }

    function shuffle(uint[] memory deck, address player) internal view returns (uint[] memory) {
        uint[] memory shuffled = deck;
        uint n = shuffled.length; 
        // Use block data + player address for randomness seed
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, player, block.number)));
        
        for (uint i = 0; i < n; i++) {
            uint256 r = (uint256(keccak256(abi.encodePacked(seed, i))) % n);
            (shuffled[i], shuffled[r]) = (shuffled[r], shuffled[i]);
        }
        return shuffled;
    }

    function joinGame() public {
        require(!gameActive, "Game already started");

        if (player1 == address(0)) {
            player1 = msg.sender;
        } else {
            require(player2 == address(0), "Game full");
            require(msg.sender != player1, "Already joined");
            player2 = msg.sender;
            startGame();
        }
    }

    function playCard(uint index) public {
        require(gameActive, "Game not active");
        require(msg.sender == currentTurn, "Not your turn");
        
        Player storage attacker = players[msg.sender];
        require(index < attacker.deck.length, "Invalid card index");

        address opponent = (msg.sender == player1) ? player2 : player1;
        Player storage defender = players[opponent];

        uint cardId = attacker.deck[index];
        Card memory card = cards[cardId];

        // Deal damage
        if (card.attack >= defender.hp) {
            defender.hp = 0;
        } else {
            defender.hp -= card.attack;
        }
        
        emit CardPlayed(msg.sender, cardId, card.attack);

        // Remove card from deck
        attacker.deck[index] = attacker.deck[attacker.deck.length - 1];
        attacker.deck.pop();

        // CHECK 1: Did defender lose all HP?
        if (defender.hp == 0) {
            gameActive = false;
            winner = msg.sender;
            emit GameEnded(msg.sender, "HP reached 0");
            return;
        }

        // Switch turn
        currentTurn = opponent;

        // CHECK 2: Did opponent run out of cards?
        if (players[opponent].deck.length == 0) {
            // Opponent has no cards left - current player wins!
            gameActive = false;
            winner = msg.sender;
            emit GameEnded(msg.sender, "Opponent out of cards");
            return;
        }
    }
    
    function resetGame() public {
        require(!gameActive, "Game still active");
        player1 = address(0);
        player2 = address(0);
        winner = address(0);
    }
    
    function getPlayerDeck(address player) public view returns (uint[] memory) {
        return players[player].deck;
    }
    
    function getPlayerHP(address player) public view returns (uint) {
        return players[player].hp;
    }
    
    // New helper function to check game status
    function getGameStatus() public view returns (
        bool active,
        address currentPlayer,
        address winnerAddress,
        uint player1HP,
        uint player2HP,
        uint player1Cards,
        uint player2Cards
    ) {
        return (
            gameActive,
            currentTurn,
            winner,
            players[player1].hp,
            players[player2].hp,
            players[player1].deck.length,
            players[player2].deck.length
        );
    }
}
