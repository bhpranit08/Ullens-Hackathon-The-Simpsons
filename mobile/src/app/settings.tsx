import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/auth';
import { getProfileImage, setProfileImage as saveProfileImage } from '@/profileService';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Change password modal
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Email modal
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfileImage().then(setProfileImage);
    }, [])
  );

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await saveProfileImage(uri);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    setChangingPassword(true);
    // Simulate API call — backend integration later
    setTimeout(() => {
      setChangingPassword(false);
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been updated.');
    }, 1200);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !/^\S+@\S+\.\S+$/.test(newEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    setChangingEmail(true);
    setTimeout(() => {
      setChangingEmail(false);
      setShowChangeEmail(false);
      setNewEmail('');
      Alert.alert('Success', 'Your email has been updated.');
    }, 1200);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Pressable onPress={pickProfileImage} style={styles.avatarContainer}>
            {profileImage ? (
              <View style={[styles.avatarLarge, { overflow: 'hidden', padding: 0 }]}>
                <Image source={{ uri: profileImage }} style={{ width: 96, height: 96 }} />
              </View>
            ) : (
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Feather name="camera" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>

          <Pressable style={styles.settingsRow} onPress={() => setShowChangePassword(true)}>
            <View style={styles.settingsIconBox}>
              <Feather name="lock" size={18} color="#2563EB" />
            </View>
            <View style={styles.settingsRowContent}>
              <Text style={styles.settingsRowTitle}>Change Password</Text>
              <Text style={styles.settingsRowSubtitle}>Update your login password</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>

          <Pressable style={styles.settingsRow} onPress={() => setShowChangeEmail(true)}>
            <View style={styles.settingsIconBox}>
              <Feather name="mail" size={18} color="#2563EB" />
            </View>
            <View style={styles.settingsRowContent}>
              <Text style={styles.settingsRowTitle}>Change Email</Text>
              <Text style={styles.settingsRowSubtitle}>{user.email}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>

          <Pressable style={styles.settingsRow} onPress={pickProfileImage}>
            <View style={styles.settingsIconBox}>
              <Feather name="image" size={18} color="#2563EB" />
            </View>
            <View style={styles.settingsRowContent}>
              <Text style={styles.settingsRowTitle}>Upload Profile Photo</Text>
              <Text style={styles.settingsRowSubtitle}>Change your avatar</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Preferences Section */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>

          <View style={styles.settingsRow}>
            <View style={styles.settingsIconBox}>
              <Feather name="bell" size={18} color="#F59E0B" />
            </View>
            <View style={styles.settingsRowContent}>
              <Text style={styles.settingsRowTitle}>Notifications</Text>
              <Text style={styles.settingsRowSubtitle}>Manage push notifications</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94A3B8" />
          </View>

          <View style={styles.settingsRow}>
            <View style={styles.settingsIconBox}>
              <Feather name="shield" size={18} color="#10B981" />
            </View>
            <View style={styles.settingsRowContent}>
              <Text style={styles.settingsRowTitle}>Privacy & Safety</Text>
              <Text style={styles.settingsRowSubtitle}>Control who can see your location</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94A3B8" />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>ABOUT</Text>

          <View style={styles.settingsRow}>
            <View style={styles.settingsIconBox}>
              <Feather name="info" size={18} color="#64748B" />
            </View>
            <View style={styles.settingsRowContent}>
              <Text style={styles.settingsRowTitle}>App Version</Text>
              <Text style={styles.settingsRowSubtitle}>1.0.0</Text>
            </View>
          </View>

          <View style={styles.settingsRow}>
            <View style={styles.settingsIconBox}>
              <Feather name="file-text" size={18} color="#64748B" />
            </View>
            <View style={styles.settingsRowContent}>
              <Text style={styles.settingsRowTitle}>Terms of Service</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94A3B8" />
          </View>
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#DC2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} transparent animationType="slide" onRequestClose={() => setShowChangePassword(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setShowChangePassword(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <Text style={styles.fieldLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password (min 8 chars)"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable style={styles.primaryButton} onPress={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Update Password</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Email Modal */}
      <Modal visible={showChangeEmail} transparent animationType="slide" onRequestClose={() => setShowChangeEmail(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Email</Text>
              <Pressable onPress={() => setShowChangeEmail(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Current Email</Text>
              <View style={styles.currentEmailBox}>
                <Text style={styles.currentEmailText}>{user.email}</Text>
              </View>
              <Text style={styles.fieldLabel}>New Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new email address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />
              <Pressable style={styles.primaryButton} onPress={handleChangeEmail} disabled={changingEmail}>
                {changingEmail ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Update Email</Text>}
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },

  scrollContainer: { padding: 24, paddingBottom: 60 },

  // Profile
  profileSection: { alignItems: 'center', marginBottom: 40 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatarLarge: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#2563EB' },
  avatarLargeText: { color: '#1E3A8A', fontSize: 36, fontWeight: '800' },
  cameraOverlay: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  profileName: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  profileEmail: { fontSize: 15, color: '#64748B' },

  // Section Groups
  sectionGroup: { marginBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 },

  settingsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  settingsIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  settingsRowContent: { flex: 1 },
  settingsRowTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  settingsRowSubtitle: { fontSize: 13, color: '#64748B' },

  // Sign Out
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 18, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', gap: 10, marginTop: 8 },
  signOutText: { color: '#DC2626', fontSize: 17, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalBody: { padding: 24 },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, color: '#0F172A', fontSize: 16, minHeight: 50, paddingHorizontal: 16 },

  currentEmailBox: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  currentEmailText: { fontSize: 16, color: '#64748B', fontWeight: '500' },

  primaryButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
