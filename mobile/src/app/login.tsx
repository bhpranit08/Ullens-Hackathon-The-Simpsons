import { Link, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';

export default function LoginScreen() {
  const { ready, login, user } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!ready) return <View style={styles.center}><ActivityIndicator color="#2563EB" /></View>;
  SplashScreen.hideAsync();

  // If already logged in, we might want to redirect, but for this task we'll just show a simple message or let it be handled by layout.
  if (user) {
    // Basic redirect to index if already logged in.
    router.replace('/');
  }

  async function submit() {
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
    } finally { 
      setSubmitting(false); 
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>APP NAME</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.copy}>Sign in to your account.</Text>
        <View style={styles.form}>
          <TextInput 
            style={styles.input} 
            placeholder="Email or username" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            autoComplete="email" 
            keyboardType="email-address" 
          />
          <View style={styles.passwordContainer}>
            <TextInput 
              style={[styles.input, styles.passwordInput]} 
              placeholder="Password" 
              value={password} 
              onChangeText={setPassword} 
              autoComplete="current-password" 
              secureTextEntry={!showPassword} 
            />
            <Pressable style={styles.showPasswordButton} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
          <View style={styles.forgotPasswordContainer}>
            <Pressable onPress={() => {/* Handle forgot password */}}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.primaryButton, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
            <Text style={styles.primaryButtonText}>{submitting ? 'Please wait…' : 'Sign in'}</Text>
          </Pressable>
        </View>
        <Link href="/register" asChild>
          <Pressable style={styles.switchLink}>
            <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchTextBold}>Create Account</Text></Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, justifyContent: 'center', padding: 28 },
  eyebrow: { color: '#2563EB', fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: '#0F172A', fontSize: 36, fontWeight: '800', marginTop: 12 },
  copy: { color: '#475569', fontSize: 16, lineHeight: 24, marginTop: 12 },
  form: { gap: 12, marginTop: 32 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, color: '#0F172A', fontSize: 16, minHeight: 54, paddingHorizontal: 16 },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 60 },
  showPasswordButton: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  showPasswordText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  forgotPasswordContainer: { alignItems: 'flex-end', marginTop: -4, marginBottom: 4 },
  forgotPasswordText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  error: { color: '#DC2626', fontSize: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, minHeight: 54, justifyContent: 'center', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  switchLink: { marginTop: 24, alignItems: 'center' },
  switchText: { color: '#475569', fontSize: 15 },
  switchTextBold: { color: '#2563EB', fontWeight: '700' },
  disabled: { opacity: 0.65 },
});
