import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('hradmin@vrpi.com');
  const [password, setPassword] = useState('Admin123!');
  const [orgCode, setOrgCode] = useState('VRPI');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password, orgCode);
    } catch {
      // Error handled in store
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Admin123!');
    setOrgCode('VRPI');
    clearError();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#F8FAFC' }}>
      {/* Left Branding Showcase Panel */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#1E3A8A',
          color: '#FFFFFF',
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              <img src="/vrpi-logo.png" alt="VRPI Logo" style={{ height: '32px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>VRPI HRMS</div>
              <div style={{ fontSize: '13px', color: '#93C5FD' }}>Enterprise People Operations</div>
            </div>
          </div>

          <h2 style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1.25, marginBottom: '16px' }}>
            Modern workforce intelligence, streamlined for high performance.
          </h2>
          <p style={{ fontSize: '16px', color: '#BFDBFE', lineHeight: 1.6, maxWidth: '460px' }}>
            Empower your HR department with centralized employee records, real-time attendance, atomic leave approvals, and instant compliance reports.
          </p>

          <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={20} color="#34D399" />
              <span style={{ fontSize: '14px', color: '#E0E7FF' }}>Zoho People-inspired enterprise workflow architecture</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={20} color="#34D399" />
              <span style={{ fontSize: '14px', color: '#E0E7FF' }}>Strict Role-Based Access Control & multi-tenant isolation</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={20} color="#34D399" />
              <span style={{ fontSize: '14px', color: '#E0E7FF' }}>Mobile synchronization with Android offline fault-tolerance</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#93C5FD' }}>
          VRPI Technologies Inc. © 2026. All rights reserved.
        </div>
      </div>

      {/* Right Login Form Container */}
      <div
        style={{
          width: '520px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 48px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
              Sign In to Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              Enter your corporate credentials to access the administration portal.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Corporate Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: '12px', top: '12px' }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vrpi.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: '12px', top: '12px' }}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Organization Code
              </label>
              <input
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                placeholder="VRPI"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                  outline: 'none',
                  textTransform: 'uppercase',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: '10px',
                backgroundColor: '#1E3A8A',
                color: '#FFFFFF',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '15px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '12px', textTransform: 'uppercase' }}>
              Quick Demo Logins (Password: Admin123!)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleQuickFill('hradmin@vrpi.com')}
                style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                HR Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('superadmin@vrpi.com')}
                style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('hr@vrpi.com')}
                style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                HR User
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('priya.patel@vrpi.com')}
                style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Employee (Priya)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
