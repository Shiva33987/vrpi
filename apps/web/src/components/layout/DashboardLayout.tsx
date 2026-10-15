import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarCheck,
  Banknote,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Bell,
} from 'lucide-react';

interface DashboardLayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function DashboardLayout({ currentTab, onTabChange, children }: DashboardLayoutProps) {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leave', label: 'Leave Tracking', icon: CalendarCheck },
    { id: 'payroll', label: 'Payroll & Salary', icon: Banknote, badge: 'MVP' },
  ];

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'HR_ADMIN':
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
      case 'HR':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
      default:
        return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
    }
  };

  const badgeStyle = getRoleBadgeColor(user?.role);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? '72px' : '260px',
          backgroundColor: '#1E293B',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          zIndex: 20,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: '64px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#1E3A8A',
                color: '#FFFFFF',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              VR
            </div>
            {!collapsed && (
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px', color: '#FFFFFF' }}>
                  VRPI HRMS
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Admin Portal</div>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Collapse Sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {collapsed && (
          <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setCollapsed(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Expand Sidebar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: collapsed ? '12px 0' : '10px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? '#1E3A8A' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '14px',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                {!collapsed && (
                  <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#334155',
                          color: '#CBD5E1',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout in Footer */}
        <div style={{ padding: '12px', borderTop: '1px solid #334155' }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {user?.employee?.firstName?.[0] || user?.email[0].toUpperCase()}
                </div>
                <div style={{ maxWidth: '120px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>{user?.organization.code}</div>
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#EF4444',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#EF4444',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                padding: '8px 0',
              }}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            height: '64px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748B' }}>
            <span>Portal</span>
            <span>/</span>
            <span style={{ fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>{currentTab}</span>
          </div>

          {/* Right Header Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: badgeStyle.bg,
                color: badgeStyle.text,
                border: `1px solid ${badgeStyle.border}`,
              }}
            >
              <ShieldCheck size={14} />
              <span>{user?.role}</span>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#64748B',
                padding: '4px 8px',
                backgroundColor: '#F1F5F9',
                borderRadius: '6px',
              }}
            >
              {user?.organization.name}
            </div>

            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
              title="Notifications"
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
