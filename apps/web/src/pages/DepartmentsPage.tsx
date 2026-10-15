import { useState, useEffect } from 'react';
import { ApiClient } from '../services/api';
import { Building2, Plus, Users, X, AlertTriangle } from 'lucide-react';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showDesigModal, setShowDesigModal] = useState(false);

  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [desigTitle, setDesigTitle] = useState('');
  const [desigDeptId, setDesigDeptId] = useState('');

  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptRes, desigRes] = await Promise.all([
        ApiClient.get('/departments'),
        ApiClient.get('/departments/designations'),
      ]);
      setDepartments(deptRes);
      setDesignations(desigRes);
      if (deptRes.length > 0 && !desigDeptId) {
        setDesigDeptId(deptRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await ApiClient.post('/departments', { name: deptName, code: deptCode });
      setShowDeptModal(false);
      setDeptName('');
      setDeptCode('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create department');
    }
  };

  const handleCreateDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await ApiClient.post('/departments/designations', {
        departmentId: desigDeptId,
        title: desigTitle,
      });
      setShowDesigModal(false);
      setDesigTitle('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create designation');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
            Departments & Job Titles
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
            Organizational hierarchy and role designations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setError(null);
              setShowDesigModal(true);
            }}
            style={{
              padding: '9px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              color: '#334155',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={15} />
            <span>Add Designation</span>
          </button>

          <button
            onClick={() => {
              setError(null);
              setShowDeptModal(true);
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
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Departments Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {loading ? (
          <div style={{ color: '#64748B' }}>Loading departments...</div>
        ) : (
          departments.map((dept) => {
            const deptDesigs = designations.filter((d) => d.departmentId === dept.id);
            return (
              <div
                key={dept.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={20} color="#1E3A8A" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '16px', color: '#0F172A' }}>{dept.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Code: {dept.code}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    <Users size={13} />
                    <span>{dept._count?.employees || 0}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Designations ({deptDesigs.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {deptDesigs.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>No titles created yet</span>
                    ) : (
                      deptDesigs.map((des) => (
                        <span
                          key={des.id}
                          style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            color: '#334155',
                          }}
                        >
                          {des.title}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Department Modal */}
      {showDeptModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Create New Department</h2>
              <button onClick={() => setShowDeptModal(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {error && (
              <div style={errorBannerStyle}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateDept} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={labelStyle}>Department Name</label>
                <input
                  required
                  placeholder="e.g. Legal & Compliance"
                  style={inputStyle}
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Department Code (Unique)</label>
                <input
                  required
                  placeholder="e.g. LGL"
                  style={inputStyle}
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowDeptModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" style={submitBtnStyle}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Designation Modal */}
      {showDesigModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Create New Designation</h2>
              <button onClick={() => setShowDesigModal(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {error && (
              <div style={errorBannerStyle}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateDesig} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={labelStyle}>Department</label>
                <select
                  required
                  style={inputStyle}
                  value={desigDeptId}
                  onChange={(e) => setDesigDeptId(e.target.value)}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Job Title</label>
                <input
                  required
                  placeholder="e.g. Senior Corporate Counsel"
                  style={inputStyle}
                  value={desigTitle}
                  onChange={(e) => setDesigTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowDesigModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" style={submitBtnStyle}>Create</button>
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
  maxWidth: '460px',
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
