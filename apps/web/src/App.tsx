import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { OverviewPage } from './pages/OverviewPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeavePage } from './pages/LeavePage';
import { Banknote } from 'lucide-react';

export function App() {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const [currentTab, setCurrentTab] = useState('overview');

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          color: '#1E3A8A',
          fontSize: '16px',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#1E3A8A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800,
            }}
          >
            VR
          </div>
          <div>Loading VRPI HRMS Portal...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <DashboardLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'overview' && <OverviewPage onNavigate={setCurrentTab} />}
      {currentTab === 'employees' && <EmployeesPage />}
      {currentTab === 'departments' && <DepartmentsPage />}
      {currentTab === 'attendance' && <AttendancePage />}
      {currentTab === 'leave' && <LeavePage />}

      {currentTab === 'payroll' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '36px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <Banknote size={40} color="#D97706" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>Payroll & Salary Records</h2>
          <p style={{ color: '#64748B', maxWidth: '480px', margin: '0 auto' }}>
            Base salary records, allowances, deductions, and payslip distribution management (MVP Scope).
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}

export default App;
