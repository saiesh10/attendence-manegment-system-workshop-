import { createContext, useContext, useMemo, useState } from 'react';
import { auth, clearAuth, getTeacherName, setAuth } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('attendx_token'));
  const [name, setName] = useState(() => getTeacherName());

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      token,
      name,
      async login(email, password) {
        const result = await auth.login(email, password);
        setAuth(result.token, result.name);
        setToken(result.token);
        setName(result.name);
        return result;
      },
      async register(formData) {
        return auth.register(formData);
      },
      logout() {
        clearAuth();
        setToken(null);
        setName(null);
      },
    }),
    [token, name]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
