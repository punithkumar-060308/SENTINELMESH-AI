import React, { useState } from 'react';

export default function AuthModal({ isOpen, onClose, showToast }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      if (showToast) showToast('Please enter your email and password', 'error', 'text-error');
      return;
    }
    if (!isLogin && formData.password !== formData.confirmPassword) {
      if (showToast) showToast('Passwords do not match', 'error', 'text-error');
      return;
    }

    if (showToast) {
      showToast(
        isLogin ? `Welcome back, ${formData.email.split('@')[0]}!` : 'Account created successfully!',
        'verified_user',
        'text-tertiary'
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-navy/20 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-8 glass-panel rounded-3xl shadow-2xl border border-white/80 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
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
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isLogin ? 'bg-deep-navy text-white shadow-sm' : 'text-muted-slate hover:text-deep-navy'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !isLogin ? 'bg-deep-navy text-white shadow-sm' : 'text-muted-slate hover:text-deep-navy'
            }`}
          >
            Register
          </button>
        </div>

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
                className="w-full px-4 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all"
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
              className="w-full px-4 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-deep-navy mb-1 pl-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-deep-navy mb-1 pl-1">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-deep-navy hover:bg-deep-navy/90 text-white rounded-2xl font-semibold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <span>{isLogin ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </form>

        <div className="mt-5 pt-4 text-center border-t border-white/60">
          <p className="text-[11px] text-muted-slate">
            Protected by SentinelMesh Zero-Trust SRE Quorum.
          </p>
        </div>
      </div>
    </div>
  );
}
