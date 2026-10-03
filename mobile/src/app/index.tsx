import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';

export default function HomeScreen() {
  const { user, ready, login, register, logout } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!ready) return <View style={styles.center}><ActivityIndicator color="#2A7A5B" /></View>;
  SplashScreen.hideAsync();

  if (user) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.signedIn}>
        <Text style={styles.eyebrow}>TRAILGUARD</Text>
        <Text style={styles.title}>You’re signed in.</Text>
        <Text style={styles.copy}>Welcome, {user.name}. Your safety dashboard is next.</Text>
        <Pressable style={styles.secondaryButton} onPress={logout}><Text style={styles.secondaryButtonText}>Sign out</Text></Pressable>
      </View>
    </SafeAreaView>
  );

  async function submit() {
    setError('');
    if (isSignup && !name.trim()) return setError('Enter your name.');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setSubmitting(true);
    try {
      if (isSignup) await register(name, email, password);
      else await login(email, password);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
    } finally { setSubmitting(false); }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>TRAILGUARD</Text>
        <Text style={styles.title}>{isSignup ? 'Start moving safer.' : 'Welcome back.'}</Text>
        <Text style={styles.copy}>{isSignup ? 'Create your account to build a safety plan for every adventure.' : 'Sign in to continue your safety plan.'}</Text>
        <View style={styles.form}>
          {isSignup && <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" />}
          <TextInput style={styles.input} placeholder="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Password (8+ characters)" value={password} onChangeText={setPassword} autoComplete={isSignup ? 'new-password' : 'current-password'} secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.primaryButton, submitting && styles.disabled]} onPress={submit} disabled={submitting}><Text style={styles.primaryButtonText}>{submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</Text></Pressable>
        </View>
        <Pressable onPress={() => { setIsSignup(!isSignup); setError(''); }}><Text style={styles.switchText}>{isSignup ? 'Already have an account? Sign in' : 'New to TrailGuard? Create an account'}</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7F3' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7F3' },
  container: { flex: 1, justifyContent: 'center', padding: 28 },
  signedIn: { flex: 1, justifyContent: 'center', padding: 28 },
  eyebrow: { color: '#2A7A5B', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#13231C', fontSize: 36, fontWeight: '800', marginTop: 12 },
  copy: { color: '#526158', fontSize: 16, lineHeight: 24, marginTop: 12 },
  form: { gap: 12, marginTop: 32 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#DCE4DD', borderRadius: 12, borderWidth: 1, color: '#13231C', fontSize: 16, minHeight: 54, paddingHorizontal: 16 },
  error: { color: '#B42318', fontSize: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2A7A5B', borderRadius: 12, minHeight: 54, justifyContent: 'center', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', borderColor: '#2A7A5B', borderRadius: 12, borderWidth: 1, justifyContent: 'center', marginTop: 32, minHeight: 54 },
  secondaryButtonText: { color: '#2A7A5B', fontSize: 16, fontWeight: '700' },
  switchText: { color: '#2A7A5B', fontSize: 15, fontWeight: '700', marginTop: 24, textAlign: 'center' },
  disabled: { opacity: 0.65 },
});
