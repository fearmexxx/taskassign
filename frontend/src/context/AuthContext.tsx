import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Lead' | 'Member';
  department_id: number | null;
  department_name?: string;
  base_salary?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = async () => {
    const currentToken = localStorage.getItem('tap_token');
    if (!currentToken) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const freshUser = data.user || data;
        const freshToken = data.token || currentToken;

        localStorage.setItem('tap_user', JSON.stringify(freshUser));
        localStorage.setItem('tap_token', freshToken);
        setUser(freshUser);
        setToken(freshToken);
      } else if (res.status === 401 || res.status === 403) {
        // Token invalid/expired
        localStorage.removeItem('tap_token');
        localStorage.removeItem('tap_user');
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.warn('Could not refresh profile from server:', e);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('tap_token');
    const storedUser = localStorage.getItem('tap_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse cached user:', e);
      }
      // Silently sync latest user state and role from server
      refreshProfile().finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const { token: receivedToken, user: receivedUser } = await res.json();
      localStorage.setItem('tap_token', receivedToken);
      localStorage.setItem('tap_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return true;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('tap_token');
    localStorage.removeItem('tap_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('tap_user', JSON.stringify(merged));
      return merged;
    });
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token || localStorage.getItem('tap_token')}`,
      'Content-Type': 'application/json',
    };
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, refreshProfile, isLoading, error, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
