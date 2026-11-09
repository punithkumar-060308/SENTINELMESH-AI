import React, { useState } from 'react';
import { api } from '../services/api';

export default function UserProfile({
  currentUser,
  onUpdateUser,
  onLogout,
  showToast,
  onNavigateTab,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);

  const getInitials = (userName) => {
    if (!userName) return 'OP';
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      if (showToast) showToast('Name cannot be empty', 'error', 'text-rose-500');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        avatar_url: avatarUrl.trim() || null,
      });
      if (onUpdateUser) {
        onUpdateUser(updated);
      }
      setIsEditing(false);
      if (showToast) {
        showToast('Profile updated successfully!', 'check_circle', 'text-emerald-500');
      }
    } catch (err) {
      console.error('[UserProfile] Failed to update profile:', err);
      if (showToast) {
        showToast(`Failed to update profile: ${err.message}`, 'error', 'text-rose-500');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-deep-navy tracking-tight">Operator Profile</h1>
          <p className="text-xs text-muted-slate mt-0.5">
            Manage your SentinelMesh autonomous credentials and identity.
          </p>
        </div>
        <button
          onClick={() => onNavigateTab && onNavigateTab('overview')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-deep-navy bg-white/80 border border-white hover:bg-white shadow-xs transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-glass border border-white/80 relative overflow-hidden">
        {/* Ambient Decorative Gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-powder-blue/20 via-soft-lavender/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/60">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-deep-navy to-[#2563EB] text-white flex items-center justify-center text-2xl font-black tracking-wider shadow-md">
                  {getInitials(currentUser?.name)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Operator Active"></div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-deep-navy">{currentUser?.name || 'Operator'}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-powder-blue/40 text-deep-navy border border-powder-blue/60">
                  SRE Mesh Operator
                </span>
              </div>
              <p className="text-xs text-muted-slate font-mono mt-0.5">{currentUser?.email}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-slate">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                  Verified Identity
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  Joined {formattedDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {!isEditing ? (
              <button
                onClick={() => {
                  setName(currentUser?.name || '');
                  setAvatarUrl(currentUser?.avatar_url || '');
                  setIsEditing(true);
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-white/90 border border-white text-xs font-bold text-deep-navy shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Edit Profile</span>
              </button>
            ) : null}

            <button
              onClick={onLogout}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Edit Form or Account Details */}
        {isEditing ? (
          <form onSubmit={handleSave} className="mt-6 space-y-4 max-w-lg">
            <h3 className="text-sm font-bold text-deep-navy">Update Profile Information</h3>

            <div>
              <label className="block text-xs font-semibold text-deep-navy mb-1 pl-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Operator Name"
                className="w-full px-4 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-deep-navy mb-1 pl-1">
                Profile Avatar URL (Optional)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full px-4 py-2.5 bg-white/90 border border-white/80 rounded-2xl text-xs text-deep-navy placeholder:text-muted-slate/60 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all"
              />
              <p className="text-[10px] text-muted-slate mt-1 pl-1">
                Provide an image URL or leave blank to display your calculated operator monogram.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-deep-navy hover:bg-deep-navy/90 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-4 py-2.5 bg-white hover:bg-white/80 border border-white rounded-xl text-xs font-bold text-muted-slate transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/60 border border-white/80 shadow-xs">
              <span className="text-[11px] font-bold text-muted-slate uppercase tracking-wider">Account ID</span>
              <p className="font-mono text-xs font-bold text-deep-navy mt-1 truncate">
                {currentUser?.id || 'usr-anonymous'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 border border-white/80 shadow-xs">
              <span className="text-[11px] font-bold text-muted-slate uppercase tracking-wider">Session Security</span>
              <p className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                JWT Encrypted (HS256)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 border border-white/80 shadow-xs">
              <span className="text-[11px] font-bold text-muted-slate uppercase tracking-wider">Storage Engine</span>
              <p className="text-xs font-bold text-deep-navy mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">database</span>
                MongoDB Atlas `users`
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Security & Access Policies Card */}
      <div className="glass-panel rounded-3xl p-6 shadow-glass border border-white/80">
        <h3 className="text-sm font-bold text-deep-navy flex items-center gap-2">
          <span className="material-symbols-outlined text-powder-blue text-[18px]">security</span>
          Security & Access Controls
        </h3>
        <p className="text-xs text-muted-slate mt-1">
          SentinelMesh enforces strict role-based access policies and Docker verification isolation.
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 border border-white">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
              <div>
                <p className="text-xs font-bold text-deep-navy">Bcrypt Password Hashing</p>
                <p className="text-[11px] text-muted-slate">All operator passwords are salted and hashed with bcrypt.</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 border border-white">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-powder-blue text-[18px]">terminal</span>
              <div>
                <p className="text-xs font-bold text-deep-navy">Docker Fail-Closed Verification</p>
                <p className="text-[11px] text-muted-slate">Incidents require real isolated Docker containers to mark recovered.</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-powder-blue/40 text-deep-navy">
              Enforced
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
