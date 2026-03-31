import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuth,
  getStoredToken,
  getStoredUser,
  login as loginApi,
  storeAuth,
  validateToken,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const isAuthenticated = Boolean(token);

  const login = async (username, password) => {
    const response = await loginApi(username, password);

    if (!response?.token) {
      throw new Error('Login nije uspio. Provjerite korisničke podatke.');
    }

    storeAuth(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setToken(null);
        setUser(null);
        setIsCheckingAuth(false);
        return;
      }

      const isValid = await validateToken(storedToken);
      if (!isValid) {
        setToken(null);
        setUser(null);
      } else {
        setToken(storedToken);
        setUser(getStoredUser());
      }
      setIsCheckingAuth(false);
    };

    const handleAuthInvalid = () => {
      setToken(null);
      setUser(null);
      setIsCheckingAuth(false);
    };

    bootstrapAuth();
    window.addEventListener('bakovicapp:auth-invalid', handleAuthInvalid);
    return () => window.removeEventListener('bakovicapp:auth-invalid', handleAuthInvalid);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      isCheckingAuth,
      login,
      logout,
    }),
    [token, user, isAuthenticated, isCheckingAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth mora biti unutar AuthProvider.');
  }
  return context;
}
