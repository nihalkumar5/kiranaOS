'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  storeId: string;
}

interface Store {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
}

interface AuthContextType {
  user: User | null;
  store: Store | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerStore: (storeName: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check local storage for session
    const loadSession = () => {
      try {
        const storedUser = localStorage.getItem('kos_user');
        const storedStore = localStorage.getItem('kos_store');
        const token = localStorage.getItem('kos_access_token');

        if (storedUser && storedStore && token) {
          setUser(JSON.parse(storedUser));
          setStore(JSON.parse(storedStore));
        }
      } catch (e) {
        console.error('Failed to load session', e);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: loggedUser, store: loggedStore, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('kos_access_token', accessToken);
      localStorage.setItem('kos_refresh_token', refreshToken);
      localStorage.setItem('kos_user', JSON.stringify(loggedUser));
      localStorage.setItem('kos_store', JSON.stringify(loggedStore));

      setUser(loggedUser);
      setStore(loggedStore);
      
      // Redirect to POS/Dashboard
      router.push('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const registerStore = async (storeName: string, name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        storeName,
        name,
        email,
        password,
      });

      const { user: registeredUser, store: registeredStore, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('kos_access_token', accessToken);
      localStorage.setItem('kos_refresh_token', refreshToken);
      localStorage.setItem('kos_user', JSON.stringify(registeredUser));
      localStorage.setItem('kos_store', JSON.stringify(registeredStore));

      setUser(registeredUser);
      setStore(registeredStore);

      router.push('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      localStorage.removeItem('kos_access_token');
      localStorage.removeItem('kos_refresh_token');
      localStorage.removeItem('kos_user');
      localStorage.removeItem('kos_store');
      setUser(null);
      setStore(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        loading,
        login,
        registerStore,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
