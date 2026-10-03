import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { apiGetContacts, apiAddContact, apiRemoveContact, ApiContact } from '@/apiService';

export default function ContactsScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      apiGetContacts().then(c => { setContacts(c); setLoading(false); }).catch(() => setLoading(false));
    }, [])
  );

  const handleAddContact = async () => {
    if (!contactEmail.trim()) return;
    setAdding(true);
    setError('');
    try {
      const newContact = await apiAddContact(contactEmail.trim());
      setContacts(prev => [...prev, newContact]);
      setContactEmail('');
      setShowAdd(false);
    } catch (e: any) {
      setError(e.message || 'Could not add contact');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveContact = (contact: ApiContact) => {
    Alert.alert('Remove Contact', `Remove ${contact.name} from your trusted contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRemoveContact(contact.id);
            setContacts(prev => prev.filter(c => c.id !== contact.id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trusted Contacts</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionDescription}>
          People with TrailGuard accounts you trust. They can see your live location when you share an activity.
        </Text>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginTop: 40 }} />
        ) : contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={40} color="#2563EB" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateTitle}>No trusted contacts yet</Text>
            <Text style={styles.emptyStateText}>
              Add someone by their email address. They must already have a TrailGuard account.
            </Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactEmail}>{contact.email}</Text>
              </View>
              <Pressable onPress={() => handleRemoveContact(contact)} style={styles.removeButton}>
                <Feather name="x" size={16} color="#EF4444" />
              </Pressable>
            </View>
          ))
        )}

        <Pressable style={styles.addButton} onPress={() => { setError(''); setShowAdd(true); }}>
          <Feather name="user-plus" size={18} color="#2563EB" style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>Add Trusted Contact</Text>
        </Pressable>
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Contact</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Their Email Address</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="e.g. bini@example.com"
                placeholderTextColor="#94A3B8"
                value={contactEmail}
                onChangeText={t => { setContactEmail(t); setError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Text style={styles.hintText}>
                The person must already have a TrailGuard account with this email.
              </Text>
              <Pressable style={[styles.submitButton, adding && styles.submitDisabled]} onPress={handleAddContact} disabled={adding}>
                {adding ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Add Contact</Text>}
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
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center' },

  scrollContainer: { padding: 24, paddingBottom: 40 },
  sectionDescription: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 24 },

  emptyState: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  emptyStateTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8 },
  emptyStateText: { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#1E3A8A', fontSize: 18, fontWeight: '700' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  contactEmail: { fontSize: 13, color: '#64748B' },
  removeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' },

  addButton: { marginTop: 8, paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  addButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalClose: { fontSize: 20, color: '#94A3B8', fontWeight: '600' },
  modalBody: { padding: 24 },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, color: '#0F172A', fontSize: 16, minHeight: 50, paddingHorizontal: 16 },
  inputError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 6, fontWeight: '500' },
  hintText: { color: '#64748B', fontSize: 13, marginTop: 8, lineHeight: 18 },

  submitButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
