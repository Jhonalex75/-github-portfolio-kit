import React from 'react';

const Layout = ({ children, activeTab, setActiveTab }) => {
    return (
        <div className="app-container">
            <nav className="navbar">
                <div className="logo">
                    <span className="logo-icon">⚙️</span>
                    <span className="logo-text">MechChinese</span>
                </div>
                <div className="nav-links">
                    <button
                        className={`nav-item ${activeTab === 'pinyin' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pinyin')}
                    >
                        Pinyin
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'vocab' ? 'active' : ''}`}
                        onClick={() => setActiveTab('vocab')}
                    >
                        Vocabulary
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'sentences' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sentences')}
                    >
                        Sentences
                    </button>
                </div>
            </nav>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
