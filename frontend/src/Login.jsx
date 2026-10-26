import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import api from './api';
import { 
  LogIn, KeyRound, Mail, AlertCircle, CheckCircle2, Eye, EyeOff, Building2
} from 'lucide-react';

// Google G icon SVG
function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  const navigate = useNavigate();

  const storeAndRedirect = ({ access_token, role, full_name }) => {
    localStorage.setItem('token', access_token);
    localStorage.setItem('role', role);
    localStorage.setItem('user_name', full_name || '');
    setSuccess(true);
    setTimeout(() => {
      if (role === 'TPO_ADMIN') navigate('/tpo');
      else if (role === 'DEPT_COORDINATOR') navigate('/coordinator');
      else if (role === 'RECRUITER') navigate('/recruiter');
      else if (role === 'STUDENT') navigate('/student');
      else navigate('/dashboard');
    }, 700);
  };

  // ── Password Login ──
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      storeAndRedirect(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to connect to the authentication server.");
    } finally {
      setLoading(false);
    }
  };

  // ── Google SSO Login ──
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setSsoLoading(true);
      setError(null);
      try {
        // Exchange the access_token for an id_token via Google userinfo
        // Note: @react-oauth/google's useGoogleLogin returns access_token by default.
        // For id_token, we use flow='implicit' or fetch from userinfo.
        // Here we POST the access_token and let backend identify the user via Google userinfo.
        const response = await api.post('/auth/google', {
          token: tokenResponse.access_token
        });
        storeAndRedirect(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Google Sign-In failed. Ensure your email is registered in the placement roster.");
      } finally {
        setSsoLoading(false);
      }
    },
    onError: (err) => {
      setSsoLoading(false);
      setError("Google Sign-In was cancelled or failed. Please try again.");
    },
    // Only allow the college domain
    hosted_domain: undefined, // Backend enforces domain — allows popup to open for any Google account
  });



  const isGoogleConfigured = import.meta.env.VITE_GOOGLE_CLIENT_ID && 
    import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-md border border-gray-200">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 text-white flex items-center justify-center rounded-xl shadow-sm font-bold text-xl">
            CB
          </div>
          <h2 className="mt-5 text-3xl font-extrabold text-gray-900 tracking-tight">
            CareerBridge
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Campus Placement & Internship Portal
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 font-medium">Authentication successful! Routing to your dashboard...</p>
          </div>
        )}

        {/* ── GOOGLE SSO SECTION (Students & Coordinators) ── */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
            Sign In with Google
          </p>

          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={ssoLoading || success || !isGoogleConfigured}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 border-2 rounded-xl text-sm font-semibold transition-all shadow-xs
              ${isGoogleConfigured 
                ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-blue-400 hover:shadow-md disabled:opacity-60 cursor-pointer' 
                : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
              }`}
          >
            {ssoLoading ? (
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <GoogleIcon />
            )}
            {ssoLoading ? 'Verifying Google Identity...' : 'Sign in with Google'}
          </button>

          {!isGoogleConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-center">
              <span className="font-semibold block">Google SSO Setup Required</span>
              Add <code className="bg-amber-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> in <code className="bg-amber-100 px-1 rounded">frontend/.env</code> to enable this button.
            </div>
          )}

          <p className="text-xs text-center text-gray-400">
            Any email address registered by the Placement Admin can sign in with Google.
          </p>
        </div>

        {/* ── DIVIDER ── */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-gray-500 font-medium uppercase tracking-wider">
              or sign in with password
            </span>
          </div>
        </div>

        {/* ── EMAIL + PASSWORD FORM ── */}
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full pl-9 px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="name@institution.edu"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase">Password</label>
              <Link to="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-500">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full pl-9 pr-10 px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading || success}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors disabled:opacity-70 mt-1"
          >
            {loading ? 'Authenticating...' : 'Sign In with Password'}
          </button>
        </form>

        {/* ── RECRUITER ACTIVATION ── */}
        <div className="pt-2 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Received an invite to recruit?{' '}
            <Link to="/activate" className="text-amber-700 hover:text-amber-800 font-semibold">
              Activate Recruiter Account →
            </Link>
          </p>
        </div>


      </div>
    </div>
  );
}
