import { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { Users, UserCheck, Clock, CalendarDays, ArrowRight, UserPlus } from 'lucide-react';

interface OverviewPageProps {
  onNavigate: (tab: string) => void;
}

interface DepartmentStat {
  id: string;
  name: string;
  code: string;
  _count?: {
    employees: number;
  };
}

interface AttendanceOverview {
  totalEmployees: number;
  present: number;
  late: number;
  onLeave: number;
  halfDay: number;
  absent: number;
}

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    departmentsCount: 0,
    pendingLeavesCount: 0,
  });
  const [departments, setDepartments] = useState<DepartmentStat[]>([]);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverview | null>(null);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [empRes, deptRes, allEmps, pendingLeavesRes, attRes] = await Promise.allSettled([
          ApiClient.get('/employees?limit=5'),
          ApiClient.get('/departments'),
          ApiClient.get('/employees?limit=100'),
          ApiClient.get('/leave/admin/requests?status=PENDING'),
          ApiClient.get('/attendance/overview'),
        ]);

        const employeesList = empRes.status === 'fulfilled' ? empRes.value : [];
        const departmentsList = deptRes.status === 'fulfilled' ? deptRes.value : [];
        const allEmployeesList = allEmps.status === 'fulfilled' ? allEmps.value : [];
        const pendingLeaves = pendingLeavesRes.status === 'fulfilled' ? pendingLeavesRes.value : [];
        const attendanceData = attRes.status === 'fulfilled' ? attRes.value : [];
        const attList = Array.isArray(attendanceData) ? attendanceData : [];
        const present = attList.filter((r: any) => r.status === 'PRESENT').length;
        const late = attList.filter((r: any) => r.status === 'LATE').length;
        const onLeave = attList.filter((r: any) => r.status === 'ON_LEAVE').length;
        const halfDay = attList.filter((r: any) => r.status === 'HALF_DAY').length;
        const absent = attList.filter((r: any) => r.status === 'ABSENT' || !r.status).length;

        setStats({
          totalEmployees: allEmployeesList.length,
          activeEmployees: allEmployeesList.filter((e: any) => e.isActive).length,
          departmentsCount: departmentsList.length,
          pendingLeavesCount: Array.isArray(pendingLeaves) ? pendingLeaves.length : 0,
        });

        setDepartments(departmentsList);
        setAttendanceOverview({
          totalEmployees: allEmployeesList.length,
          present,
          late,
          onLeave,
          halfDay,
          absent,
        });
        setRecentEmployees(employeesList.slice(0, 5));
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalHeadcount = stats.totalEmployees || 1;
  const presentCount = attendanceOverview?.present || 0;
  const lateCount = attendanceOverview?.late || 0;
  const leaveCount = attendanceOverview?.onLeave || 0;
  const halfDayCount = attendanceOverview?.halfDay || 0;
  const absentCount = attendanceOverview?.absent || 0;

  const presentPercentage = Math.round(((presentCount + lateCount) / totalHeadcount) * 100) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Workforce Intelligence
          </div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 700 }}>
            Executive HR & Operations Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#BFDBFE' }}>
            Real-time workforce attendance, leave pipeline, and departmental breakdown.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigate('employees')}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#1E3A8A',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Pending Leave Alert Bar (if pending requests exist) */}
      {stats.pendingLeavesCount > 0 && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <div>
              <span style={{ fontWeight: 700, color: '#92400E', fontSize: '14px' }}>
                {stats.pendingLeavesCount} Pending Leave Request{stats.pendingLeavesCount > 1 ? 's' : ''}
              </span>
              <span style={{ color: '#B45309', fontSize: '13px', marginLeft: '8px' }}>
                Require manager or HR review and approval.
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('leave')}
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Review Requests
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} color="#1E3A8A" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Headcount</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>{loading ? '...' : stats.totalEmployees}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Active Roster</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669' }}>{loading ? '...' : stats.activeEmployees}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} color="#16A34A" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Attendance Rate</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#16A34A' }}>
              {loading ? '...' : `${presentPercentage}%`}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={22} color="#D97706" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Pending Leaves</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#D97706' }}>
              {loading ? '...' : stats.pendingLeavesCount}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Attendance Roster breakdown & Department Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Attendance Breakdown Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Today's Attendance Status
              </h3>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Daily live punch status across all departments
              </div>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#1E3A8A',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Open Roster →
            </button>
          </div>

          {/* Visual Distribution Bar */}
          <div
            style={{
              height: '14px',
              borderRadius: '7px',
              backgroundColor: '#F1F5F9',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '16px',
            }}
          >
            <div style={{ width: `${(presentCount / totalHeadcount) * 100}%`, backgroundColor: '#10B981' }} title={`Present: ${presentCount}`} />
            <div style={{ width: `${(lateCount / totalHeadcount) * 100}%`, backgroundColor: '#F59E0B' }} title={`Late: ${lateCount}`} />
            <div style={{ width: `${(leaveCount / totalHeadcount) * 100}%`, backgroundColor: '#3B82F6' }} title={`On Leave: ${leaveCount}`} />
            <div style={{ width: `${(halfDayCount / totalHeadcount) * 100}%`, backgroundColor: '#8B5CF6' }} title={`Half Day: ${halfDayCount}`} />
            <div style={{ width: `${(absentCount / totalHeadcount) * 100}%`, backgroundColor: '#EF4444' }} title={`Absent: ${absentCount}`} />
          </div>

          {/* Grid of Status Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ padding: '10px', backgroundColor: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
              <div style={{ fontSize: '11px', color: '#065F46', fontWeight: 600 }}>On Time</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>{presentCount}</div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 600 }}>Late Mark</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>{lateCount}</div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600 }}>On Leave</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>{leaveCount}</div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#F5F3FF', borderRadius: '8px', border: '1px solid #DDD6FE' }}>
              <div style={{ fontSize: '11px', color: '#5B21B6', fontWeight: 600 }}>Half Day</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#7C3AED', marginTop: '2px' }}>{halfDayCount}</div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 600 }}>Absent</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>{absentCount}</div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Expected</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{stats.totalEmployees}</div>
            </div>
          </div>
        </div>

        {/* Department Headcount Breakdown */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Department Distribution
              </h3>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Workforce allocation by organizational unit
              </div>
            </div>
            <button
              onClick={() => onNavigate('departments')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#1E3A8A',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Manage Units →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {departments.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                Loading departmental metrics...
              </div>
            ) : (
              departments.map((dept) => {
                const count = dept._count?.employees || 0;
                const pct = Math.round((count / totalHeadcount) * 100);
                return (
                  <div key={dept.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>{dept.name} ({dept.code})</span>
                      <span style={{ color: '#64748B', fontWeight: 500 }}>
                        {count} employee{count !== 1 ? 's' : ''} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: '#1E3A8A',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recently Enrolled Employees Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Recent Employee Directory</h2>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Latest additions to the company personnel list</div>
          </div>
          <button
            onClick={() => onNavigate('employees')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#1E3A8A',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            View All Employees ({stats.totalEmployees}) →
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Employee Name</th>
                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Designation</th>
                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEmployees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 24px', fontWeight: 700, color: '#1E3A8A' }}>{emp.employeeCode}</td>
                  <td style={{ padding: '12px 24px', color: '#0F172A', fontWeight: 600 }}>
                    {emp.firstName} {emp.lastName}
                  </td>
                  <td style={{ padding: '12px 24px', color: '#475569' }}>{emp.department?.name || 'N/A'}</td>
                  <td style={{ padding: '12px 24px', color: '#475569' }}>{emp.designation?.title || 'N/A'}</td>
                  <td style={{ padding: '12px 24px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: emp.isActive ? '#ECFDF5' : '#FEF2F2',
                        color: emp.isActive ? '#059669' : '#DC2626',
                      }}
                    >
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
