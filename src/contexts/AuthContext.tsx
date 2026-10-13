import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { User, UserRole } from '../types';
import { DEFAULT_DEV_USER, DEFAULT_CANBO_USER, AUTH_STORAGE_KEY } from '../constants';

interface AuthContextValue {
  currentUser: User | null;
  isAdmin: boolean;
  login: (user: User) => void;
  logout: () => void;
  resetDevUser: () => void;
  switchRole: (role: UserRole) => User;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore localStorage write error
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setCurrentUser(null);
  }, []);

  const resetDevUser = useCallback(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEFAULT_DEV_USER));
    } catch {
      // Ignore
    }
    setCurrentUser(DEFAULT_DEV_USER);
  }, []);

  const switchRole = useCallback((targetRole: UserRole): User => {
    const roleKey = String(targetRole).toUpperCase();
    const nextUser = roleKey === 'ADMIN' ? DEFAULT_DEV_USER : DEFAULT_CANBO_USER;
    setCurrentUser(nextUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    } catch {
      // Ignore
    }
    return nextUser;
  }, []);

  const isAdmin = useMemo(() => {
    if (!currentUser?.email) return false;
    return currentUser.email.trim().toLowerCase() === 'toanhkhai12345@gmail.com';
  }, [currentUser]);

  const value = useMemo(
    () => ({
      currentUser,
      isAdmin,
      login,
      logout,
      resetDevUser,
      switchRole,
    }),
    [currentUser, isAdmin, login, logout, resetDevUser, switchRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
