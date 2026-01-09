import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Synthesis from './pages/Synthesis';
import Goldens from './pages/Goldens';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">SoFi-QA</div>
          <div className="sidebar-subtitle">Synthetic QA Generator</div>

          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📊</span>
              Dashboard
            </NavLink>
            <NavLink to="/documents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📄</span>
              Documents
            </NavLink>
            <NavLink to="/synthesis" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">⚡</span>
              Synthesis
            </NavLink>
            <NavLink to="/goldens" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">💎</span>
              Goldens
            </NavLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/synthesis" element={<Synthesis />} />
            <Route path="/goldens" element={<Goldens />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
