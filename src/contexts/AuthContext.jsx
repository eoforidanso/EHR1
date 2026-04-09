import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { users } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const epcsOTPRef = useRef(null);       // { code: '123456', expiry: timestamp }


  const login = useCallback((username, password) => {
    const user = users.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      setLoginError('');
      return true;
    }
    setLoginError('Invalid username or password');
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);

  const verifyEPCS = useCallback(
    (pin) => {
      if (!currentUser) return false;
      return currentUser.epcsPin === pin;
    },
    [currentUser]
  );

  // Generate a 6-digit soft-token OTP valid for 30 seconds
  const generateEPCSOTP = useCallback(() => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    epcsOTPRef.current = { code, expiry: Date.now() + 30000 };
    return code;
  }, []);

  // Verify the OTP — checks code match AND expiry
  const verifyEPCSOTP = useCallback((input) => {
    const record = epcsOTPRef.current;
    if (!record) return false;
    if (Date.now() > record.expiry) {
      epcsOTPRef.current = null;
      return false;
    }
    const ok = record.code === String(input).trim();
    if (ok) epcsOTPRef.current = null; // consume after use
    return ok;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        loginError,
        login,
        logout,
        verifyEPCS,
        generateEPCSOTP,
        verifyEPCSOTP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
