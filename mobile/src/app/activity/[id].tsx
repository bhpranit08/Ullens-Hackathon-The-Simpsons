import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, SafeAreaView, ActivityIndicator, Image, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getHistoryEvent, HistoryEvent } from '@/history';

export default function ActivityDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{id: string}>();
  
  const [activity, setActivity] = useState<HistoryEvent | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getHistoryEvent(id).then(e => setActivity(e ?? null));
    }
  }, [id]);

  if (!activity) return <SafeAreaView style={styles.center}><ActivityIndicator color="#2563EB" /></SafeAreaView>;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Activity Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.titleCard}>
          <Text style={styles.title}>{activity.title}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Feather name="activity" size={14} color="#2563EB" />
              <Text style={styles.badgeText}>{activity.type || 'Activity'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: activity.active ? '#ECFDF5' : '#F1F5F9' }]}>
              <Text style={[styles.badgeText, { color: activity.active ? '#10B981' : '#64748B' }]}>
                {activity.active ? 'Active Now' : 'Completed'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(activity.duration)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{activity.distance ? `${activity.distance.toFixed(2)} km` : '--'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pace</Text>
            <Text style={styles.statValue}>{activity.pace ? `${Math.floor(activity.pace / 60)}:${Math.floor(activity.pace % 60).toString().padStart(2, '0')}/km` : '--'}</Text>
          </View>
        </View>

        <View style={[styles.statsCard, { marginTop: -16 }]}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Date</Text>
            <Text style={styles.statValue}>{new Date(activity.date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{new Date(activity.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
          </View>
        </View>

        {activity.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.bodyText}>{activity.description}</Text>
          </View>
        ) : null}

        {activity.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{activity.notes}</Text>
            </View>
          </View>
        ) : null}

        {activity.photos && activity.photos.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {activity.photos.map((uri, idx) => (
                <Pressable key={idx} onPress={() => setSelectedPhoto(uri)}>
                  <Image source={{ uri }} style={styles.photo} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Updates & Check-ins</Text>
          {!activity.updates || activity.updates.length === 0 ? (
            <Text style={styles.emptyText}>No check-ins recorded for this session.</Text>
          ) : (
            <View style={styles.updatesList}>
              {activity.updates.map((update, idx) => (
                <View key={idx} style={styles.updateRow}>
                  <View style={styles.updateTimeBox}>
                    <Text style={styles.updateTime}>{new Date(update.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </View>
                  <View style={styles.updateDot} />
                  <View style={styles.updateContent}>
                    <Text style={styles.updateMessage}>{update.message}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Photo Viewer Modal */}
      <Modal visible={!!selectedPhoto} transparent={true} animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalCloseButton} onPress={() => setSelectedPhoto(null)}>
            <Feather name="x" size={32} color="#FFFFFF" />
          </Pressable>
          {selectedPhoto && (
            <Image source={{ uri: selectedPhoto }} style={styles.fullScreenPhoto} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { width: 60 },
  backButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  
  scrollContainer: { padding: 24, paddingBottom: 40 },
  
  titleCard: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 6 },
  badgeText: { color: '#1E3A8A', fontSize: 13, fontWeight: '700' },
  
  statsCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 32 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 16 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  bodyText: { fontSize: 16, color: '#334155', lineHeight: 24 },
  
  notesBox: { backgroundColor: '#FEF9C3', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FEF08A' },
  notesText: { fontSize: 15, color: '#854D0E', lineHeight: 22 },
  
  emptyText: { fontSize: 15, color: '#94A3B8', fontStyle: 'italic' },
  
  updatesList: { paddingLeft: 8 },
  updateRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  updateTimeBox: { width: 70, paddingTop: 2 },
  updateTime: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  updateDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB', marginTop: 4, marginHorizontal: 16, borderWidth: 2, borderColor: '#DBEAFE' },
  updateContent: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  updateMessage: { fontSize: 15, color: '#334155', fontWeight: '500' },
  
  photosScroll: { flexDirection: 'row', paddingTop: 8 },
  photo: { width: 120, height: 120, borderRadius: 12, marginRight: 16, backgroundColor: '#E2E8F0' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalCloseButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  fullScreenPhoto: { width: '100%', height: '80%' }
});
