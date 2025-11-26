import React, { useState } from 'react';
import { vocabData } from '../data/vocabData';
import Card from '../components/Card';

const Vocabulary = () => {
    const [filter, setFilter] = useState('All');

    const filteredData = filter === 'All'
        ? vocabData
        : vocabData.filter(item => item.category === filter);

    const playSound = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        window.speechSynthesis.speak(utterance);
    };

    console.log('VocabData:', vocabData);
    console.log('Filter:', filter);
    console.log('FilteredData:', filteredData);

    if (!vocabData || vocabData.length === 0) {
        return <div className="text-white p-4">Error: No vocabulary data found.</div>;
    }

    return (
        <div className="animate-fade-in">
            <h2 className="section-title">Vocabulary Builder</h2>

            <div className="filters">
                <button
                    className={`filter-btn ${filter === 'All' ? 'active' : ''}`}
                    onClick={() => setFilter('All')}
                >
                    All
                </button>
                <button
                    className={`filter-btn ${filter === 'Daily' ? 'active' : ''}`}
                    onClick={() => setFilter('Daily')}
                >
                    Daily Life
                </button>
                <button
                    className={`filter-btn ${filter === 'Engineering' ? 'active' : ''}`}
                    onClick={() => setFilter('Engineering')}
                >
                    Engineering
                </button>
                <button
                    className={`filter-btn ${filter === 'Tools' ? 'active' : ''}`}
                    onClick={() => setFilter('Tools')}
                >
                    Tools
                </button>
                <button
                    className={`filter-btn ${filter === 'Materials' ? 'active' : ''}`}
                    onClick={() => setFilter('Materials')}
                >
                    Materials
                </button>
                <button
                    className={`filter-btn ${filter === 'Verbs' ? 'active' : ''}`}
                    onClick={() => setFilter('Verbs')}
                >
                    Verbs
                </button>
            </div>

            <div className="card-grid">
                {filteredData.map(item => (
                    <Card key={item.id} item={item} playSound={playSound} />
                ))}
            </div>

            <style>{`
        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .filter-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 0.5rem 1.5rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .filter-btn:hover {
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }
        .filter-btn.active {
          background: var(--accent-primary);
          color: var(--bg-primary);
          border-color: var(--accent-primary);
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
        }
      `}</style>
        </div>
    );
};

export default Vocabulary;
