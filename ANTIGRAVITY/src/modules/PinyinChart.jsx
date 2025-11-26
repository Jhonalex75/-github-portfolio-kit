import React from 'react';

const initials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'];
const finals = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong'];

const PinyinChart = () => {
    const playSound = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="animate-fade-in">
            <h2 className="section-title">Interactive Pinyin Chart</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Click on any initial or final to hear the pronunciation.
            </p>

            <div className="pinyin-section">
                <h3 style={{ color: 'var(--accent-tertiary)', marginBottom: '1rem' }}>Initials (Shengmu)</h3>
                <div className="pinyin-grid">
                    {initials.map((item) => (
                        <button
                            key={item}
                            className="pinyin-cell"
                            onClick={() => playSound(item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pinyin-section" style={{ marginTop: '2rem' }}>
                <h3 style={{ color: 'var(--accent-tertiary)', marginBottom: '1rem' }}>Finals (Yunmu)</h3>
                <div className="pinyin-grid">
                    {finals.map((item) => (
                        <button
                            key={item}
                            className="pinyin-cell"
                            onClick={() => playSound(item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            <style>{`
        .pinyin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
          gap: 1rem;
        }
        .pinyin-cell {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 1rem;
          border-radius: 12px;
          font-size: 1.2rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pinyin-cell:hover {
          background: var(--accent-primary);
          color: var(--bg-primary);
          transform: translateY(-5px);
          box-shadow: var(--shadow-glow);
        }
        .pinyin-cell:active {
          transform: scale(0.95);
        }
      `}</style>
        </div>
    );
};

export default PinyinChart;
