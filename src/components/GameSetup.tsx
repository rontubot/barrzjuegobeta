import React, { useState, useEffect } from 'react';
import { Users, Sliders, Play, Plus, Minus, UserPlus, Check, RefreshCw, Volume2, Sparkles, BookOpen } from 'lucide-react';
import './GameSetup.css';

interface GameSetupProps {
  step: 'lobby_start' | 'tutorial_ask' | 'mode_selection' | 'setup_players' | 'setup_rounds' | 'setup_deck';
  userSession: any;
  onNext: (nextStep: string, data?: any) => void;
  onBack: () => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ step, userSession, onNext, onBack }) => {
  // Configuración de juego
  const [players, setPlayers] = useState<string[]>(['Freestyler A', 'Freestyler B']);
  const [roundsCount, setRoundsCount] = useState(5);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'palabras',
    'tematicas',
    'cypher',
    'terminaciones',
    'beatbox',
    '1v1',
    'sacrificio'
  ]);
  
  // Sorteo de quién empieza
  const [startingPlayer, setStartingPlayer] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinIndex, setSpinIndex] = useState(0);

  // Tutorial interactivo
  const [showTutorialSlides, setShowTutorialSlides] = useState(false);
  const [tutorialSlide, setTutorialSlide] = useState(0);

  // Categorías de cartas disponibles
  const categoriesList = [
    { id: 'palabras', label: 'Palabras', desc: 'Rimar usando las 4 palabras de tu lado' },
    { id: 'tematicas', label: 'Temáticas', desc: 'Desarrollar rimas sobre un tema profundo' },
    { id: 'cypher', label: 'Cypher', desc: 'Ronda libre en equipo compartiendo micro' },
    { id: 'terminaciones', label: 'Terminaciones', desc: 'Patrones obligatorios como -ER o -AR' },
    { id: 'beatbox', label: 'Beatbox', desc: 'Base humana con cronómetro de 90 segundos' },
    { id: '1v1', label: 'Batalla 1v1', desc: 'Duelo conceptual directo entre rivales' },
    { id: 'sacrificio', label: 'El Sacrificio', desc: 'Ronda final de máxima entrega y energía' }
  ];

  // Manejo de nombres de jugadores
  const handlePlayerNameChange = (index: number, name: string) => {
    const oldName = players[index];
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);

    // Si el jugador cuyo nombre cambió era el startingPlayer, actualizar el nombre
    if (startingPlayer === oldName) {
      setStartingPlayer(name);
    }
  };

  const addPlayerField = () => {
    if (players.length >= 8) return;
    setPlayers([...players, `Freestyler ${String.fromCharCode(65 + players.length)}`]);
  };

  const removePlayerField = (index: number) => {
    if (players.length <= 2) return;
    const oldName = players[index];
    const newPlayers = players.filter((_, i) => i !== index);
    setPlayers(newPlayers);

    // Si eliminamos al jugador que empezaba, resetear el empezador
    if (startingPlayer === oldName) {
      setStartingPlayer('');
    }

    // Asegurar que spinIndex no quede fuera de rango
    if (spinIndex >= newPlayers.length) {
      setSpinIndex(newPlayers.length - 1);
    }
  };

  // Toggle de categorías de juego
  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== id));
      }
    } else {
      setSelectedCategories([...selectedCategories, id]);
    }
  };

  // Efecto de la ruleta para elegir quién empieza
  useEffect(() => {
    if (!isSpinning) return;

    let counter = 0;
    const totalSteps = 15 + Math.floor(Math.random() * 10);
    let currentIndex = spinIndex;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % players.length;
      setSpinIndex(currentIndex);
      counter++;

      if (counter >= totalSteps) {
        clearInterval(interval);
        setStartingPlayer(players[currentIndex]);
        setIsSpinning(false);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [isSpinning, players]);

  const startSpinWheel = () => {
    setStartingPlayer('');
    setIsSpinning(true);
  };

  // Tutorial Slides
  const tutorialSteps = [
    {
      title: "Mazos y Cartas",
      desc: "El juego tiene un mazo verde de Beats (ritmos de rap) y un mazo rosa de Desafíos. ¡En cada turno deberás sacar una carta de cada mazo!",
      icon: <Sparkles size={40} className="teal-text" />
    },
    {
      title: "Bases con Spotify",
      desc: "Haz clic sobre la carta de Beat para abrir directamente el reproductor de Spotify en segundo plano. La música sonará sin interrumpir la app.",
      icon: <Volume2 size={40} className="pink-text" />
    },
    {
      title: "Puntuación en Equipo",
      desc: "Improvisa de acuerdo al desafío. Al final del turno, tus compañeros te puntuarán de 1 a 5 estrellas según tu fluidez, métrica y entrega. ¡Gana el que sume más puntos!",
      icon: <Users size={40} className="teal-text" />
    }
  ];

  return (
    <div className="setup-outer-container">
      <div className="grunge-overlay"></div>

      {/* Botón de volver */}
      <button className="btn-setup-back" onClick={onBack}>
        <span>Atrás</span>
      </button>

      {/* ── LOBBY START ────────────────────────────────────────────────── */}
      {step === 'lobby_start' && (
        <div className="setup-card glass-panel glow-pink text-center fade-in">
          <div className="lobby-user-badge">
            <span className="user-icon">🔥</span>
            <span>Sesión: {userSession?.email || 'Freestyler Google'}</span>
          </div>

          <h1 className="logo-title-large">
            <img src="/Barrzjuego.png" alt="BARRZ" className="setup-logo-img" />
          </h1>
          <div className="logo-sub-urban">EDICIÓN DE COMBATE</div>

          <p className="lobby-desc">
            ¿Preparado para medir tus habilidades de improvisación? Configura tu equipo, define las rondas y que empiece el cypher.
          </p>

          <button className="btn-comenzar pulse-pink-anim" onClick={() => onNext('tutorial_ask')}>
            <Play size={22} fill="currentColor" />
            <span>COMENZAR</span>
          </button>
        </div>
      )}

      {/* ── TUTORIAL ASK ───────────────────────────────────────────────── */}
      {step === 'tutorial_ask' && (
        <div className="setup-card glass-panel glow-teal text-center fade-in">
          {!showTutorialSlides ? (
            <div className="tutorial-ask-content">
              <div className="icon-wrapper">
                <BookOpen size={48} className="teal-text" />
              </div>
              <h2 className="font-graffiti text-glow-teal">¿CÓMO ANDAMOS DE REGLAS?</h2>
              <p className="step-description">
                ¿Querés ver un breve tutorial interactivo para entender cómo jugar, las cartas y el reproductor de Spotify?
              </p>

              <div className="tutorial-actions-row">
                <button className="btn-neon-teal" onClick={() => setShowTutorialSlides(true)}>
                  SÍ, VER TUTORIAL
                </button>
                <button className="btn-neon-pink" onClick={() => onNext('mode_selection')}>
                  NO, SALTEAR
                </button>
              </div>
            </div>
          ) : (
            <div className="tutorial-slideshow fade-in">
              <div className="slide-icon-row">
                {tutorialSteps[tutorialSlide].icon}
              </div>
              <h3 className="slide-title font-graffiti">{tutorialSteps[tutorialSlide].title}</h3>
              <p className="slide-description">{tutorialSteps[tutorialSlide].desc}</p>

              <div className="slide-indicators">
                {tutorialSteps.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`indicator-dot ${tutorialSlide === idx ? 'active' : ''}`}
                    onClick={() => setTutorialSlide(idx)}
                  ></span>
                ))}
              </div>

              <div className="slide-navigation">
                {tutorialSlide > 0 ? (
                  <button className="btn-nav-slide" onClick={() => setTutorialSlide(prev => prev - 1)}>
                    Anterior
                  </button>
                ) : <span className="placeholder-slide"></span>}

                {tutorialSlide < tutorialSteps.length - 1 ? (
                  <button className="btn-nav-slide highlight" onClick={() => setTutorialSlide(prev => prev + 1)}>
                    Siguiente
                  </button>
                ) : (
                  <button 
                    className="btn-nav-slide highlight" 
                    onClick={() => {
                      setShowTutorialSlides(false);
                      setTutorialSlide(0);
                      onNext('mode_selection');
                    }}
                  >
                    Entendido, Jugar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODE SELECTION ─────────────────────────────────────────────── */}
      {step === 'mode_selection' && (
        <div className="setup-card glass-panel glow-pink fade-in">
          <h2 className="font-graffiti text-glow-pink text-center mb-20">SELECCIONAR MODO</h2>
          <p className="step-sub text-center">Elegí la modalidad de improvisación urbana.</p>

          <div className="modes-stack">
            <button 
              className="mode-option-card glow-teal"
              onClick={() => onNext('setup_players')}
            >
              <div className="mode-option-header">
                <Users size={20} className="teal-text" />
                <h3>Multijugador</h3>
              </div>
              <p>Competencia en equipo o 1v1 con registro de nombres, conteo de rondas, sorteo inicial y tabla de puntuaciones.</p>
            </button>

            <button 
              className="mode-option-card"
              onClick={() => {
                onNext('game', {
                  mode: 'solo',
                  players: ['Mi Práctica'],
                  roundsCount: 99,
                  selectedCategories: ['palabras', 'tematicas', 'terminaciones', 'beatbox']
                });
              }}
            >
              <div className="mode-option-header">
                <Sparkles size={20} className="pink-text" />
                <h3>Solo Práctica</h3>
              </div>
              <p>Entrenamiento individual sin registrar puntos. Ideal para pulir métricas y practicar terminaciones contra reloj.</p>
            </button>

            <button 
              className="mode-option-card"
              onClick={() => {
                onNext('game', {
                  mode: 'multiplayer',
                  players: ['Competidor 1', 'Competidor 2'],
                  roundsCount: 3,
                  selectedCategories: ['palabras', 'tematicas', 'terminaciones', 'beatbox', '1v1', 'sacrificio'],
                  startingPlayer: 'Competidor 1'
                });
              }}
            >
              <div className="mode-option-header">
                <Sliders size={20} className="pink-text" />
                <h3>Rápido Configurado</h3>
              </div>
              <p>Saltea todo el menú. Inicia una batalla rápida de 2 jugadores a 3 rondas con todos los mazos habilitados.</p>
            </button>
          </div>
        </div>
      )}

      {/* ── SETUP PLAYERS ──────────────────────────────────────────────── */}
      {step === 'setup_players' && (
        <div className="setup-card glass-panel glow-teal fade-in">
          <h2 className="font-graffiti text-glow-teal text-center mb-10">PARTICIPANTES</h2>
          <p className="step-sub text-center">Registrá los nombres de los competidores (2 a 8 jugadores).</p>

          <div className="players-list-inputs scrollable-container">
            {players.map((playerName, index) => (
              <div key={index} className="player-input-row fade-in">
                <span className="player-number-label">#{index + 1}</span>
                <input
                  type="text"
                  value={playerName}
                  maxLength={15}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  placeholder={`Jugador ${index + 1}`}
                  className="player-name-field"
                />
                <button 
                  className="btn-remove-player"
                  onClick={() => removePlayerField(index)}
                  disabled={players.length <= 2}
                >
                  <Minus size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="setup-actions-footer">
            <button 
              className="btn-add-player w-100" 
              onClick={addPlayerField} 
              disabled={players.length >= 8}
            >
              <UserPlus size={16} />
              <span>Añadir Competidor ({players.length}/8)</span>
            </button>

            <button 
              className="btn-neon-pink w-100 mt-20"
              onClick={() => onNext('setup_rounds', { players })}
            >
              <span>SIGUIENTE: RONDAS</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SETUP ROUNDS ───────────────────────────────────────────────── */}
      {step === 'setup_rounds' && (
        <div className="setup-card glass-panel glow-pink text-center fade-in">
          <h2 className="font-graffiti text-glow-pink mb-10">CANTIDAD DE RONDAS</h2>
          <p className="step-sub">Elegí la duración de la batalla (1 a 20 rondas).</p>

          <div className="rounds-selector-widget">
            <button 
              className="btn-counter" 
              onClick={() => setRoundsCount(prev => Math.max(1, prev - 1))}
            >
              <Minus size={24} />
            </button>

            <div className="rounds-count-display">
              <span className="rounds-number">{roundsCount}</span>
              <span className="rounds-label">{roundsCount === 1 ? 'RONDA' : 'RONDAS'}</span>
            </div>

            <button 
              className="btn-counter" 
              onClick={() => setRoundsCount(prev => Math.min(20, prev + 1))}
            >
              <Plus size={24} />
            </button>
          </div>

          <p className="rounds-help-info">
            Tiempo estimado: ~{roundsCount * players.length * 2} minutos de freestyle.
          </p>

          <button 
            className="btn-neon-teal w-100 mt-20"
            onClick={() => onNext('setup_deck', { players, roundsCount })}
          >
            <span>SIGUIENTE: PALETA</span>
          </button>
        </div>
      )}

      {/* ── SETUP DECK & SPIN WHEEL ─────────────────────────────────────── */}
      {step === 'setup_deck' && (
        <div className="setup-card glass-panel glow-teal fade-in">
          <h2 className="font-graffiti text-glow-teal text-center mb-10">PALETA DE JUEGO</h2>
          <p className="step-sub text-center">Selecciona qué desafíos se incluirán en el mazo.</p>

          <div className="categories-grid scrollable-container">
            {categoriesList.map((cat) => (
              <div 
                key={cat.id} 
                className={`category-item-card ${selectedCategories.includes(cat.id) ? 'active' : ''}`}
                onClick={() => toggleCategory(cat.id)}
              >
                <div className="checkbox-indicator">
                  {selectedCategories.includes(cat.id) && <Check size={12} />}
                </div>
                <div className="category-card-info">
                  <h4>{cat.label}</h4>
                  <p>{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sorteo de Quién Empieza */}
          <div className="roulette-box glass-panel">
            <h3>🎰 ¿QUIÉN EMPIEZA EL JUEGO?</h3>
            
            <div className="roulette-display">
              {isSpinning ? (
                <span className="roulette-name spinning">{players[spinIndex]}</span>
              ) : startingPlayer ? (
                <div className="winner-announcement scale-up">
                  <span className="winner-name pink-text">{startingPlayer}</span>
                  <span className="winner-tag">¡Rima primero!</span>
                </div>
              ) : (
                <span className="roulette-placeholder">Sin sortear</span>
              )}
            </div>

            <button 
              className="btn-sortear"
              onClick={startSpinWheel}
              disabled={isSpinning}
            >
              <RefreshCw size={14} className={isSpinning ? 'spin' : ''} />
              <span>{startingPlayer ? 'SORTEAR OTRA VEZ' : 'REALIZAR SORTEO'}</span>
            </button>
          </div>

          <button 
            className="btn-neon-pink w-100 mt-20 pulse-pink-anim"
            onClick={() => {
              const finalStartingPlayer = players.includes(startingPlayer) ? startingPlayer : players[0];
              onNext('game', {
                mode: 'multiplayer',
                players,
                roundsCount,
                selectedCategories,
                startingPlayer: finalStartingPlayer
              });
            }}
            disabled={isSpinning}
          >
            <span>INICIAR COMBATE</span>
          </button>
        </div>
      )}
    </div>
  );
};
