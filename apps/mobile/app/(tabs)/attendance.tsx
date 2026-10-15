import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileApiClient } from '../../services/api';

export default function AttendanceScreen() {
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [todayRes, historyRes] = await Promise.all([
        MobileApiClient.get('/attendance/today').catch(() => null),
        MobileApiClient.get('/attendance/history').catch(() => []),
      ]);
      setTodayStatus(todayRes);
      setHistory(historyRes);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePunch = async () => {
    setPunching(true);
    try {
      const idempotencyKey = `mob-punch-${Date.now()}`;
      if (todayStatus?.isCheckedIn) {
        await MobileApiClient.post('/attendance/check-out', { idempotencyKey });
      } else {
        await MobileApiClient.post('/attendance/check-in', { idempotencyKey });
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record punch');
    } finally {
      setPunching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { bg: '#ECFDF5', color: '#059669', text: 'Present' };
      case 'LATE':
        return { bg: '#FFFBEB', color: '#D97706', text: 'Late' };
      case 'HALF_DAY':
        return { bg: '#EFF6FF', color: '#2563EB', text: 'Half-Day' };
      default:
        return { bg: '#FEF2F2', color: '#DC2626', text: 'Absent' };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
      }
    >
      {/* Punch Action Card */}
      <View style={styles.punchCard}>
        <Text style={styles.cardHeader}>Today's Timecard</Text>
        <Text style={styles.dateSubtitle}>
          {todayStatus?.todayDate ? new Date(todayStatus.todayDate).toDateString() : 'Today'}
        </Text>

        <View style={styles.timeDisplay}>
          <Text style={styles.statusLabel}>
            Status: {todayStatus?.isCheckedIn ? 'Checked In' : 'Checked Out / Away'}
          </Text>
          {todayStatus?.record && (
            <View style={styles.punchTimesRow}>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Check In</Text>
                <Text style={styles.timeValue}>
                  {new Date(todayStatus.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Check Out</Text>
                <Text style={styles.timeValue}>
                  {todayStatus.record.checkOutTime
                    ? new Date(todayStatus.record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </Text>
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Total</Text>
                <Text style={styles.timeValue}>
                  {todayStatus.record.totalMinutes ? `${Math.floor(todayStatus.record.totalMinutes / 60)}h ${todayStatus.record.totalMinutes % 60}m` : 'Active'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.punchBtn,
            { backgroundColor: todayStatus?.isCheckedIn ? '#DC2626' : '#1E3A8A' },
          ]}
          onPress={handlePunch}
          disabled={punching}
          activeOpacity={0.8}
        >
          {punching ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.punchBtnText}>
              {todayStatus?.isCheckedIn ? 'Check Out' : 'Check In'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* History Log List */}
      <View style={styles.historySection}>
        <Text style={styles.sectionHeader}>Monthly Attendance Logs</Text>

        {loading ? (
          <ActivityIndicator color="#1E3A8A" style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No attendance records for this month</Text>
          </View>
        ) : (
          history.map((item) => {
            const badge = getStatusBadge(item.status);
            const dateStr = item.date ? item.date.split('T')[0] : '';
            return (
              <View key={item.id} style={styles.logCard}>
                <View style={styles.logLeft}>
                  <Text style={styles.logDate}>{dateStr}</Text>
                  <Text style={styles.logTimes}>
                    {new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {item.checkOutTime
                      ? new Date(item.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Open'}
                  </Text>
                </View>

                <View style={styles.logRight}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                  </View>
                  {item.totalMinutes ? (
                    <Text style={styles.durationText}>
                      {Math.floor(item.totalMinutes / 60)}h {item.totalMinutes % 60}m
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  punchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  timeDisplay: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  punchTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  timeCol: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  punchBtn: {
    minHeight: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  historySection: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logLeft: {},
  logDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  logTimes: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  durationText: {
    fontSize: 11,
    color: '#475569',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
});
