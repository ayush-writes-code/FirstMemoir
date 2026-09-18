'use client';

import React, { useState } from 'react';
import { auth } from '@/lib/api-client';
import { OtpInput } from './OtpInput';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    // Ensure phone has country code for basic validation
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    setPhone(formattedPhone);

    try {
      const res = await auth.sendOtp(formattedPhone);
      if (res.success) {
        setStep('OTP');
      } else {
        setError(res.error || 'Failed to send OTP');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await auth.verifyOtp(phone, otp);
      if (res.success) {
        onSuccess();
        // Reset state for future opens
        setTimeout(() => {
          setStep('PHONE');
          setPhone('');
        }, 500);
      } else {
        setError(res.error || 'Invalid OTP');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep('PHONE');
    setPhone('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-xl font-semibold">
            {step === 'PHONE' ? 'Sign In or Create Account' : 'Verify Phone'}
          </h2>
          <button
            onClick={handleClose}
            className="w-11 h-11 flex items-center justify-center text-zinc-400 hover:text-black transition-colors rounded-full hover:bg-zinc-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
              {error}
            </div>
          )}

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={phone.replace(/^\+91/, '')}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-4 py-3 text-base bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || phone.length < 10}
                className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-zinc-800 focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending OTP...' : 'Continue'}
              </button>
              <p className="text-xs text-center text-zinc-500 mt-4">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 text-center">
                Enter the 6-digit code sent to <span className="font-medium text-black">{phone}</span>
              </p>
              
              <OtpInput length={6} onComplete={handleVerifyOtp} isLoading={isLoading} />
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('PHONE');
                    setError('');
                  }}
                  className="text-sm font-medium text-zinc-500 hover:text-black transition-colors"
                >
                  Change phone number
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
