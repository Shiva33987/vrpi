import { useState, useEffect } from 'react';
import { ApiClient } from '../services/api';
import {
  Plus,
  X,
  AlertTriangle,
} from 'lucide-react';

export function LeavePage() {
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [tab, setTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [loading, setLoading] = useState(true);

  // Apply Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyLeaveTypeId, setApplyLeaveTypeId] = useState('');
  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyEndDate, setApplyEndDate] = useState('');
  const [applyIsHalfDay, setApplyIsHalfDay] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);

  // Review Modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balRes, typesRes, reqRes] = await Promise.all([
        ApiClient.get('/leave/balances').catch(() => []),
        ApiClient.get('/leave/types').catch(() => []),
        ApiClient.get('/leave/admin/requests').catch(() => []),
      ]);

      setBalances(balRes);
      setLeaveTypes(typesRes);
      setRequests(reqRes);

      if (typesRes.length > 0 && !applyLeaveTypeId) {
        setApplyLeaveTypeId(typesRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);
    try {
      await ApiClient.post('/leave/requests', {
        leaveTypeId: applyLeaveTypeId,
        startDate: applyStartDate,
        endDate: applyEndDate,
        isHalfDay: applyIsHalfDay,
        reason: applyReason,
      });

      setShowApplyModal(false);
      setApplyStartDate('');
      setApplyEndDate('');
      setApplyReason('');
      setApplyIsHalfDay(false);
      loadData();
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit leave request');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    try {
      await ApiClient.post(`/leave/requests/${selectedRequest.id}/review`, {
        decision: reviewDecision,
        comment: reviewComment,
      });

      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewComment('');
      loadData();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to review leave request');
    }
  };

  const openReview = (req: any, decision: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(req);
    setReviewDecision(decision);
    setReviewComment('');
    setReviewError(null);
    setShowReviewModal(true);
  };

  const filteredRequests = requests.filter((r) => {
    if (tab === 'ALL') return true;
    return r.status === tab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', text: 'Approved' };
      case 'REJECTED':
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', text: 'Rejected' };
      default:
        return { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', text: 'Pending Approval' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
            Leave Management & Balances
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
            Accruals, balance deduction rules, and multi-tier approval workflows.
          </p>
        </div>

        <button
          onClick={() => {
            setApplyError(null);
            setShowApplyModal(true);
          }}
          style={{
            padding: '9px 16px',
            backgroundColor: '#1E3A8A',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={16} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {balances.map((b) => (
          <div
            key={b.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>
                {b.leaveType.name}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#EFF6FF',
                  color: '#1E3A8A',
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}
              >
                {b.leaveType.code}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Remaining</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>{b.remainingDays}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Allocated</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{b.allocatedDays}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Used</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>{b.usedDays}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Pending</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#D97706' }}>{b.pendingDays}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Requests Inbox Tabs & Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 16px', backgroundColor: '#F8FAFC' }}>
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '14px 18px',
                border: 'none',
                background: 'transparent',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                color: tab === t ? '#1E3A8A' : '#64748B',
                borderBottom: tab === t ? '2px solid #1E3A8A' : '2px solid transparent',
              }}
            >
              {t === 'PENDING' ? 'Pending Approval' : t}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Employee</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Leave Type</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Dates</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Duration</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Reason</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    Loading leave requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No leave requests found in this view.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const badge = getStatusBadge(req.status);
                  const startStr = req.startDate ? req.startDate.split('T')[0] : '';
                  const endStr = req.endDate ? req.endDate.split('T')[0] : '';

                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>
                          {req.employee?.firstName} {req.employee?.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{req.employee?.employeeCode}</div>
                      </td>
                      <td style={{ padding: '12px 20px', fontWeight: 500, color: '#334155' }}>
                        {req.leaveType?.name}
                      </td>
                      <td style={{ padding: '12px 20px', color: '#0F172A' }}>
                        {startStr} {startStr !== endStr ? `to ${endStr}` : ''}
                      </td>
                      <td style={{ padding: '12px 20px', color: '#334155' }}>
                        {req.totalDays} day{req.totalDays > 1 ? 's' : ''} {req.isHalfDay ? '(Half-Day)' : ''}
                      </td>
                      <td style={{ padding: '12px 20px', color: '#475569', maxWidth: '200px' }}>
                        {req.reason}
                      </td>
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
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        {req.status === 'PENDING' && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => openReview(req, 'APPROVED')}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #A7F3D0',
                                backgroundColor: '#ECFDF5',
                                color: '#059669',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openReview(req, 'REJECTED')}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #FECACA',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {req.status !== 'PENDING' && req.reviewComment && (
                          <div style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
                            "{req.reviewComment}"
                          </div>
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

      {/* Modal: Apply for Leave */}
      {showApplyModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Apply for Leave</h2>
              <button onClick={() => setShowApplyModal(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {applyError && (
              <div style={errorBannerStyle}>
                <AlertTriangle size={16} />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={labelStyle}>Leave Type</label>
                <select
                  required
                  style={inputStyle}
                  value={applyLeaveTypeId}
                  onChange={(e) => setApplyLeaveTypeId(e.target.value)}
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code} - {t.daysPerYear} days/yr)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input
                    type="date"
                    required
                    style={inputStyle}
                    value={applyStartDate}
                    onChange={(e) => setApplyStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input
                    type="date"
                    required
                    style={inputStyle}
                    value={applyEndDate}
                    onChange={(e) => setApplyEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="halfDayToggle"
                  checked={applyIsHalfDay}
                  onChange={(e) => setApplyIsHalfDay(e.target.checked)}
                />
                <label htmlFor="halfDayToggle" style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>
                  Half-Day Leave (0.5 day)
                </label>
              </div>

              <div>
                <label style={labelStyle}>Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please state the purpose of your leave request"
                  style={{ ...inputStyle, fontFamily: 'inherit' }}
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowApplyModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" style={submitBtnStyle}>Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review Leave Request (Approve / Reject) */}
      {showReviewModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {reviewDecision === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h2>
              <button onClick={() => setShowReviewModal(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {reviewError && (
              <div style={errorBannerStyle}>
                <AlertTriangle size={16} />
                <span>{reviewError}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div style={{ fontSize: '13px', color: '#334155', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px' }}>
                <div>Employee: <strong>{selectedRequest?.employee?.firstName} {selectedRequest?.employee?.lastName}</strong></div>
                <div>Leave Type: <strong>{selectedRequest?.leaveType?.name}</strong></div>
                <div>Duration: <strong>{selectedRequest?.totalDays} day(s)</strong> ({selectedRequest?.startDate?.split('T')[0]} to {selectedRequest?.endDate?.split('T')[0]})</div>
                <div style={{ marginTop: '4px' }}>Reason: <em>"{selectedRequest?.reason}"</em></div>
              </div>

              <div>
                <label style={labelStyle}>Review Comment</label>
                <textarea
                  rows={3}
                  placeholder={reviewDecision === 'APPROVED' ? 'Optional remarks for approval' : 'Mandatory reason for rejection'}
                  style={{ ...inputStyle, fontFamily: 'inherit' }}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowReviewModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button
                  type="submit"
                  style={{
                    ...submitBtnStyle,
                    backgroundColor: reviewDecision === 'APPROVED' ? '#059669' : '#DC2626',
                  }}
                >
                  Confirm {reviewDecision === 'APPROVED' ? 'Approval' : 'Rejection'}
                </button>
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
