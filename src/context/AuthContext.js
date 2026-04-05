import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  clearAuth,
  getStoredToken,
  getStoredUser,
  login as loginApi,
  storeAuth,
  validateToken,
} from '../services/api';
import { getPermissionsForRole } from '../utils/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());
  const [permissions, setPermissions] = useState([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const isAuthenticated = Boolean(token);

  // Dohvaća ulogu iz korisnikovih podataka
  const getUserRole = (userData) => {
    if (!userData) return null;
    // Provjeravamo različite moguće lokacije uloge
    return (
      userData.role || 
      (Array.isArray(userData.roles) && userData.roles[0]) ||
      userData.user_role ||
      null
    );
  };

  // Ažurira dozvole bazene na ulozi
  const updatePermissions = useCallback((userData) => {
    const role = getUserRole(userData);
    const userPermissions = getPermissionsForRole(role);
    setPermissions(userPermissions);
    console.log('User role:', role, 'Permissions:', userPermissions);
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await loginApi(username, password);

    if (!response?.token) {
      throw new Error('Login nije uspio. Provjerite korisničke podatke.');
    }

    storeAuth(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
    updatePermissions(response.user);
  }, [updatePermissions]);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
    setPermissions([]);
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setToken(null);
        setUser(null);
        setPermissions([]);
        setIsCheckingAuth(false);
        return;
      }

      const isValid = await validateToken(storedToken);
      if (!isValid) {
        setToken(null);
        setUser(null);
        setPermissions([]);
      } else {
        const storedUser = getStoredUser();
        setToken(storedToken);
        setUser(storedUser);
        updatePermissions(storedUser);
      }
      setIsCheckingAuth(false);
    };

    const handleAuthInvalid = () => {
      setToken(null);
      setUser(null);
      setPermissions([]);
      setIsCheckingAuth(false);
    };

    bootstrapAuth();
    window.addEventListener('bakovicapp:auth-invalid', handleAuthInvalid);
    return () => window.removeEventListener('bakovicapp:auth-invalid', handleAuthInvalid);
  }, [updatePermissions]);

  const value = useMemo(
    () => ({
      token,
      user,
      permissions,
      isAuthenticated,
      isCheckingAuth,
      login,
      logout,
    }),
    [token, user, permissions, isAuthenticated, isCheckingAuth, login, logout]
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
