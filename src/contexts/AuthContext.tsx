import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from '../types';
import { AUTH_STORAGE_KEY, isAdminUser } from '../constants';
import { getAuthToken, getCurrentUser, setAuthToken } from '../services/api';

interface AuthContextValue {
  currentUser: User | null;
  isAdmin: boolean;
  isCheckingSession: boolean;
  login: (user:User) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export const AuthProvider: React.FC<{children:React.ReactNode}> = ({children}) => {
  const [currentUser,setCurrentUser] = useState<User|null>(null);
  const [isCheckingSession,setIsCheckingSession] = useState(true);
  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentUser(null);
  },[]);
  const login = useCallback((user:User) => {
    if (!user.token) throw new Error('Phiên đăng nhập không hợp lệ.');
    setAuthToken(user.token);
    localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(user));
    setCurrentUser(user);
  },[]);
  useEffect(() => {
    let active = true;
    const token = getAuthToken();
    if (!token || token.startsWith('dev-token-')) {
      logout();
      setIsCheckingSession(false);
    } else {
      getCurrentUser().then(user => {
        if (active) setCurrentUser({...user,token});
      }).catch(() => { if(active) logout(); }).finally(() => {if(active) setIsCheckingSession(false);});
    }
    window.addEventListener('ctump-auth-expired',logout);
    return () => {active=false;window.removeEventListener('ctump-auth-expired',logout);};
  },[logout]);
  const value = useMemo(() => ({currentUser,isAdmin:isAdminUser(currentUser),isCheckingSession,login,logout}),[currentUser,isCheckingSession,login,logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export function useAuth():AuthContextValue {
  const value=useContext(AuthContext);
  if(!value)throw new Error('useAuth must be used within an AuthProvider');
  return value;
}
