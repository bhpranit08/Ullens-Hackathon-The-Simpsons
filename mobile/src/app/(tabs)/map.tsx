import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/auth';

export default function HazardMapScreen() {
  const { user } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSeverity, setReportSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Location state
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Real data: no hazards until fetched from API
  const [hazards] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is required to show the map.');
        setLoadingLocation(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      } catch {
        setLocationError('Unable to get your location. Please check your device settings.');
      }
      setLoadingLocation(false);
    })();
  }, []);

  function submitReport() {
    if (!reportTitle.trim()) return;
    // TODO: POST to backend hazard API when available
    setReportSubmitted(true);
    setTimeout(() => {
      setShowReport(false);
      setReportTitle('');
      setReportDescription('');
      setReportSeverity('medium');
      setReportSubmitted(false);
    }, 1500);
  }

  const region: Region | undefined = location
    ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : undefined;

  return (
    <View style={styles.container}>
      {/* Map or loading/error state */}
      {loadingLocation ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Getting your location…</Text>
        </View>
      ) : locationError ? (
        <View style={styles.loadingContainer}>
          <Feather name="map-pin" size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
          <Text style={styles.errorTitle}>Location Unavailable</Text>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      ) : region ? (
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
        >
          {hazards.map((hazard: any) => (
            <Marker
              key={hazard.id}
              coordinate={hazard.coordinate}
              title={hazard.title}
              description={hazard.description}
              pinColor={hazard.severity === 'high' ? '#EF4444' : hazard.severity === 'medium' ? '#F59E0B' : '#10B981'}
            />
          ))}
        </MapView>
      ) : null}

      {/* Overlay Header */}
      <SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.titlePill}>
            <Text style={styles.titlePillText}>Hazard Map</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Empty state overlay when no hazards */}
      {!loadingLocation && !locationError && hazards.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <View style={[styles.emptyBadge, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <Feather name="check-circle" size={16} color="#047857" />
            <Text style={styles.emptyBadgeText}>No hazards reported nearby</Text>
          </View>
        </View>
      )}

      {/* Report FAB */}
      <SafeAreaView style={styles.footerSafeArea} pointerEvents="box-none">
        <Pressable style={styles.reportFab} onPress={() => setShowReport(true)}>
          <Text style={styles.reportFabText}>+ Report Hazard</Text>
        </Pressable>
      </SafeAreaView>

      {/* Report Hazard Modal */}
      <Modal visible={showReport} transparent animationType="slide" onRequestClose={() => setShowReport(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {reportSubmitted ? (
              <View style={styles.successContainer}>
                <Feather name="check-circle" size={48} color="#10B981" style={{ marginBottom: 16 }} />
                <Text style={styles.successTitle}>Hazard Reported</Text>
                <Text style={styles.successText}>Thank you for helping keep the community safe.</Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Report a Hazard</Text>
                  <Pressable onPress={() => setShowReport(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                  <Text style={styles.fieldLabel}>Hazard Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Fallen tree on main path"
                    placeholderTextColor="#94A3B8"
                    value={reportTitle}
                    onChangeText={setReportTitle}
                  />

                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the hazard in detail..."
                    placeholderTextColor="#94A3B8"
                    value={reportDescription}
                    onChangeText={setReportDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <Text style={styles.fieldLabel}>Severity</Text>
                  <View style={styles.severityRow}>
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <Pressable
                        key={level}
                        style={[
                          styles.severityOption,
                          reportSeverity === level && level === 'low' && { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
                          reportSeverity === level && level === 'medium' && { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
                          reportSeverity === level && level === 'high' && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
                        ]}
                        onPress={() => setReportSeverity(level)}
                      >
                        <Text style={[
                          styles.severityText,
                          reportSeverity === level && level === 'low' && { color: '#047857' },
                          reportSeverity === level && level === 'medium' && { color: '#D97706' },
                          reportSeverity === level && level === 'high' && { color: '#DC2626' },
                        ]}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {location && (
                    <View style={styles.locationTag}>
                      <Feather name="map-pin" size={16} color="#475569" />
                      <Text style={styles.locationTagText}>
                        Location: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
                      </Text>
                    </View>
                  )}

                  <Pressable style={styles.submitButton} onPress={submitReport}>
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  </Pressable>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  map: { width: '100%', height: '100%' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748B', fontWeight: '500' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#334155', marginBottom: 8 },
  errorText: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 },

  headerSafeArea: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', justifyContent: 'center', padding: 16, paddingTop: 10 },
  titlePill: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  titlePillText: { color: '#0F172A', fontSize: 16, fontWeight: '700' },

  emptyOverlay: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center' },
  emptyBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  emptyBadgeText: { color: '#047857', fontSize: 14, fontWeight: '600' },

  footerSafeArea: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  reportFab: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 30, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  reportFabText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalClose: { fontSize: 20, color: '#94A3B8', fontWeight: '600' },
  modalBody: { padding: 24 },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, color: '#0F172A', fontSize: 16, minHeight: 50, paddingHorizontal: 16 },
  textArea: { minHeight: 100, paddingTop: 14 },

  severityRow: { flexDirection: 'row', gap: 12 },
  severityOption: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
  severityText: { fontSize: 14, fontWeight: '600', color: '#64748B' },

  locationTag: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 12 },
  locationTagIcon: { fontSize: 16 },
  locationTagText: { fontSize: 13, color: '#475569', fontWeight: '500' },

  submitButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  successContainer: { padding: 48, alignItems: 'center' },
  successIcon: { fontSize: 48, marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  successText: { fontSize: 15, color: '#475569', textAlign: 'center' },
});
