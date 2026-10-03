import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useAuth } from '@/auth';
import { getHistoryEvents, HistoryEvent } from '@/history';
import { getProfileImage } from '@/profileService';

export default function TimelineScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'recent'>('events');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [events, setEvents] = useState<HistoryEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHistoryEvents().then(setEvents);
      getProfileImage().then(setProfileImage);
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity History</Text>
      </View>

      {/* Top Tabs */}
      <View style={styles.topTabs}>
        <Pressable style={styles.tabItemContainer} onPress={() => setActiveTab('events')}>
          <Text style={[styles.tabItem, activeTab === 'events' && styles.tabItemActive]}>Events</Text>
          {activeTab === 'events' && <View style={styles.activeTabIndicator} />}
        </Pressable>
        <Pressable style={styles.tabItemContainer} onPress={() => setActiveTab('recent')}>
          <Text style={[styles.tabItem, activeTab === 'recent' && styles.tabItemActive]}>Recent</Text>
          {activeTab === 'recent' && <View style={styles.activeTabIndicator} />}
        </Pressable>
        <Pressable style={styles.tabItemContainer} onPress={() => router.push('/settings')}>
          <View style={styles.tabAvatar}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Text style={styles.tabAvatarText}>{user?.name?.charAt(0) ?? '?'}</Text>
            )}
          </View>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={48} color="#2563EB" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateTitle}>No activity history</Text>
            <Text style={styles.emptyStateText}>Your safety sessions, check-ins, and alerts will appear here once you start your first activity.</Text>
          </View>
        ) : activeTab === 'events' ? (
          <View style={styles.timelineContainer}>
            {events.map((event: HistoryEvent, index: number) => (
              <View key={index} style={styles.eventRow}>
                <View style={styles.timeColumn}>
                  <Text style={[styles.timeText, event.active && styles.timeTextActive]}>
                    {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                </View>
                <View style={styles.lineColumn}>
                  <View style={[styles.line, index === events.length - 1 && styles.lineHidden, event.active && styles.lineActive]} />
                  <View style={[styles.dotContainer, event.active && styles.dotContainerActive]}>
                    <View style={[styles.dot, event.active && styles.dotActive]} />
                  </View>
                </View>
                <Pressable 
                  style={[styles.contentColumn, event.active && styles.contentColumnActive]}
                  onPress={() => router.push(`/activity/${event.id}`)}
                >
                  <Text style={[styles.eventTitle, event.active && styles.eventTitleActive]}>{event.title}</Text>
                  {event.subtitle ? <Text style={styles.eventSubtitle}>{event.subtitle}</Text> : null}
                  <Text style={styles.viewDetailsText}>Tap to view details →</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.recentCardsContainer}>
            {events.map((event: HistoryEvent, index: number) => (
              <Pressable 
                key={index}
                style={styles.recentActivityCard}
                onPress={() => router.push(`/activity/${event.id}`)}
              >
                <View style={styles.recentActivityHeader}>
                  <View style={[styles.recentActivityDot, event.active && styles.recentActivityDotActive]} />
                  <Text style={styles.recentActivityTime}>{new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </View>
                <Text style={styles.recentActivityTitle}>{event.title}</Text>
                <Text style={styles.recentActivitySubtitle}>{event.subtitle}</Text>
                <View style={styles.folderFooter}>
                  <Feather name="folder" size={14} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.folderText}>Activity Folder</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 20, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center' },

  topTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'space-between' },
  tabItemContainer: { flex: 1, alignItems: 'center', position: 'relative', paddingVertical: 16 },
  tabItem: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  tabItemActive: { color: '#0F172A', fontWeight: '700' },
  activeTabIndicator: { position: 'absolute', bottom: -1, width: '60%', height: 3, backgroundColor: '#2563EB', borderRadius: 3 },
  tabAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  tabAvatarText: { color: '#1E3A8A', fontWeight: '700', fontSize: 14 },

  scrollContainer: { padding: 24, paddingBottom: 40, flexGrow: 1 },

  emptyState: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 24 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 8 },
  emptyStateText: { color: '#64748B', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  timelineContainer: { marginTop: 10 },
  eventRow: { flexDirection: 'row', minHeight: 80 },
  timeColumn: { width: 70, alignItems: 'flex-end', paddingRight: 16, paddingTop: 2 },
  timeText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  timeTextActive: { color: '#0F172A', fontWeight: '700' },

  lineColumn: { width: 30, alignItems: 'center' },
  line: { position: 'absolute', top: 12, bottom: -12, width: 2, backgroundColor: '#E2E8F0' },
  lineActive: { backgroundColor: '#2563EB' },
  lineHidden: { backgroundColor: 'transparent' },
  dotContainer: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  dotContainerActive: { backgroundColor: '#DBEAFE' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1' },
  dotActive: { backgroundColor: '#2563EB' },

  contentColumn: { flex: 1, paddingLeft: 16, paddingBottom: 32 },
  contentColumnActive: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginLeft: 16, marginBottom: 32 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 6 },
  eventTitleActive: { color: '#0F172A' },
  eventSubtitle: { fontSize: 14, color: '#475569', lineHeight: 20, marginTop: 4 },
  viewDetailsText: { fontSize: 13, color: '#2563EB', fontWeight: '600', marginTop: 8 },

  recentCardsContainer: { paddingTop: 10, gap: 16 },
  recentActivityCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  recentActivityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  recentActivityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#94A3B8', marginRight: 8 },
  recentActivityDotActive: { backgroundColor: '#10B981' },
  recentActivityTime: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  recentActivityTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  recentActivitySubtitle: { fontSize: 15, color: '#475569', marginBottom: 16 },
  folderFooter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  folderText: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }
});
