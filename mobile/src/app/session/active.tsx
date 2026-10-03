import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView } from 'react-native';

export default function ActiveSessionScreen() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins demo
  const [isAlerting, setIsAlerting] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsAlerting(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCheckIn = () => {
    setTimeLeft(15 * 60);
    setIsAlerting(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, isAlerting && styles.safeAreaAlert]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Morning Ride</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusIndicator, isAlerting && styles.statusIndicatorAlert]} />
          <Text style={styles.statusText}>{isAlerting ? 'Alerting Contact' : 'Active'}</Text>
        </View>
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>[Map View Placeholder]</Text>
        <View style={styles.demoLabelContainer}>
          <Text style={styles.demoLabel}>Demo Mode: Location is simulated for hackathon.</Text>
        </View>
      </View>

      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>{isAlerting ? 'MISSED CHECK-IN' : 'Next check-in due in'}</Text>
        <Text style={[styles.countdownTime, isAlerting && styles.countdownTimeAlert]}>
          {isAlerting ? '00:00' : formatTime(timeLeft)}
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <Pressable 
          style={[styles.primaryAction, isAlerting && styles.primaryActionAlert]} 
          onPress={handleCheckIn}
        >
          <Text style={styles.primaryActionText}>I AM SAFE</Text>
        </Pressable>

        <Pressable 
          style={styles.sosAction}
          onPress={() => alert('SOS Triggered!')}
        >
          <Text style={styles.sosActionText}>SOS</Text>
        </Pressable>
        
        <Pressable 
          style={styles.endSession}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.endSessionText}>End Session</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  safeAreaAlert: { backgroundColor: '#FEF2F2' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 8 },
  statusIndicatorAlert: { backgroundColor: '#DC2626' },
  statusText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  
  mapPlaceholder: { flex: 1, backgroundColor: '#E2E8F0', marginHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mapText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  demoLabelContainer: { position: 'absolute', bottom: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  demoLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },

  countdownContainer: { alignItems: 'center', paddingVertical: 32 },
  countdownLabel: { fontSize: 16, fontWeight: '600', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  countdownTime: { fontSize: 64, fontWeight: '800', color: '#0F172A', fontVariant: ['tabular-nums'] },
  countdownTimeAlert: { color: '#DC2626' },

  actionsContainer: { paddingHorizontal: 24, paddingBottom: 40, gap: 16 },
  primaryAction: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 20, alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryActionAlert: { backgroundColor: '#10B981', shadowColor: '#10B981' },
  primaryActionText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  
  sosAction: { backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#DC2626', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  sosActionText: { color: '#DC2626', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  
  endSession: { alignItems: 'center', paddingTop: 8 },
  endSessionText: { color: '#64748B', fontSize: 16, fontWeight: '600' }
});
