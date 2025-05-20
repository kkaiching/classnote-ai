import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  name?: string;
  email?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(null);

  // 從 localStorage 初始化使用者資料
  useEffect(() => {
    const storedUser = localStorage.getItem('user_data');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user data from localStorage', error);
        // 無效的使用者資料，清除 localStorage
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
        setToken(null);
      }
    }
  }, []);

  // 若有 token，驗證 token 有效性並獲取最新的使用者資料
  const { isLoading } = useQuery({
    queryKey: ['/api/auth/user', token],
    queryFn: async () => {
      if (!token) return null;
      
      try {
        const headers = new Headers();
        headers.append('Authorization', `Bearer ${token}`);
        
        const response = await apiRequest('GET', '/api/auth/user', undefined, { headers });
        
        if (!response.ok) {
          throw new Error('Failed to verify token');
        }
        
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user_data', JSON.stringify(userData));
        return userData;
      } catch (error) {
        console.error('Token validation failed', error);
        // 無效的 token，執行登出
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        return null;
      }
    },
    enabled: !!token, // 只有當 token 存在時才執行查詢
    retry: false,
    refetchOnWindowFocus: false,
  });

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('user_data', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated: !!token && !!user, 
        user, 
        token,
        login, 
        logout,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};