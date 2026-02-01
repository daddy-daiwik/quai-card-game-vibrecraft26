// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CardGame {
    struct Card {
        uint attack;
    }
    
    struct Player {
        uint[] deck;
        uint team; // 1 or 2
        bool hasJoined;
    }

    // Config
    mapping(uint => Card) public cards;
    uint public constant MAX_HP = 100;
    uint256 public constant ENTRY_FEE = 0.0067 ether; 
    
    // State
    uint public gameId; 
    mapping(uint => mapping(address => Player)) public players; 
    mapping(uint => mapping(uint => address[])) public teamMembers; 

    mapping(uint => uint) public teamHP;   
    mapping(uint => uint) public teamSize; 
    mapping(uint => uint) public teamCards; 

    // Betting
    mapping(uint => uint256) public gamePrizePool;      
    
    uint public currentTeamTurn; 
    bool public gameActive;
    uint public winnerTeam;

    event GameStarted(uint gameId, uint cardsPerTeam1, uint cardsPerTeam2);
    event PlayerJoined(uint gameId, address player, uint team);
    event CardPlayed(address player, uint team, uint cardId, uint damage);
    event GameEnded(uint winningTeam, uint256 totalPrize);
    event PayoutSent(address player, uint256 amount);

    constructor() {
        cards[0] = Card(5);
        cards[1] = Card(8);
        cards[2] = Card(3);
        cards[3] = Card(12);
        cards[4] = Card(6);
        gameId = 1; 
    }

    function joinTeam(uint _teamId) public payable {
        require(!gameActive, "Game already started! No late joiners.");
        require(msg.value == ENTRY_FEE, "Entry Fee is 0.0067 QUAI");
        require(_teamId == 1 || _teamId == 2, "Invalid team. Choose 1 or 2");
        require(!players[gameId][msg.sender].hasJoined, "Already joined this game");
        require(winnerTeam == 0, "Game finished. Reset to play.");

        players[gameId][msg.sender] = Player({
            deck: new uint[](0), // Empty deck initially
            team: _teamId,
            hasJoined: true
        });

        teamMembers[gameId][_teamId].push(msg.sender);
        teamSize[_teamId]++;
        
        // Add to Pot
        gamePrizePool[gameId] += msg.value;

        emit PlayerJoined(gameId, msg.sender, _teamId);
    }

    // Manual or Auto Start
    function beginGame() public {
        require(!gameActive, "Already active");
        require(teamSize[1] > 0 && teamSize[2] > 0, "Need players on both teams");
        
        uint size1 = teamSize[1];
        uint size2 = teamSize[2];

        // 1. Calculate LCM-based balancing
        uint common = lcm(size1, size2);
        // Base cards = 5. So total team cards = common * 5.
        // Example: 1v3. LCM=3. Total=15. Team1(1) gets 15. Team2(3) gets 5.
        // Example: 2v3. LCM=6. Total=30. Team1(2) gets 15. Team2(3) gets 10.
        uint totalTeamCards = common * 5; 

        uint cards1 = totalTeamCards / size1;
        uint cards2 = totalTeamCards / size2;

        // 2. Distribute Cards
        _distributeCards(1, cards1);
        _distributeCards(2, cards2);

        teamCards[1] = totalTeamCards;
        teamCards[2] = totalTeamCards;

        teamHP[1] = MAX_HP;
        teamHP[2] = MAX_HP;
        currentTeamTurn = 1; 
        gameActive = true;
        winnerTeam = 0;

        emit GameStarted(gameId, cards1, cards2);
    }

    function _distributeCards(uint teamId, uint count) internal {
        address[] memory members = teamMembers[gameId][teamId];
        for(uint i=0; i<members.length; i++) {
            players[gameId][members[i]].deck = shuffleDeck(members[i], count);
        }
    }

    function resetGame() public {
        // Allow reset if game is STUCK (active but nobody playing?) or Ended
        // require(!gameActive, "Cannot reset while active"); 
        // Actually, we should allow reset if it's been abandoned, but for now let's strict check
        // or if winnerTeam != 0.
        
        gameId++; 
        
        gameActive = false;
        teamHP[1] = MAX_HP;
        teamHP[2] = MAX_HP;
        teamSize[1] = 0;
        teamSize[2] = 0;
        teamCards[1] = 0;
        teamCards[2] = 0;
        winnerTeam = 0;
        currentTeamTurn = 1;
        
        // Clear old tracking (mappings are essentially cleared by gameId increment)
        // EXCEPT: Arrays need to be reset? 
        // Mappings `teamMembers[gameId]` are fresh for new gameId. Safe.
    }

    function gcd(uint a, uint b) internal pure returns (uint) {
        if (b == 0) return a;
        return gcd(b, a % b);
    }

    function lcm(uint a, uint b) internal pure returns (uint) {
        if (a == 0 || b == 0) return 0;
        return (a * b) / gcd(a, b);
    }

    function shuffleDeck(address player, uint count) internal view returns (uint[] memory) {
        uint[] memory newDeck = new uint[](count);
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, player, block.number, gameId)));
        for (uint i = 0; i < count; i++) {
            newDeck[i] = uint256(keccak256(abi.encodePacked(seed, i))) % 5;
        }
        return newDeck;
    }

    function playCard(uint index) public {
        require(gameActive, "Game not active");
        Player storage p = players[gameId][msg.sender];
        require(p.hasJoined, "Not joined");
        require(p.team == currentTeamTurn, "Not your team's turn");
        require(index < p.deck.length, "Invalid card index");

        uint cardId = p.deck[index];
        uint damage = cards[cardId].attack;

        uint opponentTeam = (p.team == 1) ? 2 : 1;
        if (teamHP[opponentTeam] <= damage) {
            teamHP[opponentTeam] = 0;
            finishGame(p.team);
            return;
        } else {
            teamHP[opponentTeam] -= damage;
        }

        emit CardPlayed(msg.sender, p.team, cardId, damage);

        p.deck[index] = p.deck[p.deck.length - 1];
        p.deck.pop();
        teamCards[p.team]--; 

        if (teamCards[opponentTeam] == 0) {
            finishGame(p.team); 
            return;
        }

        currentTeamTurn = opponentTeam;
    }
    
    function finishGame(uint winner) internal {
        gameActive = false;
        winnerTeam = winner;
        
        uint256 totalPool = gamePrizePool[gameId];
        address[] memory winners = teamMembers[gameId][winner];
        uint256 winnerCount = winners.length;

        if (winnerCount > 0 && totalPool > 0) {
            uint256 share = totalPool / winnerCount;
            for (uint i = 0; i < winnerCount; i++) {
                payable(winners[i]).transfer(share);
                emit PayoutSent(winners[i], share);
            }
        }

        emit GameEnded(winner, totalPool);
    }

    function getMyDeck() public view returns (uint[] memory) {
        return players[gameId][msg.sender].deck;
    }

    function getGameState() public view returns (
        bool active,
        uint turn,
        uint winner,
        uint hp1,
        uint hp2,
        uint count1,
        uint count2,
        uint cards1,
        uint cards2,
        uint currentGameId,
        uint256 prizePool 
    ) {
        return (
            gameActive,
            currentTeamTurn,
            winnerTeam,
            teamHP[1],
            teamHP[2],
            teamSize[1],
            teamSize[2],
            teamCards[1],
            teamCards[2],
            gameId,
            gamePrizePool[gameId]
        );
    }
}
