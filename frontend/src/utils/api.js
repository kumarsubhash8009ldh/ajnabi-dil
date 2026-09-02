import { io } from 'socket.io-client';

export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('chitchat_custom_api');
    if (custom) return custom;

    // Check Vite production environment variable
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    }

    const host = window.location.hostname;
    // If accessed from a web browser on desktop/laptop
    if (host && host !== '' && !host.includes('androidplatform.net') && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `http://${host}:5000`;
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }
  // Default fallback (Environment variable or LAN IP for APK)
  return import.meta.env.VITE_API_URL || 'http://172.20.10.2:5000';
};

export const setCustomApiUrl = (url) => {
  if (url) {
    localStorage.setItem('chitchat_custom_api', url.trim());
  } else {
    localStorage.removeItem('chitchat_custom_api');
  }
};

let socket = null;

// Get stored JWT token
export const getToken = () => localStorage.getItem('chitchat_token');

// Get stored user profile
export const getStoredUser = () => {
  const user = localStorage.getItem('chitchat_user');
  return user ? JSON.parse(user) : null;
};

// Set local storage details
export const setSession = (token, user) => {
  localStorage.setItem('chitchat_token', token);
  localStorage.setItem('chitchat_user', JSON.stringify(user));
};

// Clear session
export const clearSession = () => {
  localStorage.removeItem('chitchat_token');
  localStorage.removeItem('chitchat_user');
  disconnectSocket();
};

// Fetch API helper
export const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    method,
    headers,
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  
  return data;
};

// Initialize Socket connection
export const initSocket = () => {
  const token = getToken();
  if (!token) return null;
  
  const baseUrl = getBaseUrl();
  if (!socket) {
    socket = io(baseUrl, {
      auth: {
        token
      }
    });
    
    socket.on('connect', () => {
      console.log('Connected to socket server');
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
  }
  
  return socket;
};

// Get active socket instance
export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
