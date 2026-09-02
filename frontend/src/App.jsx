import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './utils/api';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Rooms from './pages/Rooms';
import RoomChat from './pages/RoomChat';
import DirectMessages from './pages/DirectMessages';
import DMChat from './pages/DMChat';
import Profile from './pages/Profile';
import Shop from './pages/Shop';
import AdminPanel from './pages/AdminPanel';
import LiveLobby from './pages/LiveLobby';
import LiveStream from './pages/LiveStream';
import HelpDesk from './pages/HelpDesk';
import Calls from './pages/Calls';

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
};

// Public Route Wrapper (redirects to home if already logged in)
const PublicRoute = ({ children }) => {
  const token = getToken();
  return !token ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />

        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rooms" 
          element={
            <ProtectedRoute>
              <Rooms />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat/room/:roomId" 
          element={
            <ProtectedRoute>
              <RoomChat />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chats" 
          element={
            <ProtectedRoute>
              <DirectMessages />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat/dm/:otherUserId" 
          element={
            <ProtectedRoute>
              <DMChat />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/shop" 
          element={
            <ProtectedRoute>
              <Shop />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/live" 
          element={
            <ProtectedRoute>
              <LiveLobby />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/live/stream/:hostId" 
          element={
            <ProtectedRoute>
              <LiveStream />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calls" 
          element={
            <ProtectedRoute>
              <Calls />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/help" 
          element={
            <ProtectedRoute>
              <HelpDesk />
            </ProtectedRoute>
          } 
        />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
