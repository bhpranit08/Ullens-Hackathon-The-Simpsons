import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/auth';

export default function ContactsScreen() {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Real data only: no hardcoded contacts
  const [contacts] = useState<any[]>([]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trusted Contacts</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionDescription}>
          These contacts will be notified if you miss a check-in or trigger an SOS during an active session.
        </Text>

        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={40} color="#2563EB" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateTitle}>No trusted contacts yet</Text>
            <Text style={styles.emptyStateText}>Add someone you trust to be notified when you need help during an outdoor activity.</Text>
          </View>
        ) : (
          contacts.map((contact: any) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactEmail}>{contact.email}</Text>
              </View>
            </View>
          ))
        )}

        <Pressable style={styles.addButton} onPress={() => setShowAdd(true)}>
          <Text style={styles.addButtonText}>+ Add Trusted Contact</Text>
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
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Contact's full name"
                placeholderTextColor="#94A3B8"
                value={contactName}
                onChangeText={setContactName}
                autoCapitalize="words"
              />
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Contact's email address"
                placeholderTextColor="#94A3B8"
                value={contactEmail}
                onChangeText={setContactEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Pressable style={styles.submitButton} onPress={() => setShowAdd(false)}>
                <Text style={styles.submitButtonText}>Add Contact</Text>
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
  emptyStateIcon: { fontSize: 40, marginBottom: 16 },
  emptyStateTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8 },
  emptyStateText: { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#1E3A8A', fontSize: 18, fontWeight: '700' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  contactEmail: { fontSize: 13, color: '#64748B' },

  addButton: { marginTop: 8, paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', alignItems: 'center' },
  addButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalClose: { fontSize: 20, color: '#94A3B8', fontWeight: '600' },
  modalBody: { padding: 24 },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, color: '#0F172A', fontSize: 16, minHeight: 50, paddingHorizontal: 16 },

  submitButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
