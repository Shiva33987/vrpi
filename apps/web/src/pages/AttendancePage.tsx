import { useState, useEffect } from 'react';
import { ApiClient } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import {
  Clock,
  Calendar,
  Edit2,
  X,
  Play,
  Square,
  AlertTriangle,
} from 'lucide-react';

export function AttendancePage() {
  const { user } = useAuthStore();
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [overview, setOverview] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);

  // Correction modal state
  const [showCorrectModal, setShowCorrectModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [correctCheckIn, setCorrectCheckIn] = useState('');
  const [correctCheckOut, setCorrectCheckOut] = useState('');
  const [correctStatus, setCorrectStatus] = useState('PRESENT');
  const [correctReason, setCorrectReason] = useState('');
  const [correctError, setCorrectError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [todayRes, overviewRes] = await Promise.all([
        ApiClient.get('/attendance/today').catch(() => null),
        ApiClient.get(`/attendance/overview?date=${selectedDate}`),
      ]);
      setTodayStatus(todayRes);
      setOverview(overviewRes);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Handle Quick Punch In / Out
  const handlePunch = async () => {
    setPunching(true);
    try {
      const idempotencyKey = `web-punch-${Date.now()}`;
      if (todayStatus?.isCheckedIn) {
        await ApiClient.post('/attendance/check-out', { idempotencyKey });
      } else {
        await ApiClient.post('/attendance/check-in', { idempotencyKey });
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to process punch');
    } finally {
      setPunching(false);
    }
  };

  // Open correction modal
  const openCorrection = (record: any) => {
    setSelectedRecord(record);
    setCorrectCheckIn(record.checkInTime ? record.checkInTime.slice(0, 16) : '');
    setCorrectCheckOut(record.checkOutTime ? record.checkOutTime.slice(0, 16) : '');
    setCorrectStatus(record.status || 'PRESENT');
    setCorrectReason('');
    setCorrectError(null);
    setShowCorrectModal(true);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectError(null);
    if (!correctReason) {
      setCorrectError('A mandatory correction reason is required for audit logs');
      return;
    }

    try {
      await ApiClient.put(`/attendance/${selectedRecord.recordId}/correct`, {
        checkInTime: correctCheckIn ? new Date(correctCheckIn).toISOString() : undefined,
        checkOutTime: correctCheckOut ? new Date(correctCheckOut).toISOString() : undefined,
        status: correctStatus,
        reason: correctReason,
      });
      setShowCorrectModal(false);
      loadData();
    } catch (err: any) {
      setCorrectError(err.message || 'Failed to submit correction');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', text: 'Present' };
      case 'LATE':
        return { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', text: 'Late' };
      case 'HALF_DAY':
        return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', text: 'Half Day' };
      default:
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', text: 'Absent / Not Punched' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
            Daily Attendance & Timecards
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
            Authoritative server time tracking in {user?.organization.timezone || 'Asia/Kolkata'}
          </p>
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FFFFFF', padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
          <Calendar size={16} color="#64748B" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#0F172A', backgroundColor: 'transparent' }}
          />
        </div>
      </div>

      {/* Today's Punch Card for Current User */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: todayStatus?.isCheckedIn ? '#ECFDF5' : '#EFF6FF',
              color: todayStatus?.isCheckedIn ? '#059669' : '#1E3A8A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Your Today's Punch Status</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
              {todayStatus?.isCheckedIn ? 'Currently Checked In' : 'Not Punched In'}
            </div>
            {todayStatus?.record && (
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                Checked in at: {new Date(todayStatus.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {todayStatus.record.checkOutTime && ` | Checked out at: ${new Date(todayStatus.record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </div>
            )}
          </div>
        </div>

        <button
          disabled={punching}
          onClick={handlePunch}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: todayStatus?.isCheckedIn ? '#DC2626' : '#1E3A8A',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '14px',
            cursor: punching ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: punching ? 0.7 : 1,
          }}
        >
          {todayStatus?.isCheckedIn ? (
            <>
              <Square size={16} />
              <span>{punching ? 'Recording...' : 'Punch Out'}</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>{punching ? 'Recording...' : 'Punch In'}</span>
            </>
          )}
        </button>
      </div>

      {/* Org-Wide Attendance Roster Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
              Organization Roster ({selectedDate})
            </h2>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Real-time daily punch records with shift grace period computation
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Employee</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Check In</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Check Out</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Duration</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    Loading attendance records...
                  </td>
                </tr>
              ) : overview.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No records found for selected date.
                  </td>
                </tr>
              ) : (
                overview.map((row) => {
                  const badge = getStatusBadge(row.status);
                  const formatTime = (iso?: string | null) =>
                    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                  const formatHours = (mins?: number | null) => {
                    if (!mins) return '—';
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    return `${h}h ${m}m`;
                  };

                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{row.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{row.employeeCode}</div>
                      </td>
                      <td style={{ padding: '12px 20px', color: '#334155' }}>{row.department || '—'}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.text}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', color: '#0F172A', fontWeight: 500 }}>
                        {formatTime(row.checkInTime)}
                      </td>
                      <td style={{ padding: '12px 20px', color: '#0F172A', fontWeight: 500 }}>
                        {formatTime(row.checkOutTime)}
                      </td>
                      <td style={{ padding: '12px 20px', color: '#475569' }}>
                        {formatHours(row.totalMinutes)}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        {row.recordId && (
                          <button
                            onClick={() => openCorrection(row)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Edit2 size={12} />
                            <span>Correct</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Manual Timecard Correction */}
      {showCorrectModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Manual Attendance Correction</h2>
              <button onClick={() => setShowCorrectModal(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {correctError && (
              <div style={errorBannerStyle}>
                <AlertTriangle size={16} />
                <span>{correctError}</span>
              </div>
            )}

            <form onSubmit={handleCorrectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                Correcting punch record for: <strong>{selectedRecord?.name}</strong> ({selectedRecord?.employeeCode})
              </div>

              <div>
                <label style={labelStyle}>Check In Time</label>
                <input
                  type="datetime-local"
                  required
                  style={inputStyle}
                  value={correctCheckIn}
                  onChange={(e) => setCorrectCheckIn(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Check Out Time</label>
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={correctCheckOut}
                  onChange={(e) => setCorrectCheckOut(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select
                  style={inputStyle}
                  value={correctStatus}
                  onChange={(e) => setCorrectStatus(e.target.value)}
                >
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Mandatory Reason for Correction (Audit Logged)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Employee punch biometric sync failure confirmed by manager"
                  style={{ ...inputStyle, fontFamily: 'inherit' }}
                  value={correctReason}
                  onChange={(e) => setCorrectReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowCorrectModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" style={submitBtnStyle}>Save Correction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: '16px',
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '24px',
  width: '100%',
  maxWidth: '480px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '12px',
  borderBottom: '1px solid #E2E8F0',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#94A3B8',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  fontSize: '13px',
  boxSizing: 'border-box',
  outline: 'none',
  backgroundColor: '#fff',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  backgroundColor: '#FFFFFF',
  color: '#475569',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#1E3A8A',
  color: '#FFFFFF',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#FEF2F2',
  color: '#DC2626',
  padding: '10px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  marginTop: '12px',
};
