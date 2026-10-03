import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Modal, TextInput, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/auth';
import { getHazards, addHazard, removeHazard, Hazard } from '@/hazardsService';

export default function HazardMapScreen() {
  const { user } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSeverity, setReportSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);

  // Location state
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Fetch hazards from local secure storage mock
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [selectedCoordinate, setSelectedCoordinate] = useState<{latitude: number, longitude: number} | null>(null);

  // Animations
  const fabAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.spring(fabAnim, {
      toValue: 1,
      tension: 50,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [fabAnim]);

  useFocusEffect(
    useCallback(() => {
      getHazards().then(setHazards);
    }, [])
  );

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
    
    const coordToUse = selectedCoordinate || (location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : null);
    if (!coordToUse) return;

    const newHazard: Hazard = {
      id: Math.random().toString(),
      coordinate: coordToUse,
      title: reportTitle,
      description: reportDescription,
      severity: reportSeverity,
    };

    addHazard(newHazard).then(() => {
      setHazards(prev => [...prev, newHazard]);
    });
    setReportSubmitted(true);
    setTimeout(() => {
      setShowReport(false);
      setReportTitle('');
      setReportDescription('');
      setReportSeverity('medium');
      setReportSubmitted(false);
      setSelectedCoordinate(null);
    }, 1500);
  }

  async function handleDeleteHazard() {
    if (!selectedHazard) return;
    await removeHazard(selectedHazard.id);
    setHazards(prev => prev.filter(h => h.id !== selectedHazard.id));
    setSelectedHazard(null);
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
          onPress={(e) => {
            setSelectedCoordinate(e.nativeEvent.coordinate);
          }}
        >
          {hazards.map((hazard: Hazard) => (
            <Marker
              key={hazard.id}
              coordinate={hazard.coordinate}
              pinColor={hazard.severity === 'high' ? '#EF4444' : hazard.severity === 'medium' ? '#F59E0B' : '#10B981'}
              onPress={() => {
                setSelectedHazard(hazard);
                setSelectedCoordinate(null);
              }}
            />
          ))}
          {selectedCoordinate && (
            <Marker 
              coordinate={selectedCoordinate} 
              pinColor="#2563EB" 
              title="Selected Location" 
            />
          )}
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

      {/* Removed empty state overlay */}

      {/* Report FAB */}
      <SafeAreaView style={styles.footerSafeArea} pointerEvents="box-none">
        {selectedCoordinate && (
          <View style={styles.selectedLocationTag}>
            <Text style={styles.selectedLocationText}>Location Selected</Text>
            <Pressable onPress={() => setSelectedCoordinate(null)}>
              <Text style={styles.clearSelectionText}>Clear</Text>
            </Pressable>
          </View>
        )}
        <Animated.View style={{
          transform: [
            { scale: fabAnim },
            { translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }
          ]
        }}>
          <Pressable style={styles.reportFab} onPress={() => setShowReport(true)}>
            <Text style={styles.reportFabText}>+ Report Hazard</Text>
          </Pressable>
        </Animated.View>
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

                  {selectedCoordinate ? (
                    <View style={styles.locationTag}>
                      <Feather name="map-pin" size={16} color="#475569" />
                      <Text style={styles.locationTagText}>
                        Location: {selectedCoordinate.latitude.toFixed(4)}, {selectedCoordinate.longitude.toFixed(4)}
                      </Text>
                    </View>
                  ) : location ? (
                    <View style={styles.locationTag}>
                      <Feather name="map-pin" size={16} color="#475569" />
                      <Text style={styles.locationTagText}>
                        Your Location: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
                      </Text>
                    </View>
                  ) : null}

                  <Pressable style={styles.submitButton} onPress={submitReport}>
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  </Pressable>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* View Hazard Modal */}
      <Modal visible={!!selectedHazard} transparent animationType="slide" onRequestClose={() => setSelectedHazard(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hazard Details</Text>
              <Pressable onPress={() => setSelectedHazard(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            {selectedHazard && (
              <View style={styles.modalBody}>
                <Text style={styles.hazardDetailTitle}>{selectedHazard.title}</Text>
                
                <View style={styles.hazardDetailSeverity}>
                  <View style={[
                    styles.severityDot,
                    { backgroundColor: selectedHazard.severity === 'high' ? '#EF4444' : selectedHazard.severity === 'medium' ? '#F59E0B' : '#10B981' }
                  ]} />
                  <Text style={styles.hazardDetailSeverityText}>
                    {selectedHazard.severity.toUpperCase()} SEVERITY
                  </Text>
                </View>

                {selectedHazard.description ? (
                  <Text style={styles.hazardDetailDescription}>{selectedHazard.description}</Text>
                ) : null}
                
                <View style={styles.locationTag}>
                  <Feather name="map-pin" size={16} color="#475569" />
                  <Text style={styles.locationTagText}>
                    {selectedHazard.coordinate.latitude.toFixed(4)}, {selectedHazard.coordinate.longitude.toFixed(4)}
                  </Text>
                </View>

                <Pressable style={styles.deleteButton} onPress={handleDeleteHazard}>
                  <Feather name="trash-2" size={18} color="#DC2626" />
                  <Text style={styles.deleteButtonText}>Remove Hazard</Text>
                </Pressable>
              </View>
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
  
  selectedLocationTag: { backgroundColor: '#DBEAFE', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedLocationText: { color: '#1E3A8A', fontWeight: '600', fontSize: 14 },
  clearSelectionText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },

  // Hazard Details
  hazardDetailTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  hazardDetailSeverity: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  severityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  hazardDetailSeverityText: { fontSize: 12, fontWeight: '700', color: '#475569', letterSpacing: 0.5 },
  hazardDetailDescription: { fontSize: 16, color: '#334155', lineHeight: 24, marginBottom: 8 },
  
  deleteButton: { flexDirection: 'row', backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginTop: 24, borderWidth: 1, borderColor: '#FECACA', gap: 8 },
  deleteButtonText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
});
