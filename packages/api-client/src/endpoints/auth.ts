import { fetchClient } from '../client';
import type { User, ApiResponse } from '../types';

export const sendOtp = (phone_number: string): Promise<ApiResponse<{ message: string }>> => {
  return fetchClient('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone_number }),
  });
};

export const verifyOtp = (phone_number: string, otp: string): Promise<ApiResponse<{ user: User }>> => {
  return fetchClient('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone_number, otp }),
  });
};

export const logout = (): Promise<ApiResponse<{ message: string }>> => {
  return fetchClient('/auth/logout', {
    method: 'POST',
  });
};

export const getMe = (): Promise<ApiResponse<{ user: User }>> => {
  return fetchClient('/auth/me');
};
