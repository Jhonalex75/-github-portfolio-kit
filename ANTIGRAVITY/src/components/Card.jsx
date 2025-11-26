import React from 'react';

const Card = ({ item, playSound }) => {
    return (
        <div className="card" onClick={() => playSound(item.hanzi)}>
            <div className="card-content">
                <div className="hanzi">{item.hanzi}</div>
                <div className="pinyin">{item.pinyin}</div>
                <div className="english">{item.english}</div>
                <div className="category-tag">{item.category}</div>
            </div>
            <div className="card-footer">
                <span className="audio-icon">🔊</span>
            </div>

            <style>{`
        .card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .card:hover {
          transform: translateY(-10px);
          box-shadow: var(--shadow-glow);
          border-color: var(--accent-primary);
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .card:hover::before {
          opacity: 1;
        }
        .hanzi {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        .pinyin {
          font-size: 1.2rem;
          color: var(--accent-primary);
          margin-bottom: 0.5rem;
        }
        .english {
          font-size: 1rem;
          color: var(--text-secondary);
        }
        .category-tag {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-size: 0.8rem;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
        }
        .card-footer {
          margin-top: 1rem;
          display: flex;
          justify-content: flex-end;
        }
        .audio-icon {
          opacity: 0.5;
          transition: opacity 0.2s;
        }
        .card:hover .audio-icon {
          opacity: 1;
        }
      `}</style>
        </div>
    );
};

export default Card;
