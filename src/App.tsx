import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import VoiceAssistant from './pages/VoiceAssistant';
import LocationPage from './pages/Location';
import ReadTextPage from './pages/ReadText';
import VisionPage from './pages/Vision';
import RoadAssistancePage from './pages/RoadAssistance';
import EmergencyPage from './pages/Emergency';
import SettingsPage from './pages/Settings';
import './App.css';

// Root redirect handler: checks authentication
const RootRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // Requirement 6: "The FIRST screen must be LOGIN. IF AUTHENTICATED: automatically open dashboard. IF NOT AUTHENTICATED: show login page"
  return isAuthenticated ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AccessibilityProvider>
          <Routes>
            {/* Root route redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Application Routes */}
            <Route path="/app" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="voice" element={<VoiceAssistant />} />
              <Route path="location" element={<LocationPage />} />
              <Route path="read-text" element={<ReadTextPage />} />
              <Route path="vision" element={<VisionPage />} />
              <Route path="road" element={<RoadAssistancePage />} />
              <Route path="emergency" element={<EmergencyPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AccessibilityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
