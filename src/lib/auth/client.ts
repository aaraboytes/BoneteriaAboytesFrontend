'use client';

import type { User } from '@/types/user';
import { AxiosError } from 'axios';
import apiClient from '@/lib/api-client';

export interface SignUpParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignInWithOAuthParams {
  provider: 'google' | 'discord';
}

export interface SignInWithPasswordParams {
  email: string;
  password: string;
}

export interface ResetPasswordParams {
  email: string;
}

class AuthClient {
  async signUp(_: SignUpParams): Promise<{ error?: string }> {
    return { error: 'Sign up not implemented' };
  }

  async signInWithOAuth(_: SignInWithOAuthParams): Promise<{ error?: string }> {
    return { error: 'Social authentication not implemented' };
  }

  async signInWithPassword(params: SignInWithPasswordParams): Promise<{ error?: string }> {
    const { email, password } = params;

    try {
      const response = await apiClient.post('Auth/login', { email, password });
      const { token } = response.data; // The backend returns { User, Token }

      try {
        localStorage.setItem('custom-auth-token', token);
      } catch (err) {
        console.error('Failed to set token in localStorage', err);
      }

      return {};
    } catch (error: unknown) {
      if ((error as AxiosError).response && (error as AxiosError).response?.status === 401) {
        return { error: 'Invalid credentials' };
      }
      return { error: 'Something went wrong' };
    }
  }

  async resetPassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Password reset not implemented' };
  }

  async updatePassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Update reset not implemented' };
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    let token = null;
    try {
      token = localStorage.getItem('custom-auth-token');
    } catch (err) {
      console.error('Failed to get token from localStorage', err);
    }

    if (!token) {
      return { data: null };
    }

    try {
      const response = await apiClient.get('Auth/me');
      return { data: response.data };
    } catch (error: unknown) {
      if ((error as AxiosError).response && (error as AxiosError).response?.status === 401) {
        try {
          localStorage.removeItem('custom-auth-token');
        } catch (err) {
          console.error('Failed to remove token from localStorage', err);
        }
        return { data: null };
      }
      console.error('Auth User Error:', error);
      return { data: null, error: 'Failed to fetch user' };
    }
  }

  async signOut(): Promise<{ error?: string }> {
    try {
      localStorage.removeItem('custom-auth-token');
    } catch (err) {
      console.error('Failed to remove token from localStorage', err);
    }
    return {};
  }
}

export const authClient = new AuthClient();
