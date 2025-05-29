import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ChatPage } from './pages/ChatPage'; // Import ChatPage

function App() {
  return (
    <Router>
      <div className="font-sans h-full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/chat" element={<ChatPage />} /> {/* Add ChatPage route */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;