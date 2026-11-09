import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({
  isOpen,
  onClose,
  showToast,
  onLoginSuccess,
  initialMode = 'login',
}) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    setIsLogin(initialMode !== 'register');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMsg(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailTrim = formData.email.trim();
    if (!emailTrim || !formData.password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    if (!isLogin) {
      if (!formData.name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (formData.password.length < 8) {
        setErrorMsg('Password must be at least 8 characters long.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await api.login({
          email: emailTrim,
          password: formData.password,
        });
      } else {
        res = await api.register({
          name: formData.name.trim(),
          email: emailTrim,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
      }

      if (onLoginSuccess && res?.user) {
        onLoginSuccess(res.user, res.access_token);
      }

      if (showToast) {
        showToast(
          isLogin
            ? `Welcome back, ${res?.user?.name || emailTrim.split('@')[0]}!`
            : 'Operator account created successfully!',
          'verified_user',
          'text-tertiary'
        );
      }
      onClose();
    } catch (err) {
      console.error('[AuthModal] Authentication error:', err);
      setErrorMsg(err.message || 'Authentication request failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-navy/20 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-8 glass-panel rounded-3xl shadow-2xl border border-white/80 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-muted-slate hover:text-deep-navy hover:bg-white/60 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-powder-blue via-soft-lavender to-sunset-peach p-0.5 flex items-center justify-center shadow-md mb-3">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <span className="material-symbols-outlined text-deep-navy text-[24px]">shield</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-deep-navy tracking-tight font-sans">
            {isLogin ? 'Sign In to SentinelMesh' : 'Create Operator Account'}
          </h2>
          <p className="text-xs text-muted-slate mt-1">
            {isLogin
              ? 'Access autonomous AI telemetry and multi-agent operations'
              : 'Join the autonomous SRE operations platform'}
          </p>
        </div>

        {/* Switcher Tab */}
        <div className="flex p-1 mb-5 bg-white/70 rounded-full border border-white/80 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isLogin ? 'bg-deep-navy text-white shadow-sm' : 'text-muted-slate hover:text-deep-navy'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !isLogin ? 'bg-deep-navy text-white shadow-sm' : 'text-muted-slate hover:text-deep-navy'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-rose-600 text-[18px] shrink-0">error</span>
            <span className="flex-1 font-medium">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-deep-navy mb-1 pl-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Elena Vance"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all disabled:opacity-50"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-deep-navy mb-1 pl-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="operator@sentinelmesh.ai"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
              className="w-full px-4 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-deep-navy mb-1 pl-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                className="w-full pl-4 pr-11 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-slate hover:text-deep-navy transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-slate hover:text-deep-navy" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-slate hover:text-deep-navy" />
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-deep-navy mb-1 pl-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={loading}
                  className="w-full pl-4 pr-11 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-slate hover:text-deep-navy transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-slate hover:text-deep-navy" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-slate hover:text-deep-navy" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-deep-navy hover:bg-deep-navy/90 text-white rounded-2xl font-semibold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 text-center border-t border-white/60 flex flex-col gap-2">
          {isLogin ? (
            <p className="text-xs text-muted-slate">
              Need an operator account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setErrorMsg(null);
                }}
                className="font-bold text-deep-navy hover:underline"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p className="text-xs text-muted-slate">
              Existing Operator?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setErrorMsg(null);
                }}
                className="font-bold text-deep-navy hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
          <p className="text-[10px] text-muted-slate">
            Protected by SentinelMesh Zero-Trust SRE Quorum.
          </p>
        </div>
      </div>
    </div>
  );
}
