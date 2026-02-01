import React, { useState, useEffect } from 'react';
import { quais } from 'quais';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './constants';
import { Sword, Shield, Activity, Users, Zap, RefreshCw } from 'lucide-react';

const Card = ({ id, attack, health, onClick, disabled, isOpponent }) => (
  <div 
    onClick={() => !disabled && onClick && onClick(id)}
    className={`relative w-32 h-48 rounded-xl border-2 transition-all duration-300 transform 
      ${isOpponent ? 'bg-indigo-900 border-indigo-700' : 'bg-slate-800 border-slate-600 hover:scale-105 hover:border-blue-400 cursor-pointer'} 
      ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'shadow-lg hover:shadow-blue-500/20'}
      flex flex-col items-center justify-between p-4 selected-none`}
  >
    <div className="w-full flex justify-between items-center text-xs font-bold text-slate-400">
      <span>#{id}</span>
      {isOpponent && <span className="text-red-400">ENEMY</span>}
    </div>
    
    <div className={`p-3 rounded-full ${isOpponent ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
      <Sword size={32} className={isOpponent ? 'text-red-400' : 'text-blue-400'} />
    </div>

    <div className="w-full flex justify-between space-x-2 mt-2">
      <div className="flex items-center space-x-1 bg-slate-900/50 px-2 py-1 rounded">
        <Sword size={14} className="text-yellow-500" />
        <span className="font-bold text-lg text-yellow-500">{attack}</span>
      </div>
      <div className="flex items-center space-x-1 bg-slate-900/50 px-2 py-1 rounded">
        <Shield size={14} className="text-red-500" />
        <span className="font-bold text-lg text-red-500">{health}</span>
      </div>
    </div>
  </div>
);

function App() {
  const [wallet, setWallet] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Game State
  const [gameState, setGameState] = useState({
    active: false,
    currentTurn: '',
    player1: '0x0000000000000000000000000000000000000000',
    player2: '0x0000000000000000000000000000000000000000',
    p1HP: 0,
    p2HP: 0,
    winner: '0x0000000000000000000000000000000000000000'
  });
  
  const [myDeck, setMyDeck] = useState([]);

  // Connect Wallet
  const connectWallet = async () => {
    setLoading(true);
    setError('');
    try {
      if (!window.pelagus && !window.ethereum) {
        throw new Error("Pelagus or MetaMask wallet not found! Please install Pelagus.");
      }

      // Use Pelagus if available, otherwise fallback
      const provider = new quais.BrowserProvider(window.pelagus || window.ethereum);
      
      // Request accounts
      await provider.send("quai_requestAccounts", []);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      console.log("Connected:", userAddress);
      
      const gameContract = new quais.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setWallet(signer);
      setAccount(userAddress);
      setContract(gameContract);
      
      // Initial fetch
      fetchGameState(gameContract, userAddress);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Game State
  const fetchGameState = async (gameContract, userAddr) => {
    if (!gameContract) return;
    
    try {
      const status = await gameContract.getGameStatus();
      /* 
         Returns:
         0: active (bool)
         1: currentTurn (address)
         2: winner (address)
         3: p1HP (uint)
         4: p2HP (uint)
         5: p1Cards (uint)
         6: p2Cards (uint)
      */
      
      const p1 = await gameContract.player1();
      const p2 = await gameContract.player2();

      setGameState({
        active: status[0],
        currentTurn: status[1],
        winner: status[2],
        p1HP: Number(status[3]),
        p2HP: Number(status[4]),
        player1: p1,
        player2: p2
      });

      // Fetch Deck if player
      if (userAddr === p1 || userAddr === p2) {
        const deckIds = await gameContract.getPlayerDeck(userAddr);
        const deckData = [];
        
        for (let i = 0; i < deckIds.length; i++) {
          const id = deckIds[i];
          const card = await gameContract.cards(id); // Returns (attack, health)
          deckData.push({
            id: Number(id),
            attack: Number(card[0]),
            health: Number(card[1]),
            index: i // Important for playCard(index)
          });
        }
        setMyDeck(deckData);
      }
      
    } catch (err) {
      console.error("Error fetching state:", err);
    }
  };

  // Polling loop
  useEffect(() => {
    if (contract && account) {
      const interval = setInterval(() => {
        fetchGameState(contract, account);
      }, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [contract, account]);

  // Actions
  const joinGame = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.joinGame({ gasLimit: 5000000 });
      await tx.wait();
      fetchGameState(contract, account);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  const playCard = async (index) => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.playCard(index, { gasLimit: 5000000 });
      await tx.wait();
      fetchGameState(contract, account);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPlayer1 = account === gameState.player1;
  const isPlayer2 = account === gameState.player2;
  const isMyTurn = gameState.active && gameState.currentTurn === account;
  const isOpponentTurn = gameState.active && gameState.currentTurn !== account && (isPlayer1 || isPlayer2);
  
  // Opponent Data
  const opponentHP = isPlayer1 ? gameState.p2HP : gameState.p1HP;
  const opponentAddr = isPlayer1 ? gameState.player2 : gameState.player1;
  const myHP = isPlayer1 ? gameState.p1HP : gameState.p2HP;

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const hasWinner = gameState.winner && gameState.winner !== ZERO_ADDRESS;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-game selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Sword size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Quai Clash
          </h1>
        </div>

        <div>
          {!account ? (
            <button 
              onClick={connectWallet}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              <Zap size={18} />
              <span>{loading ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-4">
               <div className="px-4 py-1 bg-slate-800 rounded-full border border-slate-700 text-sm font-mono text-blue-300">
                 {account.substring(0, 6)}...{account.substring(38)}
               </div>
               <button onClick={() => fetchGameState(contract, account)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                 <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
               </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 flex items-center">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        {!account ? (
          /* Landing State */
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
              Decentralized Card Battles
            </h2>
            <p className="text-slate-400 text-lg max-w-md">
              Connect your Pelagus wallet to enter the arena on the Quai Network.
            </p>
          </div>
        ) : (
          /* Game UI */
          <div className="space-y-8">
            
            {/* Lobby / Status */}
            {!gameState.active && !hasWinner && (
              <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700 text-center space-y-4">
                <Users size={48} className="mx-auto text-slate-500" />
                <h3 className="text-2xl font-bold">Lobby</h3>
                
                {gameState.player1 === account || gameState.player2 === account ? (
                   <div className="text-yellow-400 animate-pulse">Waiting for opponent to join...</div>
                ) : (
                  <div>
                    <p className="text-slate-400 mb-6">Join the game to start battling!</p>
                    <button 
                      onClick={joinGame}
                      disabled={loading}
                      className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all transform hover:scale-105"
                    >
                      {loading ? 'Joining...' : 'Join Game Now'}
                    </button>
                  </div>
                )}
                
                <div className="flex justify-center space-x-8 mt-4 text-sm text-slate-500">
                   <div>Player 1: {gameState.player1 === ZERO_ADDRESS ? 'Empty' : (gameState.player1 === account ? 'YOU' : gameState.player1.substring(0,8)+'...')}</div>
                   <div>Player 2: {gameState.player2 === ZERO_ADDRESS ? 'Empty' : (gameState.player2 === account ? 'YOU' : gameState.player2.substring(0,8)+'...')}</div>
                </div>
              </div>
            )}

            {/* Winner Screen */}
            {hasWinner && (
               <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-600/10 p-10 rounded-2xl border border-yellow-500/30 text-center">
                 <h2 className="text-4xl font-bold text-yellow-400 mb-4">Game Over!</h2>
                 <div className="text-2xl text-slate-200">
                   {gameState.winner === account ? '🏆 VICTORY! You won!' : '💀 DEFEAT! Better luck next time.'}
                 </div>
                 <button 
                   onClick={() => window.location.reload()}
                   className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold"
                 >
                   Reset UI
                 </button>
               </div>
            )}

            {/* Battle Arena */}
           {(gameState.active || hasWinner) && (
            <div className="relative min-h-[500px] flex flex-col justify-between">
              
              {/* Opponent Area (Top) */}
              <div className="flex flex-col items-center space-y-2 p-4 bg-red-950/20 rounded-xl border border-red-900/30 opacity-80">
                <div className="flex items-center space-x-2 text-red-200">
                   <Users size={16} />
                   <span className="font-bold text-sm">Opponent ({opponentAddr.substring(0,6)}...)</span>
                </div>
                
                {/* Health Bar */}
                <div className="w-64 h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500" 
                    style={{width: `${(opponentHP / 30) * 100}%`}} 
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                    {opponentHP} / 30 HP
                  </div>
                </div>

                {/* Opponent Cards (Hidden/Visual) */}
                <div className="flex space-x-2 mt-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-20 h-28 bg-indigo-950 border border-indigo-800 rounded-lg flex items-center justify-center">
                       <span className="text-indigo-800 font-bold">?</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Turn Indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0">
                {isMyTurn && (
                   <div className="px-6 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-500 font-bold rounded-full animate-bounce">
                     YOUR TURN!
                   </div>
                )}
                {isOpponentTurn && (
                   <div className="px-6 py-2 bg-slate-800 border border-slate-600 text-slate-400 font-bold rounded-full">
                     Opponent thinking...
                   </div>
                )}
              </div>

              {/* Player Area (Bottom) */}
              <div className="flex flex-col items-center space-y-4 p-6 bg-blue-950/20 rounded-xl border border-blue-900/30 mt-8">
                 
                 {/* Player Stats */}
                 <div className="flex items-center space-x-6 w-full max-w-lg justify-between mb-4">
                    <div className="flex items-center space-x-2 text-blue-200">
                       <Shield size={20} />
                       <span className="font-bold">YOU</span>
                    </div>
                    
                    {/* Health Bar */}
                    <div className="flex-1 mx-4 h-6 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative shadow-inner">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500" 
                        style={{width: `${(myHP / 30) * 100}%`}} 
                      ></div>
                       <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                        {myHP} / 30 HP
                      </div>
                    </div>
                 </div>

                 {/* Player Deck */}
                 <div className="flex flex-wrap justify-center gap-4">
                    {myDeck.length === 0 ? (
                      <div className="text-slate-500 italic">deck empty...</div>
                    ) : (
                      myDeck.map((card) => (
                        <Card 
                          key={card.index} 
                          {...card} 
                          onClick={() => playCard(card.index)}
                          disabled={!isMyTurn || loading}
                        />
                      ))
                    )}
                 </div>

              </div>

            </div>
           )}

          </div>
        )}
      </main>

    </div>
  );
}

export default App;
