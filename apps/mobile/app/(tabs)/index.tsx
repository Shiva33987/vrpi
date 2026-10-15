import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMobileAuthStore } from '../../stores/authStore';
import { MobileApiClient } from '../../services/api';

export default function HomeScreen() {
  const { user } = useMobileAuthStore();
  const router = useRouter();

  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statusRes, balRes] = await Promise.all([
        MobileApiClient.get('/attendance/today').catch(() => null),
        MobileApiClient.get('/leave/balances').catch(() => []),
      ]);
      setTodayStatus(statusRes);
      setBalances(Array.isArray(balRes) ? balRes : []);
    } catch (err) {
      console.error('Failed to load mobile home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickPunch = async () => {
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
      Alert.alert('Punch Error', err.message || 'Punch operation failed');
    } finally {
      setPunching(false);
    }
  };

  const employee = user?.employee;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
      }
    >
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.brandPill}>
          <Text style={styles.brandPillText}>Self-Service</Text>
        </View>
      </View>

      {/* Employee Greeting Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {employee?.firstName?.[0] || 'U'}
            {employee?.lastName?.[0] || ''}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>
            {employee ? `${employee.firstName} ${employee.lastName}` : user?.email}
          </Text>
          <Text style={styles.roleSubtext}>
            {employee?.employeeCode} • {employee?.department?.name || 'Department'}
          </Text>
        </View>
      </View>

      {/* Today's Attendance Punch Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="time-outline" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Today's Attendance</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: todayStatus?.isCheckedIn ? '#ECFDF5' : '#F1F5F9' },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: todayStatus?.isCheckedIn ? '#059669' : '#64748B' },
              ]}
            >
              {todayStatus?.isCheckedIn ? 'Checked In' : 'Not Punched'}
            </Text>
          </View>
        </View>

        {todayStatus?.record && (
          <View style={styles.timeLogs}>
            <Text style={styles.timeLogText}>
              In: {new Date(todayStatus.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {todayStatus.record.checkOutTime && (
              <Text style={styles.timeLogText}>
                Out: {new Date(todayStatus.record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.punchBtn,
            { backgroundColor: todayStatus?.isCheckedIn ? '#DC2626' : '#1E3A8A' },
          ]}
          onPress={handleQuickPunch}
          disabled={punching}
          activeOpacity={0.8}
        >
          {punching ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.punchBtnText}>
              {todayStatus?.isCheckedIn ? 'Punch Out' : 'Punch In'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Leave Balances Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="calendar-outline" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Leave Balances</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/leave')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceGrid}>
          {balances.map((b) => (
            <View key={b.id || Math.random().toString()} style={styles.balanceBox}>
              <Text style={styles.balanceNum}>{b.remainingDays ?? 0}</Text>
              <Text style={styles.balanceType}>{b.leaveType?.code || 'LV'}</Text>
              <Text style={styles.balanceSub}>days left</Text>
            </View>
          ))}
          {balances.length === 0 && (
            <Text style={styles.emptyText}>No balances found</Text>
          )}
        </View>
      </View>

      {/* Quick Action Tiles */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push('/(tabs)/leave')}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="add-circle-outline" size={24} color="#059669" />
          </View>
          <Text style={styles.tileText}>Apply Leave</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push('/(tabs)/attendance')}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="calendar-outline" size={24} color="#2563EB" />
          </View>
          <Text style={styles.tileText}>Logs History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push('/(tabs)/payslips')}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIcon, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="receipt-outline" size={24} color="#D97706" />
          </View>
          <Text style={styles.tileText}>My Payslips</Text>
        </TouchableOpacity>
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
    gap: 16,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  headerLogo: {
    width: 120,
    height: 34,
  },
  brandPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  profileCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  profileInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: '#BFDBFE',
    fontWeight: '500',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  roleSubtext: {
    fontSize: 12,
    color: '#93C5FD',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeLogs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  timeLogText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  punchBtn: {
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  balanceBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balanceNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  balanceType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  balanceSub: {
    fontSize: 10,
    color: '#64748B',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 80,
    justifyContent: 'center',
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
});
