import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useMobileAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const { isAuthenticated, isLoading, isOffline, restoreSession } = useMobileAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const onLoginPage = segments[0] === 'login';

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && onLoginPage) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.brandIcon}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.loadingTitle}>VRPI HRMS</Text>
        <ActivityIndicator size="small" color="#1E3A8A" style={{ marginTop: 14 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="light" />

      {/* Sticky Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            ⚠️ Offline Mode: Showing cached data. Write actions are paused.
          </Text>
        </View>
      )}

      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: '#1E3A8A' },
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  brandIcon: {
    width: 170,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    alignItems: 'center',
  },
  offlineText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
});
