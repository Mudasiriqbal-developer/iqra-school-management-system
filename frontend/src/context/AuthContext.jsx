import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hydrate state on mount from localStorage
    const storedToken = localStorage.getItem('ihass_token');
    const storedUser = localStorage.getItem('ihass_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        // Clear corrupted stored items
        localStorage.removeItem('ihass_token');
        localStorage.removeItem('ihass_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: userToken } = response.data.data;

      localStorage.setItem('ihass_token', userToken);
      localStorage.setItem('ihass_user', JSON.stringify(userData));

      setToken(userToken);
      setUser(userData);

      return userData;
    } catch (error) {
      throw error;
    }
  };

  const register = async (formData) => {
    try {
      const response = await api.post('/auth/register', formData);
      const { user: userData, token: userToken } = response.data.data;

      localStorage.setItem('ihass_token', userToken);
      localStorage.setItem('ihass_user', JSON.stringify(userData));

      setToken(userToken);
      setUser(userData);

      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('ihass_token');
    localStorage.removeItem('ihass_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
