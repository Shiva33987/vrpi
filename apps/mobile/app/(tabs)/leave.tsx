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
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileApiClient } from '../../services/api';

interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  leaveType: {
    code: string;
    name: string;
    isPaid: boolean;
  };
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

interface LeaveRequestItem {
  id: string;
  leaveTypeId: string;
  leaveType: {
    code: string;
    name: string;
  };
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
  reviewerComment?: string | null;
  createdAt: string;
}

interface LeaveType {
  id: string;
  code: string;
  name: string;
  isPaid: boolean;
}

export default function LeaveScreen() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Apply Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [balancesRes, requestsRes, typesRes] = await Promise.all([
        MobileApiClient.get<LeaveBalance[]>('/leave/balances').catch(() => []),
        MobileApiClient.get<LeaveRequestItem[]>('/leave/requests').catch(() => []),
        MobileApiClient.get<LeaveType[]>('/leave/types').catch(() => []),
      ]);

      setBalances(Array.isArray(balancesRes) ? balancesRes : []);
      setRequests(Array.isArray(requestsRes) ? requestsRes : []);
      setLeaveTypes(Array.isArray(typesRes) ? typesRes : []);

      if (Array.isArray(typesRes) && typesRes.length > 0) {
        setSelectedTypeId((prev) => prev || typesRes[0].id);
      }
    } catch (err: any) {
      console.warn('Failed to load leave data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openApplyModal = () => {
    // Default start date to tomorrow or today
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setIsHalfDay(false);
    setReason('');
    setFormError('');
    if (leaveTypes.length > 0) {
      setSelectedTypeId(leaveTypes[0].id);
    }
    setModalVisible(true);
  };

  const handleSubmitLeave = async () => {
    setFormError('');
    if (!selectedTypeId) {
      setFormError('Please select a leave type');
      return;
    }
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setFormError('Valid start date required (YYYY-MM-DD)');
      return;
    }
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      setFormError('Valid end date required (YYYY-MM-DD)');
      return;
    }
    if (startDate > endDate) {
      setFormError('Start date cannot be after end date');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setFormError('Reason must be at least 3 characters');
      return;
    }

    try {
      setSubmitting(true);
      await MobileApiClient.post('/leave/requests', {
        leaveTypeId: selectedTypeId,
        startDate,
        endDate,
        isHalfDay,
        reason: reason.trim(),
      });

      setModalVisible(false);
      Alert.alert('Success', 'Your leave request has been submitted for review.');
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#DCFCE7', text: '#15803D', label: 'Approved' };
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#B91C1C', label: 'Rejected' };
      case 'CANCELLED':
        return { bg: '#F1F5F9', text: '#64748B', label: 'Cancelled' };
      default:
        return { bg: '#FEF3C7', text: '#B45309', label: 'Pending' };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading leave balances...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />}
      >
        {/* Balances Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leave Balances</Text>
          <Text style={styles.sectionSubtitle}>Current calendar year</Text>
        </View>

        <View style={styles.balanceGrid}>
          {balances.length === 0 ? (
            <View style={styles.emptyBalanceCard}>
              <Text style={styles.emptyText}>No leave balances configured</Text>
            </View>
          ) : (
            balances.map((b) => (
              <View key={b.id || b.leaveTypeId} style={styles.balanceCard}>
                <View style={styles.balanceCardTop}>
                  <Text style={styles.balanceTypeCode}>{b.leaveType?.code || 'LV'}</Text>
                  <View style={styles.remainingPill}>
                    <Text style={styles.remainingDaysText}>{b.remainingDays ?? 0}</Text>
                    <Text style={styles.remainingLabel}>Left</Text>
                  </View>
                </View>
                <Text style={styles.balanceTypeName} numberOfLines={1}>
                  {b.leaveType?.name || 'Leave'}
                </Text>
                <View style={styles.balanceStatsRow}>
                  <Text style={styles.balanceStatItem}>
                    Used: <Text style={styles.statBold}>{b.usedDays ?? 0}</Text>
                  </Text>
                  <Text style={styles.balanceStatItem}>
                    Pending: <Text style={styles.statBold}>{b.pendingDays ?? 0}</Text>
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Apply Button */}
        <TouchableOpacity style={styles.applyButton} onPress={openApplyModal} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.applyButtonText}>Apply for Leave</Text>
        </TouchableOpacity>

        {/* Leave History Section */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={styles.sectionTitle}>My Leave Requests</Text>
          <Text style={styles.sectionSubtitle}>{requests.length} application(s)</Text>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyCardTitle}>No leave applications yet</Text>
            <Text style={styles.emptyCardSubtitle}>
              When you apply for leave, your requests and approvals will appear here.
            </Text>
          </View>
        ) : (
          requests.map((req) => {
            const badge = getStatusBadge(req.status);
            return (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestCardHeader}>
                  <View style={styles.requestTypeRow}>
                    <Text style={styles.requestTypeName}>{req.leaveType?.name || 'Leave'}</Text>
                    {req.isHalfDay && (
                      <View style={styles.halfDayBadge}>
                        <Text style={styles.halfDayText}>Half-Day</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <View style={styles.requestDatesRow}>
                  <Ionicons name="calendar-outline" size={15} color="#64748B" />
                  <Text style={styles.requestDatesText}>
                    {req.startDate} to {req.endDate}
                  </Text>
                  <Text style={styles.daysCountText}>({req.totalDays} day{req.totalDays > 1 ? 's' : ''})</Text>
                </View>

                {req.reason ? (
                  <View style={styles.reasonContainer}>
                    <Text style={styles.reasonLabel}>Reason:</Text>
                    <Text style={styles.reasonText}>{req.reason}</Text>
                  </View>
                ) : null}

                {req.reviewerComment ? (
                  <View style={styles.reviewerNoteContainer}>
                    <Ionicons name="information-circle-outline" size={14} color="#475569" />
                    <Text style={styles.reviewerNoteText}>Reviewer Note: {req.reviewerComment}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Apply Leave Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={16} color="#B91C1C" />
                  <Text style={styles.errorAlertText}>{formError}</Text>
                </View>
              ) : null}

              {/* Leave Type Selector */}
              <Text style={styles.inputLabel}>Leave Type *</Text>
              <View style={styles.typeSelectorRow}>
                {leaveTypes.map((t) => {
                  const isSelected = selectedTypeId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.typeOptionPill, isSelected && styles.typeOptionPillActive]}
                      onPress={() => setSelectedTypeId(t.id)}
                    >
                      <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextActive]}>
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Start Date */}
              <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.textInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-10-20"
                placeholderTextColor="#94A3B8"
              />

              {/* End Date */}
              <Text style={styles.inputLabel}>End Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.textInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-10-20"
                placeholderTextColor="#94A3B8"
              />

              {/* Half Day Switch */}
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Half Day</Text>
                  <Text style={styles.switchSubtitle}>Applies 0.5 day deduction</Text>
                </View>
                <Switch
                  value={isHalfDay}
                  onValueChange={(val) => {
                    setIsHalfDay(val);
                    if (val && startDate) {
                      setEndDate(startDate); // Single day for half-day
                    }
                  }}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={isHalfDay ? '#1E3A8A' : '#F8FAFC'}
                />
              </View>

              {/* Reason */}
              <Text style={styles.inputLabel}>Reason *</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={reason}
                onChangeText={setReason}
                placeholder="Brief reason for your leave application..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Action buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => setModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitModalButton, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmitLeave}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitModalText}>Submit Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  balanceCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  emptyBalanceCard: {
    width: '100%',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  balanceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTypeCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  remainingPill: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  remainingDaysText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E40AF',
  },
  remainingLabel: {
    fontSize: 9,
    color: '#3B82F6',
    fontWeight: '600',
  },
  balanceTypeName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  balanceStatsRow: {
    flexDirection: 'column',
    gap: 2,
  },
  balanceStatItem: {
    fontSize: 11,
    color: '#64748B',
  },
  statBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    minHeight: 48,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestTypeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  halfDayBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  halfDayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  requestDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  requestDatesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  daysCountText: {
    fontSize: 12,
    color: '#64748B',
  },
  reasonContainer: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  reviewerNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  reviewerNoteText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
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
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 6,
  },
  errorAlertText: {
    color: '#B91C1C',
    fontSize: 12,
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  typeOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  typeOptionPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 44,
  },
  multilineInput: {
    minHeight: 80,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
    paddingVertical: 4,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  switchSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  cancelModalButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitModalButton: {
    flex: 2,
    minHeight: 48,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  submitModalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
