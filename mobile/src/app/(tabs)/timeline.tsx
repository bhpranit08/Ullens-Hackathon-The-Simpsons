import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/auth';

export default function TimelineScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'recent'>('events');

  // Real data only — no mock events
  const [events] = useState<any[]>([]);

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
        <View style={styles.tabItemContainer}>
          <View style={styles.tabAvatar}>
            <Text style={styles.tabAvatarText}>{user?.name?.charAt(0) ?? '?'}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={48} color="#2563EB" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateTitle}>No activity history</Text>
            <Text style={styles.emptyStateText}>Your safety sessions, check-ins, and alerts will appear here once you start your first activity.</Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {events.map((event: any, index: number) => (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.timeColumn}>
                  <Text style={[styles.timeText, event.active && styles.timeTextActive]}>{event.time}</Text>
                </View>
                <View style={styles.lineColumn}>
                  <View style={[styles.line, index === events.length - 1 && styles.lineHidden, event.active && styles.lineActive]} />
                  <View style={[styles.dotContainer, event.active && styles.dotContainerActive]}>
                    <View style={[styles.dot, event.active && styles.dotActive]} />
                  </View>
                </View>
                <View style={[styles.contentColumn, event.active && styles.contentColumnActive]}>
                  <Text style={[styles.eventTitle, event.active && styles.eventTitleActive]}>{event.title}</Text>
                  {event.subtitle ? <Text style={styles.eventSubtitle}>{event.subtitle}</Text> : null}
                </View>
              </View>
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
});
