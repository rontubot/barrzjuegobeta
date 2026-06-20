import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, Volume2, VolumeX, SkipForward, SkipBack } from 'lucide-react';
import './MenuAudioPlayer.css';

interface MenuAudioPlayerProps {
  gameState: string;
}

interface Track {
  id: string;
  name: string;
  url: string;
}

const SOUNDTRACKS: Track[] = [
  { id: 'track-1', name: 'Back - Ruida 86', url: '/soundtracks/back.mpeg' },
  { id: 'track-2', name: 'Desconocidos - Citrico 93', url: '/soundtracks/desconocidos.mpeg' },
  { id: 'track-3', name: 'Electric-Try 3', url: '/soundtracks/electric-try 3.mp3.mpeg' },
  { id: 'track-4', name: 'Ovni 2', url: '/soundtracks/ovni 2.mp3.mpeg' }
];

export const MenuAudioPlayer: React.FC<MenuAudioPlayerProps> = ({ gameState }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(() => 
    Math.floor(Math.random() * SOUNDTRACKS.length)
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.5); // Volumen por defecto: 50%
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<any>(null);
  const bannerTimeoutRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevGameStateRef = useRef<string>(gameState);
  
  const currentTrack = SOUNDTRACKS[currentTrackIndex];

  // 1. Inicializar y manejar cambios de pista
  useEffect(() => {
    // Si ya existe un audio, lo pausamos
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(currentTrack.url);
    audio.loop = false;
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    // Al finalizar la pista, reproducir otra aleatoriamente
    audio.onended = () => {
      playNextRandom();
    };

    // Intentar reproducir respetando políticas de navegador
    if (isPlaying && gameState !== 'game') {
      attemptPlay();
    }

    // Mostrar banner deslizante estilo FIFA
    triggerBanner();

    return () => {
      audio.pause();
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [currentTrackIndex]);

  // Mostrar el banner de canción por unos segundos
  const triggerBanner = () => {
    setShowBanner(true);
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = setTimeout(() => {
      setShowBanner(false);
    }, 4500); // Se oculta tras 4.5 segundos
  };

  // Intentar reproducir, con bypass de autoplay si es bloqueado
  const attemptPlay = () => {
    if (!audioRef.current) return;

    audioRef.current.play().catch(() => {
      console.log("Autoplay bloqueado temporalmente por el navegador. Esperando interacción.");
      
      // Listener para desbloquear audio tras la primera interacción
      const unlockAudio = () => {
        if (audioRef.current && isPlaying && gameState !== 'game') {
          audioRef.current.play().catch(e => console.log("Error al desbloquear audio:", e));
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    });
  };

  // 2. Controlar volumen y silencio
  useEffect(() => {
    if (audioRef.current) {
      // Solo actualizamos volumen de forma directa si no hay un fade-out/fade-in activo
      // que tome control del volumen
      if (!fadeIntervalRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
      }
    }
  }, [volume, isMuted]);

  // 3. Manejar transiciones de estados (Menú vs Gameplay)
  useEffect(() => {
    const prevGameState = prevGameStateRef.current;
    prevGameStateRef.current = gameState;

    if (prevGameState === gameState) return;
    if (!audioRef.current) return;

    // Solo hacemos fade out si pasamos de cualquier menú al combate ('game')
    if (gameState === 'game' && prevGameState !== 'game') {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }

      // --- FADE OUT (Transición hacia la partida) ---
      const startVol = audioRef.current.volume;
      let curVol = startVol;
      const steps = 30; // 30 pasos
      const stepTime = 50; // Cada 50ms -> 1.5 segundos total
      const volDelta = startVol / steps;

      fadeIntervalRef.current = setInterval(() => {
        curVol = Math.max(0, curVol - volDelta);
        if (audioRef.current) {
          audioRef.current.volume = curVol;
        }

        if (curVol <= 0) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          if (audioRef.current) {
            audioRef.current.pause();
          }
        }
      }, stepTime);
    }
    // Solo hacemos fade in si pasamos del combate ('game') a cualquier menú
    else if (gameState !== 'game' && prevGameState === 'game') {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }

      // --- FADE IN (Regreso al Menú) ---
      if (isPlaying) {
        audioRef.current.volume = 0;
        audioRef.current.play().catch((err) => {
          console.log("No se pudo auto-reproducir al volver al menú:", err);
        });

        const targetVol = isMuted ? 0 : volume;
        let curVol = 0;
        const steps = 30;
        const stepTime = 50; // 1.5 segundos total
        const volDelta = targetVol / steps;

        fadeIntervalRef.current = setInterval(() => {
          curVol = Math.min(targetVol, curVol + volDelta);
          if (audioRef.current) {
            audioRef.current.volume = curVol;
          }

          if (curVol >= targetVol) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
            if (audioRef.current) {
              audioRef.current.volume = targetVol;
            }
          }
        }, stepTime);
      }
    }

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, [gameState, isPlaying, volume, isMuted]);

  // Selección de siguiente pista (aleatoria sin repetir la actual inmediatamente)
  const playNextRandom = () => {
    let nextIndex = currentTrackIndex;
    if (SOUNDTRACKS.length > 1) {
      while (nextIndex === currentTrackIndex) {
        nextIndex = Math.floor(Math.random() * SOUNDTRACKS.length);
      }
    } else {
      nextIndex = 0;
    }
    
    // Si estaba pausado, reactivar reproducción al cambiar de tema
    setIsPlaying(true);
    setCurrentTrackIndex(nextIndex);
  };

  // Selección de pista anterior (aleatoria para mantener la experiencia de FIFA)
  const playPrevRandom = () => {
    let prevIndex = currentTrackIndex;
    if (SOUNDTRACKS.length > 1) {
      while (prevIndex === currentTrackIndex) {
        prevIndex = Math.floor(Math.random() * SOUNDTRACKS.length);
      }
    } else {
      prevIndex = 0;
    }
    setIsPlaying(true);
    setCurrentTrackIndex(prevIndex);
  };

  // Toggle Play / Pausa
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    // Cancelar cualquier fade activo para que responda instantáneamente
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    if (isPlaying) {
      // --- FADE OUT AL PAUSAR ---
      const startVol = audioRef.current.volume;
      let curVol = startVol;
      const steps = 15;
      const stepTime = 25; // 375ms en total para un fade suave de pausa
      const volDelta = startVol / steps;

      fadeIntervalRef.current = setInterval(() => {
        curVol = Math.max(0, curVol - volDelta);
        if (audioRef.current) {
          audioRef.current.volume = curVol;
        }

        if (curVol <= 0) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setIsPlaying(false);
        }
      }, stepTime);
    } else {
      // --- FADE IN AL REPRODUCIR ---
      audioRef.current.volume = 0;
      audioRef.current.play().catch(e => console.log(e));
      setIsPlaying(true);
      triggerBanner(); // Al darle play, volvemos a mostrar qué está sonando

      const targetVol = isMuted ? 0 : volume;
      let curVol = 0;
      const steps = 15;
      const stepTime = 25; // 375ms en total para un fade suave de reproducción
      const volDelta = targetVol / steps;

      fadeIntervalRef.current = setInterval(() => {
        curVol = Math.min(targetVol, curVol + volDelta);
        if (audioRef.current) {
          audioRef.current.volume = curVol;
        }

        if (curVol >= targetVol) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          if (audioRef.current) {
            audioRef.current.volume = targetVol;
          }
        }
      }, stepTime);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    // Si hay fade activo, lo limpiamos
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.volume = nextMute ? 0 : volume;
    }
  };

  // Cambio manual del deslizador de volumen
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  // Cerrar el panel al hacer clic fuera del contenedor (para touch / mouse click)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPanelOpen]);

  const isGame = gameState === 'game';

  return (
    <div className="menu-audio-container">
      {/* 1. NOTIFICACIÓN DE CANCIÓN - ESTILO FIFA (Abajo Izquierda) */}
      <div className={`song-banner-overlay ${showBanner && !isGame ? 'visible' : ''} ${isGame ? 'game-faded' : ''}`}>
        <div className="song-banner-icon">
          <Music size={20} />
        </div>
        <div className="song-banner-info">
          <span className="song-banner-tag">Soundtrack</span>
          <span className="song-banner-title">{currentTrack.name}</span>
        </div>
      </div>

      {/* 2. REPRODUCTOR / CONTROLES DE AUDIO (Abajo Derecha) */}
      <div className={`music-controls-wrapper ${isGame ? 'game-faded' : ''}`} ref={containerRef}>
        {/* Panel Flotante Suplementario (Abierto al hacer click / touch) */}
        <div className={`music-controls-panel ${isPanelOpen && !isGame ? 'open' : ''}`}>
          <div className="music-panel-track-title">{currentTrack.name}</div>
          
          <div className="music-panel-actions">
            {/* Botón Atrás */}
            <button 
              type="button" 
              className="music-ctrl-btn" 
              onClick={playPrevRandom}
              title="Pista anterior"
              disabled={isGame}
            >
              <SkipBack size={18} fill="currentColor" />
            </button>

            {/* Botón Play / Pausa */}
            <button 
              type="button" 
              className="music-ctrl-btn play-pause" 
              onClick={togglePlayPause}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
              disabled={isGame}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>

            {/* Botón Siguiente */}
            <button 
              type="button" 
              className="music-ctrl-btn" 
              onClick={playNextRandom}
              title="Siguiente pista"
              disabled={isGame}
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
          </div>

          {/* Control Deslizante de Volumen */}
          <div className="volume-control-section">
            <button 
              type="button" 
              className="btn-mute-toggle" 
              onClick={toggleMute}
              title={isMuted ? 'Desmutear' : 'Mutear'}
              disabled={isGame}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            
            <input
              type="range"
              className="volume-slider"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              title="Ajustar volumen"
              disabled={isGame}
            />
          </div>
        </div>

        {/* Botón Circular Principal */}
        <button 
          type="button" 
          className={`btn-music-trigger ${isMuted || volume === 0 ? 'muted' : ''} ${isPanelOpen && !isGame ? 'active' : ''}`}
          onClick={() => {
            if (!isGame) {
              setIsPanelOpen(!isPanelOpen);
            }
          }}
          title="Configuración de Música"
          disabled={isGame}
        >
          {isPlaying && !isGame && !isMuted && volume > 0 ? (
            <Music size={20} className="pulse-music" />
          ) : (
            <VolumeX size={20} />
          )}
        </button>
      </div>
    </div>
  );
};
