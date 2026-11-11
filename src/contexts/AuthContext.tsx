import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { User, UserRole } from '../types';
<<<<<<< HEAD
import { DEFAULT_DEV_USER, DEFAULT_CANBO_USER, AUTH_STORAGE_KEY, isAdminUser, isAdminEmail } from '../constants';
=======
import { DEFAULT_DEV_USER, DEFAULT_CANBO_USER, AUTH_STORAGE_KEY, isAdminEmail } from '../constants';
>>>>>>> origin/main
import { setAuthToken } from '../services/api';

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
      if (saved) {
        const user = JSON.parse(saved);
        if (user?.token) {
          setAuthToken(user.token);
        }
        if (user?.email && !isAdminEmail(user.email) && user.role === 'ADMIN') {
          user.role = 'USER';
          user.title = 'Cán bộ / Giảng viên';
          user.jobTitle = 'Cán bộ / Giảng viên';
          try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          } catch {}
        }
        return user;
      }
      return null;
    } catch {
      return null;
    }
  });

  const login = useCallback((user: User) => {
    setCurrentUser(user);
    if (user.token) {
      setAuthToken(user.token);
    }
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore localStorage write error
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setCurrentUser(null);
  }, []);

  const resetDevUser = useCallback(() => {
    setAuthToken(DEFAULT_DEV_USER.token || 'dev-token-admin');
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
    setAuthToken(nextUser.token || (roleKey === 'ADMIN' ? 'dev-token-admin' : 'dev-token-user'));
    setCurrentUser(nextUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    } catch {
      // Ignore
    }
    return nextUser;
  }, []);

  const isAdmin = useMemo(() => {
<<<<<<< HEAD
    return isAdminUser(currentUser);
=======
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    return isAdminEmail(currentUser?.email);
>>>>>>> origin/main
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
