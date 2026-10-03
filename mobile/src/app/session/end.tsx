import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, SafeAreaView, ActivityIndicator, Image, BackHandler } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateHistoryEvent, getHistoryEvent, HistoryEvent } from '@/history';

export default function EndSessionScreen() {
  const router = useRouter();
  const { id, duration } = useLocalSearchParams<{id: string, duration: string}>();
  
  const [session, setSession] = useState<HistoryEvent | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  useEffect(() => {
    if (id) {
      getHistoryEvent(id).then(e => setSession(e ?? null));
    }
    
    const onBackPress = () => {
      router.replace('/');
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [id, router]);

  const handleSave = async () => {
    setSaving(true);
    await updateHistoryEvent(id, {
      description,
      notes,
      photos,
      active: false,
      duration: parseInt(duration || '0', 10),
      subtitle: 'Session Completed',
    });
    setSaving(false);
    router.replace('/');
  };

  if (!session) return <SafeAreaView style={styles.center}><ActivityIndicator color="#2563EB" /></SafeAreaView>;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/')} style={styles.closeButton}>
            <Feather name="x" size={24} color="#64748B" />
          </Pressable>
          <Text style={styles.headerTitle}>Session Completed!</Text>
          <Text style={styles.headerSubtitle}>Great job staying safe out there.</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Feather name="activity" size={20} color="#64748B" />
            <Text style={styles.summaryText}>{session.type || 'Activity'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Feather name="clock" size={20} color="#64748B" />
            <Text style={styles.summaryText}>{formatDuration(parseInt(duration || '0', 10))}</Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>How did it go?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write a description about your activity..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Private Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any safety notes, hazards encountered, etc."
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Photos</Text>
          {photos.length > 0 && (
            <ScrollView horizontal style={styles.photosScroll} showsHorizontalScrollIndicator={false}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <Pressable 
                    style={styles.removePhotoBtn}
                    onPress={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Feather name="x" size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <Pressable style={styles.photoPlaceholder} onPress={pickImage}>
            <Feather name="camera" size={24} color="#2563EB" />
            <Text style={styles.photoText}>{photos.length > 0 ? 'Add More Photos' : 'Add Photos'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={styles.primaryButton} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save to History</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  
  header: { marginBottom: 32, alignItems: 'center', position: 'relative' },
  closeButton: { position: 'absolute', right: 0, top: 0, padding: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 8, marginTop: 12 },
  headerSubtitle: { fontSize: 16, color: '#64748B' },
  
  summaryCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 32, flexDirection: 'row', justifyContent: 'space-around' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  
  formGroup: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, fontSize: 16, color: '#0F172A' },
  textArea: { minHeight: 120 },
  
  photoPlaceholder: { backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#BFDBFE', borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  photoText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  
  photosScroll: { marginBottom: 12 },
  photoContainer: { position: 'relative', marginRight: 12 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#E2E8F0' },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  
  footer: { padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  primaryButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
