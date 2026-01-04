import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// PAGES IMPORTS
import AuthPage from './AuthPage';
import ClientDashboard from './ClientDashboard';
import WorkerDashboard from './WorkerDashboard';

function App() {
  return (
    <BrowserRouter>
      {/* ToastContainer එක හැම පිටුවකටම පෙනෙන්න උඩින්ම දානවා */}
      <ToastContainer position="top-right" autoClose={3000} />
      
      <Routes>
        {/* ප්‍රධාන පිටුව (Login/Register) */}
        <Route path="/" element={<AuthPage />} />
        
        {/* ඇතුල් වූ පසු යන පිටු */}
        <Route path="/client-dashboard" element={<ClientDashboard />} />
        <Route path="/worker-dashboard" element={<WorkerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;