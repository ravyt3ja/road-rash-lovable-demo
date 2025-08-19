import { useEffect } from 'react';

const Index = () => {
  useEffect(() => {
    // Load Phaser and start the game
    const loadGame = async () => {
      // Add Phaser script if not already loaded
      if (!(window as any).Phaser) {
        const phaserScript = document.createElement('script');
        phaserScript.src = 'https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js';
        phaserScript.onload = () => {
          // Load and execute the game script
          const gameScript = document.createElement('script');
          gameScript.src = '/main.js';
          document.head.appendChild(gameScript);
        };
        document.head.appendChild(phaserScript);
      } else {
        // Phaser already loaded, just load the game
        const gameScript = document.createElement('script');
        gameScript.src = '/main.js';
        document.head.appendChild(gameScript);
      }
    };

    loadGame();
  }, []);

  return (
    <div style={{
      margin: 0,
      padding: 0,
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      color: '#fff',
      fontFamily: "'Courier New', monospace",
      overflow: 'hidden',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh'
    }}>
      <div id="game-container" style={{
        position: 'relative',
        border: '2px solid #8a2be2',
        borderRadius: '8px',
        boxShadow: '0 0 30px rgba(138, 43, 226, 0.5)',
        background: '#0f0f23'
      }}>
        <div id="loading" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#8a2be2',
          fontSize: '24px',
          zIndex: 1000
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(138, 43, 226, 0.3)',
            borderTop: '4px solid #8a2be2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '20px auto'
          }}></div>
          <div>Loading RashRoad...</div>
        </div>
      </div>
    </div>
  );
};

export default Index;
