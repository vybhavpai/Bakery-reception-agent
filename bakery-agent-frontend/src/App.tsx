import { useState } from 'react';
import AdminView from './views/AdminView';
import SalesmanView from './views/SalesmanView';
import './App.css';

function App() {
  const [view, setView] = useState<'admin' | 'salesman'>('admin');

  return (
    <div className="app">
      <nav className="app-nav">
        <button
          onClick={() => setView('admin')}
          className={view === 'admin' ? 'active' : 'inactive'}
        >
          Admin
        </button>
        <button
          onClick={() => setView('salesman')}
          className={view === 'salesman' ? 'active' : 'inactive'}
        >
          Salesman
        </button>
      </nav>
      <main>
        <div className={view === 'admin' ? 'view-visible' : 'view-hidden'}>
          <AdminView />
        </div>
        <div className={view === 'salesman' ? 'view-visible' : 'view-hidden'}>
          <SalesmanView />
        </div>
      </main>
    </div>
  );
}

export default App;
