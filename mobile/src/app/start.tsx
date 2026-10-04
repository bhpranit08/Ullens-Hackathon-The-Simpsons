import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/auth';
import { addHistoryEvent } from '@/history';
import { apiGetContacts, apiStartSession, ApiContact } from '@/apiService';

const ACTIVITIES = ['Running', 'Cycling', 'Trekking', 'Hiking', 'Walking'];

export default function StartSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activity, setActivity] = useState('Running');
  const [title, setTitle] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [durationMins, setDurationMins] = useState('15');
  const [error, setError] = useState('');

  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<ApiContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    apiGetContacts().then(c => { setContacts(c); setLoadingContacts(false); }).catch(() => setLoadingContacts(false));
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationError('Location permission is required.'); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      } catch { setLocationError('Unable to get your location.'); }
    })();
  }, []);

  const toggleContact = (c: ApiContact) => {
    setSelectedContacts(prev =>
      prev.find(p => p.id === c.id) ? prev.filter(p => p.id !== c.id) : [...prev, c]
    );
  };

  const region: Region | undefined = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : undefined;

  async function handleStart() {
    if (!title.trim()) { setError('Session title is required'); return; }
    setError('');
    setStarting(true);
    try {
      const sessionId = await addHistoryEvent({
        title,
        type: activity,
        subtitle: `${activity}${routeDesc ? ` • ${routeDesc}` : ''}`,
        active: true,
      });

      // Post to backend if contacts are selected
      if (selectedContacts.length > 0) {
        await apiStartSession({
          sessionId: sessionId!,
          activityType: activity,
          title,
          route: routeDesc,
          sharedWithEmails: selectedContacts.map(c => c.email),
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        });
      }

      router.push({
        pathname: '/session/active',
        params: { id: sessionId!, title, activity, duration: durationMins, hasShared: selectedContacts.length > 0 ? '1' : '0' },
      });
    } catch (e: any) {
      setError(e.message || 'Failed to start session');
    } finally {
      setStarting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>New Session</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.container}>

          {/* Activity Type */}
          <Text style={styles.sectionTitle}>Activity Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {ACTIVITIES.map((act) => (
              <Pressable
                key={act}
                style={[styles.activityChip, activity === act && styles.activityChipActive]}
                onPress={() => setActivity(act)}
              >
                <Text style={[styles.activityChipText, activity === act && styles.activityChipTextActive]}>{act}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Session Details */}
          <Text style={styles.sectionTitle}>Session Details</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Session Title</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="e.g. Morning Run in the Park"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={(text) => { setTitle(text); setError(''); }}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Route / Where are you going?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Riverfront Trail, Base Camp to Peak"
              placeholderTextColor="#94A3B8"
              value={routeDesc}
              onChangeText={setRouteDesc}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Check-in Interval (Minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="15"
              placeholderTextColor="#94A3B8"
              value={durationMins}
              onChangeText={setDurationMins}
              keyboardType="number-pad"
            />
          </View>



          {/* Starting Location */}
          <Text style={styles.sectionTitle}>Starting Location</Text>
          <View style={styles.mapContainer}>
            {locationError ? (
              <View style={styles.mapPlaceholder}>
                <Feather name="map-pin" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
                <Text style={styles.mapPlaceholderText}>{locationError}</Text>
              </View>
            ) : region ? (
              <MapView style={styles.map} provider={PROVIDER_DEFAULT} initialRegion={region} showsUserLocation scrollEnabled={false} zoomEnabled={false} />
            ) : (
              <View style={styles.mapPlaceholder}>
                <ActivityIndicator color="#2563EB" />
                <Text style={[styles.mapPlaceholderText, { marginTop: 8 }]}>Locating...</Text>
              </View>
            )}
          </View>

          {/* Session Invitation */}
          <Text style={styles.sectionTitle}>Session Invitation</Text>
          {loadingContacts ? (
            <ActivityIndicator color="#2563EB" />
          ) : contacts.length === 0 ? (
            <View style={styles.noContactsBox}>
              <Feather name="users" size={20} color="#94A3B8" />
              <Text style={styles.noContactsText}>No trusted contacts yet. Add some in the Contacts tab.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.contactsHint}>Select who can see your live location during this session:</Text>
              {contacts.map(c => {
                const selected = !!selectedContacts.find(s => s.id === c.id);
                return (
                  <Pressable key={c.id} style={[styles.contactRow, selected && styles.contactRowSelected]} onPress={() => toggleContact(c)}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{c.name}</Text>
                      <Text style={styles.contactEmail}>{c.email}</Text>
                    </View>
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected && <Feather name="check" size={14} color="#FFFFFF" />}
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}

        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.primaryButton, starting && styles.primaryButtonDisabled]} onPress={handleStart} disabled={starting}>
          {starting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Start Safety Session</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { flexGrow: 1, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  backButton: { width: 60 },
  backButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },

  container: { padding: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 14, marginTop: 20 },

  activityScroll: { marginBottom: 8 },
  activityChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  activityChipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  activityChipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  activityChipTextActive: { color: '#1E3A8A' },

  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, fontSize: 16, color: '#0F172A' },
  inputError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 4, fontWeight: '500' },

  noContactsBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  noContactsText: { color: '#64748B', fontSize: 14, flex: 1, lineHeight: 20 },

  contactsHint: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1.5, borderColor: '#E2E8F0' },
  contactRowSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  contactAvatarText: { color: '#1E3A8A', fontSize: 16, fontWeight: '700' },
  contactName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  contactEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },

  footer: { padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  primaryButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

  mapContainer: { height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 4, marginBottom: 20 },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 20 },
  mapPlaceholderText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
});
