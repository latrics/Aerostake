'use client';

import { useState, useEffect } from 'react';
import { apiClient, setCookie, eraseCookie } from './api-client';
import { Role } from './role';

export interface UserProfile {
  id: string;
  email: string;
  role: Role | string;
  is_active: boolean;
  full_name?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  designation?: string | null;
  company_profile?: any;
  organization_id?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

// Client-side local storage key for User profile caching
const USER_KEY = 'aerostake_user_profile';

export function getCachedUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(USER_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export function setCachedUser(user: UserProfile | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export const authService = {
  async login(body: any): Promise<TokenResponse> {
    const data = await apiClient.post<TokenResponse>('/auth/login', body);
    
    // Store in Cookies for middleware and SSR
    const isOnboarded = data.user.company_profile?.is_onboarded ? 'true' : 'false';
    setCookie('access_token', data.access_token, 1); // 1 day
    setCookie('refresh_token', data.refresh_token, 7); // 7 days
    setCookie('user_role', data.user.role, 7); // 7 days
    setCookie('is_onboarded', isOnboarded, 7); // 7 days
    
    // Cache profile in localStorage for fast load
    setCachedUser(data.user);
    
    return data;
  },

  async signup(body: any): Promise<TokenResponse> {
    const data = await apiClient.post<TokenResponse>('/auth/signup', body);
    
    setCookie('access_token', data.access_token, 1);
    setCookie('refresh_token', data.refresh_token, 7);
    setCookie('user_role', data.user.role, 7);
    setCookie('is_onboarded', 'false', 7);
    
    setCachedUser(data.user);
    
    return data;
  },

  clearSession() {
    eraseCookie('access_token');
    eraseCookie('refresh_token');
    eraseCookie('user_role');
    eraseCookie('is_onboarded');
    setCachedUser(null);
  },

  logout() {
    this.clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  async getProfile(): Promise<UserProfile> {
    const user = await apiClient.get<UserProfile>('/users/me');
    setCachedUser(user);
    // Update cookies
    setCookie('user_role', user.role, 7);
    setCookie('is_onboarded', user.company_profile?.is_onboarded ? 'true' : 'false', 7);
    return user;
  }
};

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      const freshProfile = await authService.getProfile();
      setUser(freshProfile);
      return freshProfile;
    } catch (err: any) {
      // If session timed out or unauthenticated, wipe session and redirect to login
      setUser(null);
      authService.clearSession();
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (
          currentPath !== '/login' &&
          currentPath !== '/signup' &&
          !currentPath.startsWith('/accept-invite')
        ) {
          window.location.href = '/login?session_expired=true';
        }
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Load cached user immediately
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
    }
    
    // 2. Fetch fresh profile from API to verify token/session
    checkSession();
  }, []);

  return {
    user,
    loading,
    error,
    refreshProfile: checkSession,
    login: async (body: any) => {
      setError(null);
      try {
        const data = await authService.login(body);
        setUser(data.user);
        return data;
      } catch (err: any) {
        setError(err.message || 'Login failed');
        throw err;
      }
    },
    signup: async (body: any) => {
      setError(null);
      try {
        const data = await authService.signup(body);
        setUser(data.user);
        return data;
      } catch (err: any) {
        setError(err.message || 'Registration failed');
        throw err;
      }
    },
    logout: () => {
      authService.logout();
      setUser(null);
    }
  };
}
