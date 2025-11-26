import React, { useState, useEffect } from 'react';
import { sentenceData } from '../data/sentenceData';

const SentenceBuilder = () => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState([]);
  const [availableWords, setAvailableWords] = useState([]);
  const [status, setStatus] = useState('playing'); // playing, correct, incorrect

  const currentSentence = sentenceData[currentSentenceIndex];

  useEffect(() => {
    // Shuffle words initially
    const shuffled = [...currentSentence.words].sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setSelectedWords([]);
    setStatus('playing');
  }, [currentSentenceIndex]);

  const handleWordClick = (word) => {
    if (status !== 'playing') return;

    // Move from available to selected
    setAvailableWords(prev => prev.filter(w => w.id !== word.id));
    setSelectedWords(prev => [...prev, word]);
  };

  const handleSelectedWordClick = (word) => {
    if (status !== 'playing') return;

    // Move back to available
    setSelectedWords(prev => prev.filter(w => w.id !== word.id));
    setAvailableWords(prev => [...prev, word]);
  };

  const checkAnswer = () => {
    const currentOrder = selectedWords.map(w => w.text);
    const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(currentSentence.correctOrder);

    if (isCorrect) {
      setStatus('correct');
      const audio = new SpeechSynthesisUtterance("Correct!");
      window.speechSynthesis.speak(audio);
    } else {
      setStatus('incorrect');
      const audio = new SpeechSynthesisUtterance("Try again.");
      window.speechSynthesis.speak(audio);
      setTimeout(() => setStatus('playing'), 1500);
    }
  };

  const nextSentence = () => {
    if (currentSentenceIndex < sentenceData.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
    } else {
      // Loop back or finish
      setCurrentSentenceIndex(0);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="section-title">Sentence Structure</h2>

      <div className="sentence-container">
        <div className="prompt-box">
          <h3>Translate this sentence:</h3>
          <p className="english-text">"{currentSentence.english}"</p>
        </div>

        <div className="construction-area">
          <div className="selected-words-area">
            {selectedWords.length === 0 && <span className="placeholder">Tap words to build sentence...</span>}
            {selectedWords.map(word => (
              <button
                key={word.id}
                className="word-chip selected"
                onClick={() => handleSelectedWordClick(word)}
              >
                {word.text}
              </button>
            ))}
          </div>
        </div>

        <div className="word-bank">
          {availableWords.map(word => (
            <button
              key={word.id}
              className="word-chip"
              onClick={() => handleWordClick(word)}
            >
              {word.text}
            </button>
          ))}
        </div>

        <div className="controls">
          <div className="nav-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <button
              className="nav-btn"
              onClick={() => setCurrentSentenceIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSentenceIndex === 0}
            >
              ⬅️ Prev
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>
              {currentSentenceIndex + 1} / {sentenceData.length}
            </span>
            <button
              className="nav-btn"
              onClick={() => setCurrentSentenceIndex(prev => Math.min(sentenceData.length - 1, prev + 1))}
              disabled={currentSentenceIndex === sentenceData.length - 1}
            >
              Next ➡️
            </button>
          </div>

          {status === 'correct' ? (
            <button className="action-btn next" onClick={nextSentence}>Next Sentence ➡️</button>
          ) : (
            <button
              className="action-btn check"
              onClick={checkAnswer}
              disabled={availableWords.length > 0}
            >
              Check Answer
            </button>
          )}
        </div>

        {status === 'correct' && (
          <div className="feedback success animate-fade-in">
            <p>🎉 Correct! {currentSentence.pinyin}</p>
          </div>
        )}
        {status === 'incorrect' && (
          <div className="feedback error animate-fade-in">
            <p>❌ Try again!</p>
          </div>
        )}
      </div>

      <style>{`
        .sentence-container {
          max-width: 800px;
          margin: 0 auto;
          background: var(--bg-secondary);
          padding: 2rem;
          border-radius: 20px;
          border: 1px solid var(--border-color);
        }
        .prompt-box {
          text-align: center;
          margin-bottom: 2rem;
        }
        .english-text {
          font-size: 1.5rem;
          color: var(--accent-primary);
          margin-top: 0.5rem;
        }
        .construction-area {
          min-height: 80px;
          background: var(--bg-primary);
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .selected-words-area {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
        }
        .placeholder {
          color: var(--text-secondary);
          font-style: italic;
        }
        .word-bank {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 2rem;
          min-height: 60px;
        }
        .word-chip {
          background: var(--bg-card);
          border: 1px solid var(--accent-tertiary);
          color: var(--text-primary);
          padding: 0.8rem 1.5rem;
          border-radius: 50px;
          font-size: 1.2rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .word-chip:hover {
          transform: translateY(-2px);
          background: var(--accent-tertiary);
          color: var(--bg-primary);
        }
        .word-chip.selected {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: var(--bg-primary);
        }
        .controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .nav-btn {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .nav-btn:not(:disabled):hover {
          background: var(--bg-secondary);
          border-color: var(--accent-primary);
        }
        .action-btn {
          padding: 1rem 3rem;
          font-size: 1.2rem;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }
        .action-btn.check {
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
          color: white;
        }
        .action-btn.check:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .action-btn.next {
          background: #4caf50;
          color: white;
        }
        .feedback {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 1.2rem;
          padding: 1rem;
          border-radius: 8px;
        }
        .feedback.success {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
          border: 1px solid #4caf50;
        }
        .feedback.error {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
          border: 1px solid #f44336;
        }
      `}</style>
    </div>
  );
};

export default SentenceBuilder;
