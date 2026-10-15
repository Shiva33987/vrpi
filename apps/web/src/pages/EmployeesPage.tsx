import { useState, useEffect } from 'react';
import { ApiClient } from '../services/api';
import {
  Search,
  Plus,
  Upload,
  Download,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';

export function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    designationId: '',
    managerId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    role: 'EMPLOYEE',
    isActive: true,
  });

  const [formError, setFormError] = useState<string | null>(null);

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importReport, setImportReport] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  // Load employees
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 10,
      };
      if (search) params.search = search;
      if (selectedDept) params.departmentId = selectedDept;
      if (activeFilter !== 'all') params.isActive = activeFilter === 'true';

      const res = await ApiClient.get('/employees', params);
      setEmployees(res);
      // Fetch total
      const allRes = await ApiClient.get('/employees?limit=1000');
      setTotal(allRes.length);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load departments and designations
  useEffect(() => {
    async function loadMeta() {
      try {
        const [deptRes, desigRes] = await Promise.all([
          ApiClient.get('/departments'),
          ApiClient.get('/departments/designations'),
        ]);
        setDepartments(deptRes);
        setDesignations(desigRes);
        if (deptRes.length > 0 && !formData.departmentId) {
          setFormData((prev) => ({ ...prev, departmentId: deptRes[0].id }));
        }
      } catch (err) {
        console.error('Failed to load departments/designations:', err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [page, search, selectedDept, activeFilter]);

  // Handle Add Employee
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await ApiClient.post('/employees', {
        employeeCode: formData.employeeCode,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        departmentId: formData.departmentId,
        designationId: formData.designationId || designations[0]?.id,
        managerId: formData.managerId || undefined,
        joiningDate: formData.joiningDate,
        role: formData.role,
      });

      setShowAddModal(false);
      resetForm();
      loadEmployees();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create employee');
    }
  };

  // Handle Edit Employee
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await ApiClient.put(`/employees/${selectedEmployee.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        departmentId: formData.departmentId,
        designationId: formData.designationId,
        managerId: formData.managerId || null,
        isActive: formData.isActive,
      });

      setShowEditModal(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update employee');
    }
  };

  // Handle Deactivate
  const handleDeactivate = async () => {
    try {
      await ApiClient.delete(`/employees/${selectedEmployee.id}`);
      setShowDeactivateModal(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate employee');
    }
  };

  // Handle Export CSV
  const handleExport = async () => {
    try {
      const csvData = await ApiClient.get('/employees/export');
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `employees_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  // Handle CSV Import
  const handleImportSubmit = async () => {
    setImporting(true);
    setImportReport(null);
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length <= 1) {
        alert('Please paste CSV with a header row and at least one employee row');
        setImporting(false);
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        return {
          employeeCode: parts[0],
          firstName: parts[1],
          lastName: parts[2],
          email: parts[3],
          phone: parts[4] || undefined,
          departmentCode: parts[5],
          designationTitle: parts[6],
          joiningDate: parts[7] || new Date().toISOString().split('T')[0],
        };
      });

      const report = await ApiClient.post('/employees/import', { rows });
      setImportReport(report);
      loadEmployees();
    } catch (err: any) {
      alert(err.message || 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  const openEdit = (emp: any) => {
    setSelectedEmployee(emp);
    setFormData({
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || '',
      departmentId: emp.departmentId,
      designationId: emp.designationId,
      managerId: emp.managerId || '',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      role: emp.user?.role || 'EMPLOYEE',
      isActive: emp.isActive,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const openDeactivate = (emp: any) => {
    setSelectedEmployee(emp);
    setShowDeactivateModal(true);
  };

  const resetForm = () => {
    setFormData({
      employeeCode: `VRPI-${String(total + 1).padStart(3, '0')}`,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      departmentId: departments[0]?.id || '',
      designationId: designations[0]?.id || '',
      managerId: '',
      joiningDate: new Date().toISOString().split('T')[0],
      role: 'EMPLOYEE',
      isActive: true,
    });
    setFormError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
            Employee Directory
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
            Manage staff profiles, department assignments, and system access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setCsvText(
                'EmployeeCode,FirstName,LastName,Email,Phone,DepartmentCode,DesignationTitle,JoiningDate\nVRPI-099,Arun,Prasad,arun.prasad@vrpi.com,+91-9876543299,ENG,Junior Software Developer,2026-03-01'
              );
              setImportReport(null);
              setShowImportModal(true);
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
            <Upload size={15} />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExport}
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
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
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
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search by name, employee ID, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Department Filter */}
        <div style={{ minWidth: '180px' }}>
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ minWidth: '140px' }}>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fff',
            }}
          >
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Employees Table Container */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Employee</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Designation</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Reporting Manager</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    Loading employee directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {/* Employee Name & Email */}
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: '#1E3A8A',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '12px',
                          }}
                        >
                          {emp.firstName[0]}
                          {emp.lastName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#1E3A8A' }}>
                      {emp.employeeCode}
                    </td>

                    {/* Department */}
                    <td style={{ padding: '12px 20px', color: '#334155' }}>
                      {emp.department?.name || '—'}
                    </td>

                    {/* Designation */}
                    <td style={{ padding: '12px 20px', color: '#334155' }}>
                      {emp.designation?.title || '—'}
                    </td>

                    {/* Manager */}
                    <td style={{ padding: '12px 20px', color: '#64748B' }}>
                      {emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : '—'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 20px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: emp.isActive ? '#ECFDF5' : '#FEF2F2',
                          color: emp.isActive ? '#059669' : '#DC2626',
                        }}
                      >
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => openEdit(emp)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                          title="Edit Employee"
                        >
                          <Edit2 size={14} />
                        </button>
                        {emp.isActive && (
                          <button
                            onClick={() => openDeactivate(emp)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                            title="Deactivate Employee"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: '#64748B',
          }}
        >
          <div>
            Showing <strong>{employees.length}</strong> of <strong>{total}</strong> employees
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: page <= 1 ? '#94A3B8' : '#334155',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
              }}
            >
              Previous
            </button>
            <button
              disabled={employees.length < 10}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: employees.length < 10 ? '#94A3B8' : '#334155',
                cursor: employees.length < 10 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Add Employee */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Add New Employee</h2>
              <button onClick={() => setShowAddModal(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {formError && (
              <div style={errorBannerStyle}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Employee Code</label>
                  <input
                    required
                    style={inputStyle}
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Corporate Email</label>
                  <input
                    required
                    type="email"
                    style={inputStyle}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input
                    required
                    style={inputStyle}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    required
                    style={inputStyle}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Department</label>
                  <select
                    required
                    style={inputStyle}
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Designation</label>
                  <select
                    required
                    style={inputStyle}
                    value={formData.designationId}
                    onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                  >
                    {designations.map((des) => (
                      <option key={des.id} value={des.id}>{des.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input
                    style={inputStyle}
                    placeholder="+91-9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Joining Date</label>
                  <input
                    type="date"
                    required
                    style={inputStyle}
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Role Assignment</label>
                <select
                  style={inputStyle}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="EMPLOYEE">Employee (Self-service only)</option>
                  <option value="HR">HR (Operations, review leaves)</option>
                  <option value="HR_ADMIN">HR Admin (Full management)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" style={submitBtnStyle}>Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Employee */}
      {showEditModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Edit Employee Profile</h2>
              <button onClick={() => setShowEditModal(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {formError && (
              <div style={errorBannerStyle}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input
                    required
                    style={inputStyle}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    required
                    style={inputStyle}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Department</label>
                  <select
                    style={inputStyle}
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Designation</label>
                  <select
                    style={inputStyle}
                    value={formData.designationId}
                    onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                  >
                    {designations.map((des) => (
                      <option key={des.id} value={des.id}>{des.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  style={inputStyle}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>
                  Active Employment Status
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" style={submitBtnStyle}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deactivate Employee Confirmation */}
      {showDeactivateModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#DC2626', marginBottom: '14px' }}>
              <AlertTriangle size={24} />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Deactivate Employee?</h2>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to deactivate <strong>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</strong> ({selectedEmployee?.employeeCode})?
            </p>
            <div style={{ backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#991B1B', marginBottom: '20px' }}>
              ✓ Employee record will be marked inactive (soft deleted).<br />
              ✓ Corporate user account will lose access immediately.<br />
              ✓ All active login sessions across Web and Mobile will be revoked.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowDeactivateModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button
                onClick={handleDeactivate}
                style={{
                  ...submitBtnStyle,
                  backgroundColor: '#DC2626',
                }}
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CSV Import */}
      {showImportModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '640px' }}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Bulk CSV Import</h2>
              <button onClick={() => setShowImportModal(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748B' }}>
              Paste comma-separated employee records with the standard format.
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />

            {importReport && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px 14px', borderRadius: '6px', backgroundColor: '#ECFDF5', color: '#059669', fontSize: '13px', fontWeight: 600 }}>
                    ✓ Imported: {importReport.importedCount}
                  </div>
                  <div style={{ padding: '8px 14px', borderRadius: '6px', backgroundColor: importReport.failedCount > 0 ? '#FEF2F2' : '#F1F5F9', color: importReport.failedCount > 0 ? '#DC2626' : '#64748B', fontSize: '13px', fontWeight: 600 }}>
                    Errors: {importReport.failedCount}
                  </div>
                </div>

                {importReport.errors.length > 0 && (
                  <div style={{ maxHeight: '140px', overflowY: 'auto', backgroundColor: '#FFF1F2', padding: '10px', borderRadius: '6px', border: '1px solid #FECDD3' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#BE123C', marginBottom: '4px' }}>Validation Errors:</div>
                    {importReport.errors.map((err: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '11px', color: '#9F1239' }}>
                        Row {err.row} ({err.field}): {err.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowImportModal(false)} style={cancelBtnStyle}>Close</button>
              <button
                disabled={importing}
                onClick={handleImportSubmit}
                style={{
                  ...submitBtnStyle,
                  opacity: importing ? 0.7 : 1,
                }}
              >
                {importing ? 'Validating...' : 'Validate & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Styles
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
  maxWidth: '540px',
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
