import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import api from './api';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // Step 1: Request OTP, Step 2: Verify OTP + New Password
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState(null);
  
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  // Step 1: Request 6-digit OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    if (!email) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        email: email.trim()
      });
      setInfoMessage(res.data.message || "A 6-digit verification code has been dispatched.");
      if (res.data?.dev_otp) {
        setDevOtp(res.data.dev_otp);
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "No active account found with this email.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and save new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        otp_code: otpCode.trim(),
        new_password: newPassword
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow border border-gray-200">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-xl mb-3 shadow-xs">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-center text-2xl font-extrabold text-gray-900">
            Secure Password Recovery
          </h2>
          <p className="mt-1 text-center text-xs text-gray-600">
            {step === 1 
              ? "Verify your registered institutional email to receive a secure one-time verification code." 
              : `Enter the 6-digit code dispatched for ${email} and choose your new password.`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">{error}</p>
          </div>
        )}

        {infoMessage && !submitted && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-md flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 font-medium">{infoMessage}</p>
          </div>
        )}

        {submitted ? (
          <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-green-800">Password Reset Verified & Saved!</h3>
            <p className="text-xs text-green-700">
              Your password for <strong>{email}</strong> has been updated. You can now use your new credentials to sign in.
            </p>
            <Link 
              to="/login" 
              className="mt-3 inline-block w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors text-center"
            >
              Proceed to Sign In
            </Link>
          </div>
        ) : step === 1 ? (
          /* STEP 1: Enter Email & Request OTP */
          <form className="space-y-4" onSubmit={handleRequestOtp}>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Registered Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="name@institution.edu"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                A 6-digit security OTP will be dispatched to verify your identity.
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors disabled:opacity-70"
              >
                {loading ? 'Validating Account...' : 'Send Verification Code (OTP)'}
              </button>
            </div>
            
            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center text-xs text-gray-600 hover:text-gray-900 font-medium">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Sign In
              </Link>
            </div>
          </form>
        ) : (
          /* STEP 2: Enter 6-digit OTP & Set New Password */
          <form className="space-y-4" onSubmit={handleResetPassword}>
            {devOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span>🔐 Verification Code Dispatched</span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devOtp)}
                    className="text-xs text-blue-700 hover:underline font-semibold"
                  >
                    Autofill Code
                  </button>
                </div>
                <p className="text-amber-800">
                  Your 6-digit security code is: <strong className="font-mono text-sm tracking-wider bg-white px-2 py-0.5 rounded border border-amber-300">{devOtp}</strong>
                </p>
                <span className="text-[10px] text-amber-600 block">Valid for 15 minutes.</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase">
                  6-Digit Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Change Email
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="appearance-none block w-full px-3 py-2 font-mono text-center text-lg tracking-widest border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="• • • • • •"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="appearance-none block w-full pl-9 pr-10 px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full pl-9 pr-10 px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors disabled:opacity-70"
              >
                {loading ? 'Verifying & Saving...' : 'Verify Code & Set Password'}
              </button>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-600 pt-2">
              <button
                type="button"
                onClick={handleRequestOtp}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Resend Code
              </button>
              <Link to="/login" className="hover:text-gray-900 font-medium">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
