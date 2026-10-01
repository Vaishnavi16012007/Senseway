import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<boolean>;
  signup: (name: string, email: string, password: string, accessibilityNeed: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
}

const DEFAULT_DEMO_USER: User = {
  id: 'usr_senseway_01',
  name: 'Vaishnavi V.',
  email: 'vaishnavi@senseway.ai',
  role: 'Premium Member',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  accessibilityNeed: 'Visual & Voice Companion',
  isActive: true,
  createdAt: '2026-01-15T10:00:00Z',
};

const AUTH_STORAGE_KEY = 'senseway_auth_user';
const TOKEN_STORAGE_KEY = 'senseway_auth_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check persistent authentication on initial mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error loading persistent auth:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, _password?: string, rememberMe: boolean = true): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 500));

    const authenticatedUser: User = {
      ...DEFAULT_DEMO_USER,
      email: email || DEFAULT_DEMO_USER.email,
      name: email ? (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)) : DEFAULT_DEMO_USER.name,
    };

    setUser(authenticatedUser);
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt_token_senseway_' + Date.now());
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
      sessionStorage.setItem(TOKEN_STORAGE_KEY, 'jwt_token_senseway_' + Date.now());
    }
    setIsLoading(false);
    return true;
  };

  const signup = async (
    name: string,
    email: string,
    _password: string,
    accessibilityNeed: string
  ): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 600));

    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: name.trim() || 'SenseWay User',
      email: email.trim().toLowerCase(),
      role: 'Member',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      accessibilityNeed: accessibilityNeed || 'All-in-One Accessibility',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setUser(newUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt_token_senseway_' + Date.now());
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    await new Promise((res) => setTimeout(res, 500));
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please provide a valid email address.' };
    }
    return {
      success: true,
      message: `Password reset verification instructions have been sent to ${email}.`,
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
