import { Redirect } from 'expo-router';
import { useMobileAuthStore } from '../stores/authStore';

export default function Index() {
  const { isAuthenticated, isLoading } = useMobileAuthStore();

  if (isLoading) {
    return null;
  }

  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}
