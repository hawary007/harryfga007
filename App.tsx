
import React, { useState } from 'react';
import Chat from './components/Chat';
import Login from './components/Login';
import SignUp from './components/SignUp';
import { View } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<View>('login');

  const handleNavigate = (newView: View) => {
    setView(newView);
  };

  const handleAuthSuccess = () => {
    setView('app');
  };

  if (view === 'login') {
    return <Login onNavigate={handleNavigate} onLoginSuccess={handleAuthSuccess} />;
  }

  if (view === 'signup') {
    return <SignUp onNavigate={handleNavigate} onSignUpSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-100 flex flex-col font-sans antialiased">
      <header className="bg-gray-800/70 backdrop-blur-sm border-b border-gray-700/50 p-4 shadow-lg z-20 flex items-center justify-center">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
          FGA Omni-Assistant Command Center
        </h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <Chat />
      </main>
    </div>
  );
};

export default App;
