import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { VerifyPage } from './pages/VerifyPage';
import { AboutPage } from './pages/AboutPage';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </div>
  );
}

export default App;
