import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(null); // 'user' | 'foodpartner' | 'deliverypartner' | null
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setAccount(data.account);
      setRole(data.role);
    } catch {
      setAccount(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const loginUser = async (credentials) => {
    const { data } = await api.post('/auth/user/login', credentials);
    setAccount(data.user);
    setRole('user');
    return data;
  };

  const registerUser = async (payload) => {
    const { data } = await api.post('/auth/user/register', payload);
    setAccount(data.user);
    setRole('user');
    return data;
  };

  const loginPartner = async (credentials) => {
    const { data } = await api.post('/auth/food-partner/login', credentials);
    setAccount(data.foodPartner);
    setRole('foodpartner');
    return data;
  };

  const registerPartner = async (payload) => {
    const { data } = await api.post('/auth/food-partner/register', payload);
    setAccount(data.foodPartner);
    setRole('foodpartner');
    return data;
  };

  const loginDeliveryPartner = async (credentials) => {
    const { data } = await api.post('/auth/delivery-partner/login', credentials);
    setAccount(data.deliveryPartner);
    setRole('deliverypartner');
    return data;
  };

  const registerDeliveryPartner = async (payload) => {
    const { data } = await api.post('/auth/delivery-partner/register', payload);
    setAccount(data.deliveryPartner);
    setRole('deliverypartner');
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccount(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        account,
        role,
        loading,
        isAuthenticated: Boolean(account),
        isUser: role === 'user',
        isPartner: role === 'foodpartner',
        isDeliveryPartner: role === 'deliverypartner',
        refreshAuth,
        setAccount,
        loginUser,
        registerUser,
        loginPartner,
        registerPartner,
        loginDeliveryPartner,
        registerDeliveryPartner,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
