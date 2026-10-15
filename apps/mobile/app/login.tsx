import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useMobileAuthStore } from '../stores/authStore';
import { getApiBaseUrl, setApiBaseUrl, loadStoredApiBaseUrl } from '../services/api';

export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useMobileAuthStore();

  const [email, setEmail] = useState('priya.patel@vrpi.com');
  const [password, setPassword] = useState('Admin123!');
  const [orgCode, setOrgCode] = useState('VRPI');

  // Server URL settings state
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [activeServerUrl, setActiveServerUrl] = useState('');
  const [testingServer, setTestingServer] = useState(false);
  const [serverStatusMsg, setServerStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    loadStoredApiBaseUrl().then((url) => {
      setActiveServerUrl(url);
      setServerUrlInput(url);
    });
  }, []);

  const handleTestAndSaveServer = async () => {
    if (!serverUrlInput.trim()) {
      setServerStatusMsg({ text: 'Please enter a server URL', isError: true });
      return;
    }
    setTestingServer(true);
    setServerStatusMsg(null);
    try {
      let candidate = serverUrlInput.trim().replace(/\/+$/, '');
      if (!candidate.endsWith('/api/v1')) {
        candidate = `${candidate}/api/v1`;
      }
      // Test root health or api status endpoint
      const rootUrl = candidate.replace(/\/api\/v1$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      let isReachable = false;
      try {
        const res = await fetch(`${candidate}/status`, { signal: controller.signal });
        if (res.ok || res.status === 200 || res.status === 304) isReachable = true;
      } catch {
        // try fallback /health
        try {
          const res2 = await fetch(`${rootUrl}/health`, { signal: controller.signal });
          if (res2.ok || res2.status === 200) isReachable = true;
        } catch {
          isReachable = false;
        }
      } finally {
        clearTimeout(timeoutId);
      }

      await setApiBaseUrl(candidate);
      setActiveServerUrl(candidate);
      if (isReachable) {
        setServerStatusMsg({ text: 'Connected successfully!', isError: false });
      } else {
        setServerStatusMsg({
          text: 'Saved! (Warning: Backend not reachable right now, check tunnel/internet)',
          isError: true,
        });
      }
    } catch (err: any) {
      setServerStatusMsg({ text: `Failed to save: ${err.message}`, isError: true });
    } finally {
      setTestingServer(false);
    }
  };

  const handleLogin = async () => {
    clearError();
    try {
      await login(email, password, orgCode);
    } catch {
      // Error handled by store
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Admin123!');
    setOrgCode('VRPI');
    clearError();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Brand */}
          <View style={styles.header}>
            <View style={styles.brandBadge}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandTitle}>VRPI HRMS</Text>
            <Text style={styles.brandSubtitle}>Employee Self-Service Mobile</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Corporate Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@vrpi.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Organization Code</Text>
              <TextInput
                style={styles.input}
                value={orgCode}
                onChangeText={(val) => setOrgCode(val.toUpperCase())}
                placeholder="VRPI"
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Fill */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>QUICK DEMO ACCOUNTS (Admin123!)</Text>
              <View style={styles.demoButtonGroup}>
                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => handleQuickDemo('priya.patel@vrpi.com')}
                >
                  <Text style={styles.demoBtnText}>Priya (Engineer)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => handleQuickDemo('rahul.sharma@vrpi.com')}
                >
                  <Text style={styles.demoBtnText}>Rahul (Lead)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => handleQuickDemo('hradmin@vrpi.com')}
                >
                  <Text style={styles.demoBtnText}>HR Admin</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Server Endpoint Settings Toggle */}
            <View style={styles.serverSection}>
              <TouchableOpacity
                style={styles.serverToggleBtn}
                onPress={() => setShowServerModal(!showServerModal)}
                activeOpacity={0.7}
              >
                <Text style={styles.serverToggleText}>
                  ⚙️ Server: {activeServerUrl ? activeServerUrl.replace(/^https?:\/\//, '').split('/')[0] : 'Detecting...'}
                </Text>
                <Text style={styles.serverToggleAction}>
                  {showServerModal ? 'Hide' : 'Change'}
                </Text>
              </TouchableOpacity>

              {showServerModal && (
                <View style={styles.serverBox}>
                  <Text style={styles.serverBoxTitle}>Backend Server URL</Text>
                  <Text style={styles.serverBoxSubtitle}>
                    Connect to your Cloudflare tunnel, Render, or public API:
                  </Text>
                  <TextInput
                    style={styles.serverInput}
                    value={serverUrlInput}
                    onChangeText={setServerUrlInput}
                    placeholder="https://your-tunnel.trycloudflare.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {serverStatusMsg && (
                    <View
                      style={[
                        styles.statusBanner,
                        serverStatusMsg.isError ? styles.statusError : styles.statusSuccess,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          serverStatusMsg.isError ? styles.statusTextError : styles.statusTextSuccess,
                        ]}
                      >
                        {serverStatusMsg.text}
                      </Text>
                    </View>
                  )}

                  <View style={styles.serverActions}>
                    <TouchableOpacity
                      style={styles.serverSaveBtn}
                      onPress={handleTestAndSaveServer}
                      disabled={testingServer}
                    >
                      {testingServer ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.serverSaveBtnText}>Test & Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandBadge: {
    width: 180,
    height: 68,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#BFDBFE',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  loginButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  demoButtonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    minHeight: 36,
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  serverSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  serverToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  serverToggleText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  serverToggleAction: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 8,
  },
  serverBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serverBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  serverBoxSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  serverInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  statusBanner: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusText: {
    fontSize: 11,
  },
  statusTextError: {
    color: '#DC2626',
  },
  statusTextSuccess: {
    color: '#16A34A',
  },
  serverActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  serverSaveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
