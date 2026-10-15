import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMobileAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../services/api';

export default function ProfileScreen() {
  const { user, logout } = useMobileAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const employee = user?.employee;
  const fullName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : user?.email?.split('@')[0] || 'User';

  const initials = employee
    ? `${employee.firstName[0] || ''}${employee.lastName[0] || ''}`.toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of VRPI HRMS?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              await logout();
            } catch (err) {
              console.warn('Logout failed:', err);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.profileName}>{fullName}</Text>
        <Text style={styles.designationText}>
          {employee?.designation?.title || 'Team Member'}
        </Text>

        <View style={styles.badgeRow}>
          {employee?.department?.name && (
            <View style={styles.badgePill}>
              <Ionicons name="business-outline" size={12} color="#1E3A8A" />
              <Text style={styles.badgePillText}>{employee.department.name}</Text>
            </View>
          )}
          <View style={[styles.badgePill, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.badgePillText, { color: '#475569' }]}>{user?.role || 'EMPLOYEE'}</Text>
          </View>
        </View>
      </View>

      {/* Employment Details Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Employment Details</Text>
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="card-outline" size={18} color="#1E3A8A" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoLabel}>Employee Code</Text>
            <Text style={styles.infoValue}>{employee?.employeeCode || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="mail-outline" size={18} color="#1E3A8A" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoLabel}>Work Email</Text>
            <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="call-outline" size={18} color="#1E3A8A" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoLabel}>Contact Number</Text>
            <Text style={styles.infoValue}>{employee?.phone || 'Not provided'}</Text>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="people-outline" size={18} color="#1E3A8A" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoLabel}>Reporting Manager</Text>
            <Text style={styles.infoValue}>
              {employee?.manager
                ? `${employee.manager.firstName} ${employee.manager.lastName}`
                : 'Direct to Executive Management'}
            </Text>
          </View>
        </View>

        {employee?.joiningDate && (
          <>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="calendar-outline" size={18} color="#1E3A8A" />
              </View>
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Date of Joining</Text>
                <Text style={styles.infoValue}>
                  {new Date(employee.joiningDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Organization Details Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Organization</Text>
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="globe-outline" size={18} color="#1E3A8A" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>
              {user?.organization.name} ({user?.organization.code})
            </Text>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="time-outline" size={18} color="#1E3A8A" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoLabel}>Timezone</Text>
            <Text style={styles.infoValue}>{user?.organization.timezone || 'Asia/Kolkata (IST)'}</Text>
          </View>
        </View>
      </View>

      {/* App & System Info */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>System</Text>
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="phone-portrait-outline" size={18} color="#64748B" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={styles.infoValue}>
              VRPI Mobile v1.0.0 ({Platform.OS})
            </Text>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="cloud-done-outline" size={18} color="#16A34A" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoLabel}>Gateway</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {API_BASE_URL}
            </Text>
          </View>
        </View>
      </View>

      {/* Sign Out Action Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.8}
      >
        {loggingOut ? (
          <ActivityIndicator size="small" color="#DC2626" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.copyrightText}>
        © 2026 VRPI Technologies · All rights reserved
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  designationText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 48,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    minHeight: 48,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  copyrightText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 20,
  },
});
