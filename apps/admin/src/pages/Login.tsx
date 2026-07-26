import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@repo/api-client';

export function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit number');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await auth.sendOtp(phone);
      if (res.success) {
        setStep('OTP');
      } else {
        setError(res.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await auth.verifyOtp(phone, otp);
      if (res.success && res.data?.user) {
        if (res.data.user.role === 'ADMIN') {
          navigate('/');
        } else {
          setError('Access denied. Admin role required.');
          await auth.logout();
        }
      } else {
        setError(res.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage the store
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#E8620A] focus:border-[#E8620A] sm:text-sm"
                    placeholder="Enter 10-digit number"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || phone.length !== 10}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-[#E8620A] hover:bg-[#d05809] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E8620A] disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Enter OTP sent to {phone}
                </label>
                <div className="mt-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#E8620A] focus:border-[#E8620A] sm:text-sm text-center text-lg tracking-widest"
                    placeholder="000000"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-[#E8620A] hover:bg-[#d05809] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E8620A] disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                </button>
              </div>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('PHONE');
                    setOtp('');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
