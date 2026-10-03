import { Link, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';

export default function RegisterScreen() {
  const { ready, register, user } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!ready) return <View style={styles.center}><ActivityIndicator color="#2563EB" /></View>;
  SplashScreen.hideAsync();

  if (user) {
    router.replace('/');
  }

  async function submit() {
    setError('');
    if (!name.trim()) return setError('Enter your full name.');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    
    setSubmitting(true);
    try {
      await register(name, email, password);
      router.replace('/');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create account.');
    } finally { 
      setSubmitting(false); 
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.eyebrow}>APP NAME</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.copy}>Join us to get started.</Text>
          <View style={styles.form}>
            <TextInput 
              style={styles.input} 
              placeholder="Full name" 
              value={name} 
              onChangeText={setName} 
              autoCapitalize="words" 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Email address" 
              value={email} 
              onChangeText={setEmail} 
              autoCapitalize="none" 
              autoComplete="email" 
              keyboardType="email-address" 
            />
            <View style={styles.passwordContainer}>
              <TextInput 
                style={[styles.input, styles.passwordInput]} 
                placeholder="Password (8+ characters)" 
                value={password} 
                onChangeText={setPassword} 
                autoComplete="new-password" 
                secureTextEntry={!showPassword} 
              />
              <Pressable style={styles.showPasswordButton} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={[styles.input, styles.passwordInput]} 
                placeholder="Confirm password" 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                autoComplete="new-password" 
                secureTextEntry={!showPassword} 
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.primaryButton, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
              <Text style={styles.primaryButtonText}>{submitting ? 'Please wait…' : 'Create Account'}</Text>
            </Pressable>
          </View>
          <Link href="/login" asChild>
            <Pressable style={styles.switchLink}>
              <Text style={styles.switchText}>Already have an account? <Text style={styles.switchTextBold}>Sign in</Text></Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { flexGrow: 1 },
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
  error: { color: '#DC2626', fontSize: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, minHeight: 54, justifyContent: 'center', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  switchLink: { marginTop: 24, alignItems: 'center' },
  switchText: { color: '#475569', fontSize: 15 },
  switchTextBold: { color: '#2563EB', fontWeight: '700' },
  disabled: { opacity: 0.65 },
});
