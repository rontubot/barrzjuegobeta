import { useState, useEffect } from 'react';
import { Splash } from './components/Splash';
import { OnboardingAuth } from './components/OnboardingAuth';
import { GameSetup } from './components/GameSetup';
import { Game } from './components/Game';
import './App.css';

type GameState =
  | 'splash'
  | 'onboarding_1'
  | 'onboarding_2'
  | 'auth_choice'
  | 'auth_password'
  | 'auth_verify'
  | 'lobby_start'
  | 'tutorial_ask'
  | 'mode_selection'
  | 'setup_players'
  | 'setup_rounds'
  | 'setup_deck'
  | 'game';

interface UserSession {
  email: string;
  loggedIn: boolean;
  method: string;
}

interface GameSettings {
  mode: 'solo' | 'multiplayer';
  players: string[];
  roundsCount: number;
  selectedCategories: string[];
  startingPlayer: string;
}

function App() {
  const [gameState, setGameState] = useState<GameState>('splash');
  const [cameFromGame, setCameFromGame] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Datos compartidos de sesión y partida
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleStartGame = () => {
    setCameFromGame(false);
    setGameState('onboarding_1');
  };

  const handleBackToMenu = () => {
    setCameFromGame(true);
    // Al volver al menú desde el juego, regresamos directamente al Lobby
    setGameState('lobby_start');
  };

  // Enrutador de avance de pantallas
  const handleNextStep = (nextStep: string, data?: any) => {
    if (data) {
      // Registrar sesión de usuario
      if (data.loggedIn) {
        setUserSession({
          email: data.email,
          loggedIn: true,
          method: data.method
        });
      }

      // Al iniciar el combate directo (desde deck selection, solo mode o rápido)
      if (nextStep === 'game' && data.mode) {
        setGameSettings({
          mode: data.mode,
          players: data.players,
          roundsCount: data.roundsCount,
          selectedCategories: data.selectedCategories,
          startingPlayer: data.startingPlayer || data.players[0]
        });
      }
    }
    setGameState(nextStep as GameState);
  };

  // Enrutador de retroceso de pantallas (volver atrás)
  const handleBackStep = () => {
    switch (gameState) {
      case 'onboarding_1':
        setGameState('splash');
        break;
      case 'onboarding_2':
        setGameState('onboarding_1');
        break;
      case 'auth_choice':
        setGameState('onboarding_2');
        break;
      case 'auth_password':
        setGameState('auth_choice');
        break;
      case 'auth_verify':
        setGameState('auth_password');
        break;
      case 'lobby_start':
        // Log out y volver al registro
        setUserSession(null);
        setGameState('auth_choice');
        break;
      case 'tutorial_ask':
        setGameState('lobby_start');
        break;
      case 'mode_selection':
        setGameState('tutorial_ask');
        break;
      case 'setup_players':
        setGameState('mode_selection');
        break;
      case 'setup_rounds':
        setGameState('setup_players');
        break;
      case 'setup_deck':
        setGameState('setup_rounds');
        break;
      default:
        setGameState('splash');
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="loader-screen">
        <div className="grunge-overlay"></div>
        <div className="loader-content">
          <img src="/Barrzjuego.png" alt="Cargando Barrzjuego..." className="loader-logo" />
          <div className="loader-bar-container">
            <div className="loader-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  // 1. Pantalla Inicial (Splash)
  if (gameState === 'splash') {
    return (
      <div className="app-root">
        <Splash onStartGame={handleStartGame} fromGame={cameFromGame} />
      </div>
    );
  }

  // 2. Pantallas de Onboarding y Autenticación
  if (
    gameState === 'onboarding_1' ||
    gameState === 'onboarding_2' ||
    gameState === 'auth_choice' ||
    gameState === 'auth_password' ||
    gameState === 'auth_verify'
  ) {
    return (
      <div className="app-root">
        <OnboardingAuth
          step={gameState}
          onNext={handleNextStep}
          onBack={handleBackStep}
        />
      </div>
    );
  }

  // 3. Pantallas de Lobbies y Configuraciones de Juego
  if (
    gameState === 'lobby_start' ||
    gameState === 'tutorial_ask' ||
    gameState === 'mode_selection' ||
    gameState === 'setup_players' ||
    gameState === 'setup_rounds' ||
    gameState === 'setup_deck'
  ) {
    return (
      <div className="app-root">
        <GameSetup
          step={gameState}
          userSession={userSession}
          onNext={handleNextStep}
          onBack={handleBackStep}
        />
      </div>
    );
  }

  // 4. Zona de Juego Activa (Gameplay & Resultados)
  if (gameState === 'game') {
    return (
      <div className="app-root">
        <Game
          onBackToMenu={handleBackToMenu}
          gameSettings={gameSettings || undefined}
        />
      </div>
    );
  }

  return null;
}

export default App;
