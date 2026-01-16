import { useState, useCallback, useEffect, useRef } from 'react';
import DropZone from './components/DropZone';
import DepthParallax from './components/DepthParallax';
import ProcessingImage from './components/ProcessingImage';
import { generateDepthMap } from './api/openai';
import { exportGif, exportMp4 } from './utils/export';
import './App.css';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const LOADING_MESSAGES = [
  "Loading...",
  "Don't close the tab...",
  "Almost done...",
  "1/74 Done",
  "Waiting on API...",
  "Still loading...",
  "Processing image...",
  "Generating depth..."
];

function WaveTitle() {
  const letters = "WIGGLE".split('');

  return (
    <h1 className="wave-title">
      {letters.map((letter, i) => (
        <span
          key={i}
          className="wave-letter"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {letter}
        </span>
      ))}
    </h1>
  );
}

function App() {
  const [step, setStep] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [depthMap, setDepthMap] = useState(null);
  const [speed, setSpeed] = useState(3);
  const [error, setError] = useState(null);
  const [exportingGif, setExportingGif] = useState(false);
  const [exportingMp4, setExportingMp4] = useState(false);
  const [canvasRef, setCanvasRef] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [showDepthMap, setShowDepthMap] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const dropZoneRef = useRef(null);

  // Rotate loading messages
  useEffect(() => {
    if (step !== 'processing') return;

    const shuffled = [...LOADING_MESSAGES].sort(() => Math.random() - 0.5);
    let index = 0;

    setLoadingMessage(shuffled[0]);

    const interval = setInterval(() => {
      index = (index + 1) % shuffled.length;
      setLoadingMessage(shuffled[index]);
    }, 3000);

    return () => clearInterval(interval);
  }, [step]);

  const handleImageSelect = useCallback((file) => {
    setImageFile(file);
    setHasImage(!!file);
    setError(null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setOriginalImage(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setOriginalImage(null);
    }
  }, []);

  // Global drop handler
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      document.body.classList.add('dragging-global');
    };

    const handleDragLeave = (e) => {
      if (e.relatedTarget === null) {
        document.body.classList.remove('dragging-global');
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      document.body.classList.remove('dragging-global');

      if (step !== 'upload') return;

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          handleImageSelect(file);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [step, handleImageSelect]);

  const handleGenerate = async () => {
    if (!imageFile) {
      setError('Please provide an image');
      return;
    }

    if (!API_KEY || API_KEY === 'your-api-key-here') {
      setError('Please set VITE_OPENAI_API_KEY in .env file');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const depth = await generateDepthMap(imageFile, API_KEY);
      setDepthMap(depth);
      setStep('wiggle');
    } catch (err) {
      setError(err.message);
      setStep('upload');
    }
  };

  const handleExportGif = async () => {
    if (!canvasRef) return;
    setExportingGif(true);
    try {
      await exportGif(canvasRef, 3, 20);
    } catch (err) {
      setError(err.message);
    }
    setExportingGif(false);
  };

  const handleExportMp4 = async () => {
    if (!canvasRef) return;
    setExportingMp4(true);
    try {
      await exportMp4(canvasRef, 3, 30);
    } catch (err) {
      setError(err.message);
    }
    setExportingMp4(false);
  };

  const handleReset = () => {
    setStep('upload');
    setImageFile(null);
    setOriginalImage(null);
    setDepthMap(null);
    setError(null);
    setHasImage(false);
    setShowDepthMap(false);
  };

  // Fixed strength doubled (0.1), speed slider controls multiplier
  const strength = 0.1;
  const speedMultiplier = 0.5 + ((speed - 1) / 4) * 2;

  return (
    <div className="app">
      {step === 'upload' && (
        <>
          <header className={hasImage ? 'hidden' : ''}>
            <WaveTitle />
          </header>

          <main>
            <div className="upload-section">
              <DropZone
                ref={dropZoneRef}
                onImageSelect={handleImageSelect}
                previewImage={originalImage}
              />

              {imageFile && (
                <button
                  onClick={handleGenerate}
                  className="generate-btn"
                >
                  generate depth map
                </button>
              )}
            </div>
          </main>
        </>
      )}

      {step === 'processing' && (
        <main>
          <div className="processing-section">
            <div className="processing-image-container">
              <ProcessingImage src={originalImage} />
            </div>
            <p className="processing-text">{loadingMessage}</p>
          </div>
        </main>
      )}

      {step === 'wiggle' && (
        <main>
          <div className="wiggle-section">
            <div className="canvas-wrapper">
              {showDepthMap ? (
                <img src={depthMap} alt="Depth Map" className="depth-map-preview" />
              ) : (
                <DepthParallax
                  colorUrl={originalImage}
                  depthUrl={depthMap}
                  strength={strength}
                  speed={speedMultiplier}
                  canvasRef={setCanvasRef}
                />
              )}
            </div>

            <div className="wiggle-controls">
              <div className="slider-row">
                <span className="slider-label">speed</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
                <span className="slider-value">{speed}</span>
              </div>

              <div className="export-buttons">
                <button onClick={handleExportGif} disabled={exportingGif || exportingMp4 || showDepthMap}>
                  gif
                  {exportingGif && <span className="btn-spinner" />}
                </button>
                <button onClick={handleExportMp4} disabled={exportingGif || exportingMp4 || showDepthMap}>
                  video
                  {exportingMp4 && <span className="btn-spinner" />}
                </button>
              </div>

              <div className="bottom-row">
                <button onClick={handleReset} className="reset-btn">
                  ← new image
                </button>
                <button
                  onClick={() => setShowDepthMap(!showDepthMap)}
                  className="depth-toggle"
                >
                  {showDepthMap ? 'show parallax' : 'show depth'}
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default App;
