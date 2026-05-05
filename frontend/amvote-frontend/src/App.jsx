import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;