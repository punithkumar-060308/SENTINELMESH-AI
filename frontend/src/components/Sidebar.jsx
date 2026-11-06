import React from 'react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  incidentsCount = 3,
  pendingPatchesCount = 1,
  isOpenMobile = false,
  onCloseMobile
}) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'grid_view' },
    { id: 'incidents', label: 'Incidents', icon: 'warning', badge: incidentsCount, badgeColor: 'bg-sunset-peach text-[#17233B]' },
    { id: 'agents', label: 'AI Agents', icon: 'smart_toy', badge: '4', isAgentsBadge: true },
    { id: 'patch-review', label: 'Patch Review', icon: 'call_merge', badge: pendingPatchesCount, badgeColor: 'bg-powder-blue text-[#17233B]' },
    { id: 'verification', label: 'Verification', icon: 'check_circle' },
    { id: 'audit-logs', label: 'Audit Logs', icon: 'receipt_long' },
    { id: 'settings', label: 'Settings', icon: 'tune' },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#17233B]/30 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Floating Vertical Navigation Rail (Image 2 style) */}
      <aside
        className={`fixed left-4 lg:left-6 top-6 bottom-6 w-20 z-50 glass-rail rounded-[2.5rem] flex flex-col items-center justify-between py-6 shadow-2xl transition-all duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-32 lg:translate-x-0'
        }`}
      >
        {/* Brand Shield Logo Pill */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => handleNavClick('overview')}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-powder-blue via-soft-lavender to-sunset-peach p-0.5 flex items-center justify-center shadow-md hover:scale-105 transition-transform group"
            title="SentinelMesh AI"
          >
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[#17233B] text-[22px] group-hover:rotate-12 transition-transform">
                shield
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Icons Stack */}
        <nav className="flex flex-col items-center gap-3 my-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative group flex items-center justify-center">
                <button
                  onClick={() => handleNavClick(item.id)}
                  aria-label={item.label}
                  className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-[#17233B] text-white shadow-xl shadow-[#17233B]/30 scale-105'
                      : 'text-[#475569] hover:text-[#17233B] hover:bg-white/90 hover:scale-105'
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {item.icon}
                  </span>

                  {/* Badge Counter */}
                  {item.isAgentsBadge ? (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-powder-blue text-[#17233B] font-bold text-[9px] flex items-center justify-center shadow-sm">
                      4
                    </span>
                  ) : item.badge !== undefined && item.badge > 0 ? (
                    <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>

                {/* Floating Tooltip on Hover */}
                <div className="hidden lg:block absolute left-16 px-3 py-1.5 rounded-xl glass-pill text-xs font-bold text-[#17233B] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all shadow-md z-50">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Utility Indicator */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full bg-white/90 border border-white flex items-center justify-center text-[#475569] shadow-sm"
            title="Cluster Mesh: Online"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
      </aside>
    </>
  );
}
