import React, { useState } from 'react';
import Layout from './components/Layout';
import PinyinChart from './modules/PinyinChart';
import Vocabulary from './modules/Vocabulary';
import SentenceBuilder from './modules/SentenceBuilder';

function App() {
  const [activeTab, setActiveTab] = useState('pinyin');

  const renderContent = () => {
    switch (activeTab) {
      case 'pinyin':
        return <PinyinChart />;
      case 'vocab':
        return <Vocabulary />;
      case 'sentences':
        return <SentenceBuilder />;
      default:
        return <PinyinChart />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
