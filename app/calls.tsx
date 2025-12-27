// app/calls.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, ChevronLeft, Clock, FileText, MessageSquare, Phone, PhoneCall, Send, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { callService } from '../services/api';

interface Call {
  id: string;
  call_message: string;
  note?: string;
  created_at: string;
}

export default function CallsScreen() {
  const { personId } = useLocalSearchParams();
  const router = useRouter();
  
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [callMessage, setCallMessage] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadCalls();
  }, [personId]);

  const loadCalls = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        router.replace('/login');
        return;
      }

      const response = await callService.getCalls(personId as string, userId);
      if (response.success) {
        setCalls(response.calls);
      }
    } catch (error) {
      console.error('Load calls error:', error);
      Alert.alert('Error', 'Failed to load calls');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCalls();
  };

  const handleAddCall = async () => {
    if (!callMessage.trim()) {
      Alert.alert('Error', 'Please enter call message');
      return;
    }

    setSaving(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        router.replace('/login');
        return;
      }

      const response = await callService.createCall(
        personId as string,
        userId,
        callMessage,
        note || undefined
      );

      if (response.success) {
        Alert.alert('Success', 'Call added successfully');
        setCallMessage('');
        setNote('');
        loadCalls(); // Refresh list
      } else {
        Alert.alert('Error', response.error || 'Failed to add call');
      }
    } catch (error) {
      console.error('Add call error:', error);
      Alert.alert('Error', 'Failed to add call');
    } finally {
      setSaving(false);
    }
  };

  const handleClearForm = () => {
    setCallMessage('');
    setNote('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderCallItem = ({ item, index }: { item: Call; index: number }) => (
    <View style={styles.callCard}>
      <View style={styles.callHeader}>
        <View style={styles.callIconContainer}>
          <PhoneCall size={16} color="#3b82f6" />
        </View>
        <View style={styles.callInfo}>
          <Text style={styles.callNumber}>Call #{calls.length - index}</Text>
          <View style={styles.callMeta}>
            <Clock size={12} color="#9ca3af" />
            <Text style={styles.callDate}>{formatDate(item.created_at)}</Text>
            <Text style={styles.callTime}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.callMessage}>{item.call_message}</Text>
      
      {item.note && (
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <MessageSquare size={12} color="#6b7280" />
            <Text style={styles.noteLabel}>Notes</Text>
          </View>
          <Text style={styles.noteText}>{item.note}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading call history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Call Log</Text>
          <Text style={styles.headerSubtitle}>{calls.length} total calls</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* New Call Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={[styles.formIcon, { backgroundColor: '#3b82f6' }]}>
              <Phone size={20} color="white" />
            </View>
            <View style={styles.formHeaderContent}>
              <Text style={styles.formTitle}>New Call</Text>
              <Text style={styles.formSubtitle}>Record call details and notes</Text>
            </View>
            {(callMessage.trim() || note.trim()) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearForm}
                activeOpacity={0.7}
              >
                <X size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <MessageSquare size={16} color="#3b82f6" />
              <Text style={styles.label}>Call Message *</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What was discussed in the call?"
              placeholderTextColor="#9ca3af"
              value={callMessage}
              onChangeText={setCallMessage}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <FileText size={16} color="#3b82f6" />
              <Text style={styles.label}>Additional Notes (Optional)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any follow-up actions"
              placeholderTextColor="#9ca3af"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleAddCall}
            disabled={saving || !callMessage.trim()}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Send size={18} color="white" />
                <Text style={styles.submitButtonText}>Save Call</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Call History */}
        <View style={styles.callsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: '#3b82f620' }]}>
                <Calendar size={18} color="#3b82f6" />
              </View>
              <Text style={styles.sectionTitle}>
                Call History
                <Text style={styles.callsCount}> ({calls.length})</Text>
              </Text>
            </View>
            {calls.length > 0 && (
              <TouchableOpacity
                style={styles.sortButton}
                activeOpacity={0.7}
              >
                <Text style={styles.sortButtonText}>Recent First</Text>
              </TouchableOpacity>
            )}
          </View>

          {calls.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <PhoneCall size={48} color="#d1d5db" />
              </View>
              <Text style={styles.emptyTitle}>No calls recorded</Text>
              <Text style={styles.emptyText}>
                Start by logging your first call with this person
              </Text>
            </View>
          ) : (
            <FlatList
              data={calls}
              renderItem={renderCallItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.callsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  formIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formHeaderContent: {
    flex: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
    shadowColor: '#93c5fd',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  callsSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  callsCount: {
    color: '#6b7280',
    fontWeight: 'normal',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  callsList: {
    gap: 12,
  },
  callCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  callIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfo: {
    flex: 1,
  },
  callNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  callMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  callDate: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  callTime: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  callMessage: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 12,
  },
  noteContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  noteText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footerSpacer: {
    height: 40,
  },
});