import * as SplashScreen from 'expo-splash-screen';
import { Redirect, useRouter } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ScrollView, Platform, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { useAuth } from '@/auth';
import { getHistoryEvents, HistoryEvent } from '@/history';
import { getProfileImage } from '@/profileService';
import { apiGetSharedSessions, apiGetNotifications, apiMarkAllNotificationsRead, ApiNotification, LiveSession } from '@/apiService';
import { useFocusEffect } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [recentEvent, setRecentEvent] = useState<HistoryEvent | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [sharedSessions, setSharedSessions] = useState<LiveSession[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const seenSosIds = useRef<Set<string>>(new Set());
  const isInitialFetch = useRef(true);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      apiGetSharedSessions().then(setSharedSessions).catch(() => {});
      apiGetNotifications().then(notifs => {
        setNotifications(notifs);
        
        if (isInitialFetch.current) {
          notifs.filter(n => n.type === 'sos').forEach(n => seenSosIds.current.add(n.id));
          isInitialFetch.current = false;
          return;
        }

        const newSos = notifs.filter(n => n.type === 'sos' && !n.read && !seenSosIds.current.has(n.id));
        if (newSos.length > 0) {
          newSos.forEach(n => seenSosIds.current.add(n.id));
          Alert.alert(
            'URGENT SOS ALERT',
            newSos[0].message,
            [
              { text: 'Dismiss', style: 'cancel' },
              { text: 'View Location', onPress: () => router.push({ pathname: '/shared/[id]', params: { id: newSos[0].sessionId! } }) }
            ]
          );
        }
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [user, router]);

  useFocusEffect(
    useCallback(() => {
      getHistoryEvents().then(events => { if (events.length > 0) setRecentEvent(events[0]); });
      getProfileImage().then(setProfileImage);
      apiGetSharedSessions().then(setSharedSessions).catch(() => {});
      apiGetNotifications().then(setNotifications).catch(() => {});
    }, [])
  );

  if (!ready) return <View style={styles.center}><ActivityIndicator color="#2563EB" /></View>;
  SplashScreen.hideAsync();
  if (!user) return <Redirect href="/login" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    await apiMarkAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const notifIcon = (type: ApiNotification['type']) => {
    switch (type) {
      case 'sos': return <Feather name="alert-triangle" size={18} color="#DC2626" />;
      case 'activity_started': return <Feather name="activity" size={18} color="#2563EB" />;
      case 'activity_ended': return <Feather name="check-circle" size={18} color="#64748B" />;
      case 'checkin_safe': return <Feather name="check-circle" size={18} color="#10B981" />;
      default: return <Feather name="bell" size={18} color="#F59E0B" />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{user.name}</Text>
          </View>
          <View style={styles.headerActions}>
            {/* Notification Bell */}
            <Pressable onPress={() => setShowNotifications(!showNotifications)} style={styles.bellButton}>
              <Feather name="bell" size={22} color="#334155" />
              {unreadCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>

            {/* Avatar */}
            <Pressable onPress={() => router.push('/settings')} style={styles.avatarPlaceholder}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Notification Panel */}
        {showNotifications && (
          <View style={styles.notifPanel}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <Pressable onPress={handleMarkAllRead}>
                  <Text style={styles.markReadText}>Mark all read</Text>
                </Pressable>
              )}
            </View>
            {notifications.length === 0 ? (
              <Text style={styles.notifEmpty}>No notifications yet.</Text>
            ) : (
              notifications.slice(0, 8).map(n => (
                <Pressable
                  key={n.id}
                  style={[styles.notifItem, !n.read && styles.notifItemUnread]}
                  onPress={() => {
                    if (n.sessionId) {
                      setShowNotifications(false);
                      router.push({ pathname: '/shared/[id]', params: { id: n.sessionId } });
                    }
                  }}
                >
                  <View style={styles.notifIcon}>{notifIcon(n.type)}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifMessage}>{n.message}</Text>
                    <Text style={styles.notifTime}>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {n.sender.name}</Text>
                  </View>
                  {!n.read && <View style={styles.unreadDot} />}
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* Safety Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>Currently Safe</Text>
          </View>
          <Text style={styles.statusSubtext}>No active safety sessions right now. Stay prepared for your next adventure.</Text>
        </View>

        {/* Start Activity */}
        <Pressable style={styles.primaryButton} onPress={() => router.push('/start')}>
          <Feather name="play" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.primaryButtonText}>Start Activity</Text>
        </Pressable>

        {/* Sharing With You */}
        {sharedSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sharing With You</Text>
            {sharedSessions.map(session => (
              <View key={session.sessionId}>
                <Pressable style={StyleSheet.flatten([
                  styles.sharingCard,
                  session.status === 'sos' && styles.sharingCardSOS
                ])} onPress={() => router.push({ pathname: '/shared/[id]', params: { id: session.sessionId } })}>
                  <View style={styles.sharingHeader}>
                    <View style={[styles.sharingAvatar, session.status === 'sos' && { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.sharingAvatarText, session.status === 'sos' && { color: '#DC2626' }]}>
                        {session.owner.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sharingName}>{session.owner.name}</Text>
                      <Text style={styles.sharingStatus}>
                        {session.status === 'sos' ? 'SOS Alert' : `Active • ${session.activityType}`}
                      </Text>
                    </View>
                    <View style={[styles.sharingLiveBadge, session.status === 'sos' && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <View style={[styles.sharingLiveDot, session.status === 'sos' && { backgroundColor: '#DC2626' }]} />
                      <Text style={[styles.sharingLiveText, session.status === 'sos' && { color: '#DC2626' }]}>
                        {session.status === 'sos' ? 'SOS' : 'LIVE'}
                      </Text>
                    </View>
                  </View>

                  {Platform.OS !== 'web' && session.location?.latitude ? (
                    <View style={styles.sharingMapContainer}>
                      <MapView
                        style={styles.sharingMap}
                        provider={PROVIDER_DEFAULT}
                        region={{
                          latitude: session.location.latitude,
                          longitude: session.location.longitude,
                          latitudeDelta: 0.02,
                          longitudeDelta: 0.02,
                        }}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        scrollEnabled={false}
                        zoomEnabled={false}
                      >
                        <Marker
                          coordinate={{ latitude: session.location.latitude, longitude: session.location.longitude }}
                          pinColor={session.status === 'sos' ? '#DC2626' : '#2563EB'}
                        />
                      </MapView>
                    </View>
                  ) : null}
                  <Text style={styles.viewDetailsText}>Tap to view live tracking →</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          {recentEvent ? (
            <Pressable style={styles.recentActivityCard} onPress={() => router.push(`/activity/${recentEvent.id}`)}>
                <View style={styles.recentActivityHeader}>
                  <View style={[styles.recentActivityDot, recentEvent.active && styles.recentActivityDotActive]} />
                  <Text style={styles.recentActivityTime}>
                    {new Date(recentEvent.date).toLocaleDateString()} {new Date(recentEvent.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.recentActivityTitle}>{recentEvent.title}</Text>
                <Text style={styles.recentActivitySubtitle}>{recentEvent.subtitle}</Text>
                <View style={styles.folderTag}>
                  <Feather name="folder" size={14} color="#64748B" />
                  <Text style={styles.folderTagText}>Activity Folder</Text>
                </View>
                <Text style={styles.viewDetailsText}>Tap to view details →</Text>
            </Pressable>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="activity" size={40} color="#2563EB" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyStateTitle}>No activities yet</Text>
              <Text style={styles.emptyStateText}>Start your first activity to see your progress here.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  name: { fontSize: 28, color: '#0F172A', fontWeight: '800', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  bellButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  badgeCount: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  badgeCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2563EB', overflow: 'hidden' },
  avatarText: { color: '#1E3A8A', fontSize: 20, fontWeight: '700' },

  // Notification Panel
  notifPanel: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  notifTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  markReadText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  notifEmpty: { color: '#94A3B8', textAlign: 'center', padding: 24, fontSize: 14 },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  notifItemUnread: { backgroundColor: '#F0F7FF' },
  notifIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  notifMessage: { fontSize: 14, color: '#334155', lineHeight: 20, fontWeight: '500' },
  notifTime: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB', marginTop: 6 },

  statusCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', marginRight: 10 },
  statusText: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  statusSubtext: { fontSize: 15, color: '#475569', lineHeight: 22 },

  primaryButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 14 },

  sharingCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sharingCardSOS: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
  sharingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sharingAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sharingAvatarText: { color: '#1E3A8A', fontSize: 16, fontWeight: '700' },
  sharingName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  sharingStatus: { fontSize: 13, color: '#64748B', marginTop: 2 },
  sharingLiveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA' },
  sharingLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 4 },
  sharingLiveText: { color: '#EF4444', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  sharingMapContainer: { height: 160, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  sharingMap: { width: '100%', height: '100%' },

  emptyState: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emptyStateTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8 },
  emptyStateText: { color: '#64748B', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  recentActivityCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  recentActivityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  recentActivityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#94A3B8', marginRight: 8 },
  recentActivityDotActive: { backgroundColor: '#10B981' },
  recentActivityTime: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  recentActivityTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  recentActivitySubtitle: { fontSize: 14, color: '#475569', marginBottom: 12 },
  viewDetailsText: { fontSize: 13, color: '#2563EB', fontWeight: '600', marginTop: 8 },
  folderTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  folderTagText: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
});
