import * as SplashScreen from 'expo-splash-screen';
import { Redirect, Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/auth';

export default function HomeScreen() {
  const { user, ready, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  if (!ready) return <View style={styles.center}><ActivityIndicator color="#2563EB" /></View>;
  SplashScreen.hideAsync();

  if (!user) {
    return <Redirect href="/login" />;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header Area */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{user.name}</Text>
          </View>
          <Pressable onPress={() => setShowProfile(true)} style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        {/* Safety Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>Currently Safe</Text>
          </View>
          <Text style={styles.statusSubtext}>No active safety sessions right now. Stay prepared for your next adventure.</Text>
        </View>

        {/* Primary Action */}
        <Link href="/start" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start Activity</Text>
          </Pressable>
        </Link>

        {/* Recent Activities — Real Data Only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          <View style={styles.emptyState}>
            <Feather name="activity" size={40} color="#2563EB" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateTitle}>No activities yet</Text>
            <Text style={styles.emptyStateText}>Start your first activity to see your progress here.</Text>
          </View>
        </View>

      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={showProfile} transparent animationType="fade" onRequestClose={() => setShowProfile(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowProfile(false)}>
          <View style={styles.profileSheet}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
            <View style={styles.profileDivider} />
            <Pressable
              style={styles.signOutButton}
              onPress={() => {
                setShowProfile(false);
                logout();
              }}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  name: { fontSize: 28, color: '#0F172A', fontWeight: '800', marginTop: 4 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2563EB' },
  avatarText: { color: '#1E3A8A', fontSize: 20, fontWeight: '700' },

  statusCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', marginRight: 10 },
  statusText: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  statusSubtext: { fontSize: 15, color: '#475569', lineHeight: 22 },

  primaryButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 32, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  emptyState: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emptyStateIcon: { fontSize: 40, marginBottom: 16 },
  emptyStateTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8 },
  emptyStateText: { color: '#64748B', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Profile Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 100, paddingRight: 20 },
  profileSheet: { backgroundColor: '#FFFFFF', borderRadius: 16, width: 260, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10, overflow: 'hidden' },
  profileHeader: { padding: 24, alignItems: 'center' },
  profileAvatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { color: '#1E3A8A', fontSize: 28, fontWeight: '700' },
  profileName: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#64748B' },
  profileDivider: { height: 1, backgroundColor: '#E2E8F0' },
  signOutButton: { padding: 16, alignItems: 'center' },
  signOutText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
});
