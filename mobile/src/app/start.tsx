import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';

export default function StartSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activity, setActivity] = useState<string>('Cycling');
  const [title, setTitle] = useState('');
  const [trustedContact, setTrustedContact] = useState('');

  const activities = ['Cycling', 'Running', 'Trekking'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>New Session</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.container}>
          <Text style={styles.sectionTitle}>Select Activity</Text>
          <View style={styles.activityGrid}>
            {activities.map((act) => (
              <Pressable
                key={act}
                style={[styles.activityCard, activity === act && styles.activityCardActive]}
                onPress={() => setActivity(act)}
              >
                <Text style={[styles.activityText, activity === act && styles.activityTextActive]}>
                  {act}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Session Details</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Session Title / Area</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning Ride in Central Park"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Trusted Contact (Email)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter contact's email"
              placeholderTextColor="#94A3B8"
              value={trustedContact}
              onChangeText={setTrustedContact}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={styles.primaryButton} 
          onPress={() => router.push('/session/active')}
        >
          <Text style={styles.primaryButtonText}>Start Safety Session</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { flexGrow: 1, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  backButton: { width: 60 },
  backButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  container: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16, marginTop: 8 },
  activityGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  activityCard: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  activityCardActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB', borderWidth: 2 },
  activityText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  activityTextActive: { color: '#1E3A8A' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, fontSize: 16, color: '#0F172A' },

  footer: { padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  primaryButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' }
});
