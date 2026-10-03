import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, ActivityIndicator, Alert, Platform, Modal, TextInput } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';

import { updateHistoryEvent } from '@/history';
import { addHazard, Hazard } from '@/hazardsService';
import { useAuth } from '@/auth';
import {
  apiUpdateLocation,
  apiCheckIn,
  apiTriggerSOS,
  apiCancelSOS,
  apiEndSession,
} from '@/apiService';

export default function ActiveSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id, title, activity, duration, hasShared } = useLocalSearchParams<{
    id: string; title: string; activity: string; duration: string; hasShared: string;
  }>();

  const isShared = hasShared === '1';
  const initialDuration = parseInt(duration || '15', 10) * 60;

  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [elapsed, setElapsed] = useState(0);
  const [isAlerting, setIsAlerting] = useState(false);
  const [isSOS, setIsSOS] = useState(false);
  
  const [showHazardModal, setShowHazardModal] = useState(false);
  const [hazardTitle, setHazardTitle] = useState('');
  const [hazardDesc, setHazardDesc] = useState('');
  const [hazardSeverity, setHazardSeverity] = useState<'low' | 'medium' | 'high'>('medium');

  const [routeCoordinates, setRouteCoordinates] = useState<Location.LocationObjectCoords[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  // Broadcast location to backend every 10s
  const locationBroadcastRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const broadcastLocation = useCallback((lat: number, lng: number) => {
    if (isShared && id) {
      apiUpdateLocation(id, lat, lng).catch(() => {});
    }
  }, [isShared, id]);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsAlerting(true);
      Alert.alert(
        'Missed Check-in',
        'Your check-in timer has ended. Your emergency contacts are being notified.',
        [{ text: 'OK' }]
      );
      return;
    }
    const t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  // GPS Tracking
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationError('Location permission required.'); return; }
      try {
        const init = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation(init.coords);
        setRouteCoordinates([init.coords]);
        broadcastLocation(init.coords.latitude, init.coords.longitude);

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
          (loc) => {
            setCurrentLocation(loc.coords);
            setRouteCoordinates(prev => [...prev, loc.coords]);
            broadcastLocation(loc.coords.latitude, loc.coords.longitude);
            mapRef.current?.animateCamera({ center: { latitude: loc.coords.latitude, longitude: loc.coords.longitude } });
          }
        );
      } catch { setLocationError('Unable to get location.'); }
    })();
    return () => { sub?.remove(); };
  }, [broadcastLocation]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleCheckIn = async () => {
    setTimeLeft(initialDuration);
    setIsAlerting(false);
    updateHistoryEvent(id, {
      updates: [{ time: new Date().toISOString(), message: 'Checked in safe.' }],
    });
    if (isShared) {
      await apiCheckIn(id, currentLocation?.latitude, currentLocation?.longitude).catch(() => {});
    }
    Alert.alert('Checked In', isShared ? 'Your trusted contacts have been notified you are safe.' : 'Timer reset.');
  };

  const handleSOS = () => {
    Alert.alert(
      'Trigger SOS?',
      'This will immediately alert all your trusted contacts with your live location. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Trigger SOS',
          style: 'destructive',
          onPress: async () => {
            setIsSOS(true);
            if (isShared) {
              await apiTriggerSOS(id, currentLocation?.latitude, currentLocation?.longitude).catch(() => {});
            }
            updateHistoryEvent(id, {
              updates: [{ time: new Date().toISOString(), message: 'SOS triggered.' }],
            });
          },
        },
      ]
    );
  };

  const handleCancelSOS = () => {
    Alert.alert('Cancel SOS?', 'This will mark you as safe and cancel the emergency alert.', [
      { text: 'Keep SOS Active', style: 'cancel' },
      {
        text: 'Cancel SOS',
        onPress: async () => {
          setIsSOS(false);
          if (isShared) await apiCancelSOS(id).catch(() => {});
          updateHistoryEvent(id, {
            updates: [{ time: new Date().toISOString(), message: 'SOS cancelled. Back to active.' }],
          });
        },
      },
    ]);
  };

  const handleReportHazard = async () => {
    if (!hazardTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the hazard.');
      return;
    }
    if (!currentLocation) {
      Alert.alert('Error', 'Waiting for location...');
      return;
    }
    
    const newHazard: Hazard = {
      id: Math.random().toString(36).substr(2, 9),
      title: hazardTitle,
      description: hazardDesc,
      severity: hazardSeverity,
      coordinate: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }
    };
    
    await addHazard(newHazard);
    setShowHazardModal(false);
    setHazardTitle('');
    setHazardDesc('');
    setHazardSeverity('medium');
    Alert.alert('Hazard Reported', 'Your hazard report has been saved and will appear on the map.');
  };

  const handleEndSession = async () => {
    if (isShared) await apiEndSession(id).catch(() => {});
    router.replace({ pathname: '/session/end', params: { id, duration: elapsed.toString() } });
  };

  const initialRegion: Region | undefined = currentLocation ? {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  } : undefined;

  const statusColor = isSOS ? '#DC2626' : isAlerting ? '#F59E0B' : '#10B981';
  const statusLabel = isSOS ? 'SOS ACTIVE' : isAlerting ? 'MISSED CHECK-IN' : 'Active';

  return (
    <SafeAreaView style={[styles.safeArea, isSOS && styles.sosBg]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Active Session'}</Text>
          <Text style={styles.headerSub}>{activity || 'Activity'}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {locationError ? (
          <View style={styles.mapPlaceholder}><Text style={styles.mapText}>{locationError}</Text></View>
        ) : currentLocation && initialRegion ? (
          <MapView ref={mapRef} style={styles.map} provider={PROVIDER_DEFAULT} initialRegion={initialRegion} showsUserLocation showsMyLocationButton={false}>
            <Polyline coordinates={routeCoordinates} strokeColor={isSOS ? '#DC2626' : '#2563EB'} strokeWidth={4} />
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.mapLoadingText}>Acquiring GPS Signal...</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>ELAPSED</Text>
          <Text style={styles.statValue}>{formatTime(elapsed)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{isAlerting ? 'CHECK-IN DUE' : 'NEXT CHECK-IN'}</Text>
          <Text style={[styles.statValue, isAlerting && { color: '#F59E0B' }]}>{isAlerting ? 'OVERDUE' : formatTime(timeLeft)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>LOCATION</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {currentLocation ? `${currentLocation.latitude.toFixed(3)}, ${currentLocation.longitude.toFixed(3)}` : '---'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {isSOS ? (
          <>
            <View style={styles.sosActiveCard}>
              <Feather name="alert-triangle" size={24} color="#DC2626" />
              <Text style={styles.sosActiveText}>SOS is active — contacts notified</Text>
            </View>
            <Pressable style={styles.cancelSosButton} onPress={handleCancelSOS}>
              <Text style={styles.cancelSosText}>Cancel SOS — I'm Safe</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={[styles.primaryAction, isAlerting && styles.primaryActionAlert]} onPress={handleCheckIn}>
            <Feather name="check-circle" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.primaryActionText}>I AM SAFE</Text>
          </Pressable>
        )}

        {!isSOS && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable style={[styles.sosButton, { flex: 1 }]} onPress={handleSOS}>
              <Feather name="alert-triangle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.sosButtonText}>SOS</Text>
            </Pressable>
            <Pressable style={[styles.sosButton, { flex: 1, borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]} onPress={() => setShowHazardModal(true)}>
              <Feather name="map-pin" size={20} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={[styles.sosButtonText, { color: '#D97706' }]}>Report Hazard</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.endButton} onPress={handleEndSession}>
          <Text style={styles.endButtonText}>End Session</Text>
        </Pressable>
      </View>

      {/* Hazard Report Modal */}
      <Modal visible={showHazardModal} transparent animationType="slide" onRequestClose={() => setShowHazardModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Hazard</Text>
              <Pressable onPress={() => setShowHazardModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Hazard Type</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Fallen Tree, Flooded Trail"
                value={hazardTitle}
                onChangeText={setHazardTitle}
              />
              
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="More details about the hazard..."
                value={hazardDesc}
                onChangeText={setHazardDesc}
                multiline
              />
              
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Severity</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {(['low', 'medium', 'high'] as const).map(sev => (
                  <Pressable
                    key={sev}
                    style={[
                      styles.severityBtn,
                      hazardSeverity === sev && (sev === 'high' ? styles.severityHigh : sev === 'medium' ? styles.severityMed : styles.severityLow)
                    ]}
                    onPress={() => setHazardSeverity(sev)}
                  >
                    <Text style={[
                      styles.severityBtnText,
                      hazardSeverity === sev && styles.severityBtnTextActive
                    ]}>{sev.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.submitButton} onPress={handleReportHazard}>
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  sosBg: { backgroundColor: '#FFF5F5' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, backgroundColor: '#FFFFFF' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  mapContainer: { flex: 1, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: { flex: 1, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  mapText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  mapLoadingText: { color: '#64748B', fontSize: 14, fontWeight: '600', marginTop: 12 },

  statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },

  actionsContainer: { padding: 16, paddingBottom: 24, gap: 12 },
  primaryAction: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryActionAlert: { backgroundColor: '#10B981', shadowColor: '#10B981' },
  primaryActionText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },

  sosButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#DC2626', borderRadius: 16, paddingVertical: 16 },
  sosButtonText: { color: '#DC2626', fontSize: 16, fontWeight: '800' },

  sosActiveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: '#FECACA' },
  sosActiveText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
  cancelSosButton: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  cancelSosText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  endButton: { alignItems: 'center', paddingTop: 4 },
  endButtonText: { color: '#64748B', fontSize: 15, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalClose: { fontSize: 20, color: '#94A3B8', fontWeight: '600' },
  modalBody: { padding: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, color: '#0F172A', fontSize: 16, minHeight: 50, paddingHorizontal: 16 },
  
  severityBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  severityLow: { backgroundColor: '#10B981', borderColor: '#10B981' },
  severityMed: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  severityHigh: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  severityBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  severityBtnTextActive: { color: '#FFFFFF' },

  submitButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
