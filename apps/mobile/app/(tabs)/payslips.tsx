import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileApiClient } from '../../services/api';

interface Payslip {
  id: string;
  month: number;
  year: number;
  grossPay: string | number;
  netPay: string | number;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string | null;
  createdAt: string;
  employee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: { name: string };
    designation?: { title: string };
  };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function PayslipsScreen() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const fetchPayslips = useCallback(async () => {
    try {
      const data = await MobileApiClient.get<Payslip[]>('/payroll/payslips');
      setPayslips(data || []);
    } catch (err: any) {
      console.warn('Failed to fetch payslips:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayslips();
  };

  const formatCurrency = (val: string | number) => {
    const num = Number(val);
    if (isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const latestPayslip = payslips.length > 0 ? payslips[0] : null;

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading payslips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />}
      >
        {/* Latest Payslip Highlight */}
        {latestPayslip && (
          <View style={styles.highlightCard}>
            <View style={styles.highlightHeader}>
              <View>
                <Text style={styles.highlightSubtitle}>Latest Statement</Text>
                <Text style={styles.highlightTitle}>
                  {MONTH_NAMES[latestPayslip.month - 1]} {latestPayslip.year}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{latestPayslip.status}</Text>
              </View>
            </View>

            <View style={styles.highlightAmountRow}>
              <Text style={styles.highlightAmountLabel}>Net Take-Home</Text>
              <Text style={styles.highlightAmountValue}>{formatCurrency(latestPayslip.netPay)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.highlightFooter}>
              <View style={styles.subPayCol}>
                <Text style={styles.subPayLabel}>Gross Earnings</Text>
                <Text style={styles.subPayValue}>{formatCurrency(latestPayslip.grossPay)}</Text>
              </View>

              <View style={styles.subPayCol}>
                <Text style={styles.subPayLabel}>Deductions</Text>
                <Text style={[styles.subPayValue, { color: '#DC2626' }]}>
                  {formatCurrency(Number(latestPayslip.grossPay) - Number(latestPayslip.netPay))}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewBreakdownButton}
                onPress={() => setSelectedPayslip(latestPayslip)}
                activeOpacity={0.8}
              >
                <Text style={styles.viewBreakdownText}>Details</Text>
                <Ionicons name="chevron-forward" size={14} color="#1E3A8A" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* History List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Statement History</Text>
          <Text style={styles.sectionSubtitle}>{payslips.length} payslip(s) available</Text>
        </View>

        {payslips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyCardTitle}>No payslips available</Text>
            <Text style={styles.emptyCardSubtitle}>
              Monthly salary statements issued by HR will be listed here.
            </Text>
          </View>
        ) : (
          payslips.map((ps) => {
            const deductions = Number(ps.grossPay) - Number(ps.netPay);
            return (
              <TouchableOpacity
                key={ps.id}
                style={styles.historyCard}
                onPress={() => setSelectedPayslip(ps)}
                activeOpacity={0.7}
              >
                <View style={styles.historyIconBox}>
                  <Ionicons name="document-text" size={22} color="#1E3A8A" />
                </View>

                <View style={styles.historyDetails}>
                  <Text style={styles.historyMonth}>
                    {MONTH_NAMES[ps.month - 1]} {ps.year}
                  </Text>
                  <Text style={styles.historySub}>
                    Gross: {formatCurrency(ps.grossPay)} · Ded: {formatCurrency(deductions)}
                  </Text>
                </View>

                <View style={styles.historyRight}>
                  <Text style={styles.historyNetPay}>{formatCurrency(ps.netPay)}</Text>
                  <View style={styles.historyStatusPill}>
                    <Text style={styles.historyStatusText}>{ps.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Payslip Details Modal */}
      {selectedPayslip && (
        <Modal visible={true} animationType="slide" transparent onRequestClose={() => setSelectedPayslip(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Salary Statement</Text>
                  <Text style={styles.modalSubtitle}>
                    {MONTH_NAMES[selectedPayslip.month - 1]} {selectedPayslip.year}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedPayslip(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Employee Info Header */}
                <View style={styles.empInfoBox}>
                  <Text style={styles.empName}>
                    {selectedPayslip.employee
                      ? `${selectedPayslip.employee.firstName} ${selectedPayslip.employee.lastName}`
                      : 'Employee'}
                  </Text>
                  <Text style={styles.empMeta}>
                    ID: {selectedPayslip.employee?.employeeCode || 'N/A'} ·{' '}
                    {selectedPayslip.employee?.department?.name || 'VRPI HRMS'}
                  </Text>
                </View>

                {/* Earnings breakdown */}
                <Text style={styles.breakdownSectionTitle}>Earnings</Text>
                <View style={styles.breakdownTable}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Gross Earnings</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(selectedPayslip.grossPay)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Allowances & Benefits</Text>
                    <Text style={styles.breakdownValue}>Included</Text>
                  </View>
                </View>

                {/* Deductions breakdown */}
                <Text style={styles.breakdownSectionTitle}>Deductions & Taxes</Text>
                <View style={styles.breakdownTable}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Statutory PF & Taxes</Text>
                    <Text style={[styles.breakdownValue, { color: '#DC2626' }]}>
                      {formatCurrency(Number(selectedPayslip.grossPay) - Number(selectedPayslip.netPay))}
                    </Text>
                  </View>
                </View>

                {/* Net Pay Total */}
                <View style={styles.netTotalCard}>
                  <Text style={styles.netTotalLabel}>Net Amount Disbursed</Text>
                  <Text style={styles.netTotalValue}>{formatCurrency(selectedPayslip.netPay)}</Text>
                  <Text style={styles.netTotalCurrency}>Currency: INR (₹)</Text>
                </View>

                {/* Download / Action */}
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => {
                    Alert.alert(
                      'Download Statement',
                      `Payslip for ${MONTH_NAMES[selectedPayslip.month - 1]} ${
                        selectedPayslip.year
                      } has been queued for PDF generation.`,
                      [{ text: 'OK' }]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.downloadButtonText}>Download Statement PDF</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  highlightCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  highlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  highlightSubtitle: {
    fontSize: 12,
    color: '#93C5FD',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  highlightTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  highlightAmountRow: {
    marginTop: 20,
    marginBottom: 16,
  },
  highlightAmountLabel: {
    fontSize: 13,
    color: '#BFDBFE',
  },
  highlightAmountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 12,
  },
  highlightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPayCol: {
    gap: 2,
  },
  subPayLabel: {
    fontSize: 11,
    color: '#93C5FD',
  },
  subPayValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewBreakdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  viewBreakdownText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  historyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
    gap: 2,
  },
  historyMonth: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  historySub: {
    fontSize: 12,
    color: '#64748B',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyNetPay: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyStatusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  empInfoBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  empName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  empMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  breakdownSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  breakdownTable: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#475569',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  netTotalCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  netTotalLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  netTotalValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E3A8A',
    marginVertical: 4,
  },
  netTotalCurrency: {
    fontSize: 11,
    color: '#3B82F6',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    minHeight: 48,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
