import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { ResultsPage } from './pages/ResultsPage';
import { VerifyPage } from './pages/VerifyPage';
import { AboutPage } from './pages/AboutPage';
import { DevMintPage } from './pages/DevMintPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminPage } from './pages/AdminPage';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/dev-mint" element={<DevMintPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  );
}

export default App;
