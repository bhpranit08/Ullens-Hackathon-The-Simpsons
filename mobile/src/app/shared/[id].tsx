import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, SafeAreaView,
  ActivityIndicator, ScrollView, Linking, Alert, Platform
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker, Circle, UrlTile } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { apiGetSession, LiveSession } from '@/apiService';

export default function LiveActivityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState('');

  const fetchSession = async () => {
    if (!id) return;
    const s = await apiGetSession(id);
    setSession(s);
    setLoading(false);
  };

  useEffect(() => {
    fetchSession();
    // Poll for real-time location updates every 5 seconds
    intervalRef.current = setInterval(fetchSession, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [id]);

  // Compute elapsed from startedAt
  useEffect(() => {
    if (!session?.startedAt) return;
    const tick = () => {
      const secs = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s2 = (secs % 60).toString().padStart(2, '0');
      setElapsed(`${m}:${s2}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session?.startedAt]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#2563EB" size="large" />
        <Text style={styles.loadingText}>Loading live session...</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.center}>
        <Feather name="wifi-off" size={40} color="#94A3B8" />
        <Text style={styles.notFoundTitle}>Session Not Found</Text>
        <Text style={styles.notFoundText}>This session may have ended or is unavailable.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isSOS = session.status === 'sos';
  const isEnded = session.status === 'ended';
  const hasLoc = !!session.location?.latitude;

  const statusColor = isSOS ? '#DC2626' : isEnded ? '#64748B' : '#10B981';
  const statusLabel = isSOS ? 'SOS ACTIVE' : isEnded ? 'Ended' : 'Live';

  return (
    <SafeAreaView style={[styles.safeArea, isSOS && styles.sosBg]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{session.owner.name}</Text>
          <Text style={styles.headerActivity}>{session.activityType}</Text>
        </View>
        <View style={[styles.statusPill, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* SOS Banner */}
        {isSOS && (
          <View style={styles.sosBanner}>
            <Feather name="alert-triangle" size={24} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.sosBannerTitle}>SOS Alert</Text>
              <Text style={styles.sosBannerText}>
                {session.owner.name} triggered an emergency{session.sosTriggeredAt ? ` at ${new Date(session.sosTriggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.
              </Text>
            </View>
          </View>
        )}

        {/* Map */}
        <View style={styles.mapContainer}>
          {hasLoc ? (
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              mapType={Platform.OS === 'android' ? 'none' : 'standard'}
              region={{
                latitude: session.location!.latitude,
                longitude: session.location!.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              {Platform.OS === 'android' && (
                <UrlTile
                  urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maximumZ={19}
                  flipY={false}
                />
              )}
              <Marker
                coordinate={{ latitude: session.location!.latitude, longitude: session.location!.longitude }}
                title={session.owner.name}
                description={`Last update: ${session.location?.updatedAt ? new Date(session.location.updatedAt).toLocaleTimeString() : 'Unknown'}`}
                pinColor={isSOS ? '#DC2626' : '#2563EB'}
              />
              {isSOS && (
                <Circle
                  center={{ latitude: session.location!.latitude, longitude: session.location!.longitude }}
                  radius={200}
                  fillColor="rgba(220,38,38,0.1)"
                  strokeColor="rgba(220,38,38,0.4)"
                  strokeWidth={2}
                />
              )}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Feather name="map-pin" size={32} color="#94A3B8" />
              <Text style={styles.mapPlaceholderText}>Location not available yet</Text>
            </View>
          )}
          {!isEnded && (
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTagText}>UPDATING LIVE</Text>
            </View>
          )}
        </View>

        {/* Info Cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>DURATION</Text>
            <Text style={styles.infoValue}>{elapsed || '--:--'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>STARTED</Text>
            <Text style={styles.infoValue}>{new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>STATUS</Text>
            <Text style={[styles.infoValue, { color: statusColor }]}>{session.status.toUpperCase()}</Text>
          </View>
          {session.route ? (
            <View style={[styles.infoCard, { flex: 2 }]}>
              <Text style={styles.infoLabel}>ROUTE</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{session.route}</Text>
            </View>
          ) : null}
        </View>

        {/* Coordinates */}
        {hasLoc && (
          <View style={styles.coordCard}>
            <Feather name="map-pin" size={16} color="#2563EB" />
            <Text style={styles.coordText}>
              {session.location!.latitude.toFixed(5)}, {session.location!.longitude.toFixed(5)}
            </Text>
            {session.location?.updatedAt && (
              <Text style={styles.coordTime}>· {new Date(session.location.updatedAt).toLocaleTimeString()}</Text>
            )}
          </View>
        )}

        {/* Message button */}
        <Pressable
          style={styles.messageButton}
          onPress={() => {
            Alert.alert(
              'Message Contact',
              'Open email to message this person?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Email', onPress: () => Linking.openURL(`mailto:${session.owner.email}?subject=Checking in on your activity`) },
              ]
            );
          }}
        >
          <Feather name="message-square" size={20} color="#2563EB" style={{ marginRight: 10 }} />
          <Text style={styles.messageButtonText}>Message {session.owner.name}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  sosBg: { backgroundColor: '#FFF5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 32 },
  loadingText: { color: '#64748B', marginTop: 12, fontSize: 15 },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 8 },
  notFoundText: { color: '#64748B', textAlign: 'center', lineHeight: 22 },
  backBtn: { marginTop: 24 },
  backBtnText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { width: 56 },
  backButtonText: { color: '#2563EB', fontSize: 15, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  headerActivity: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, backgroundColor: '#FFFFFF' },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },

  scroll: { padding: 16, paddingBottom: 40 },

  sosBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, gap: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  sosBannerTitle: { fontSize: 15, fontWeight: '800', color: '#DC2626', marginBottom: 4 },
  sosBannerText: { fontSize: 14, color: '#B91C1C', lineHeight: 20 },

  mapContainer: { height: 280, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: { flex: 1, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapPlaceholderText: { color: '#94A3B8', fontSize: 14 },
  liveTag: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  liveTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  infoCard: { flex: 1, minWidth: '28%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  infoValue: { fontSize: 16, fontWeight: '800', color: '#0F172A', textAlign: 'center' },

  coordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 16, gap: 8, flexWrap: 'wrap' },
  coordText: { fontSize: 13, color: '#1E3A8A', fontWeight: '600' },
  coordTime: { fontSize: 12, color: '#64748B' },

  messageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 18, borderWidth: 1.5, borderColor: '#2563EB' },
  messageButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '700' },
});
