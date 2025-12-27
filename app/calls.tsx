import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877f2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Add New Call</Text>
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Call Message *"
          value={callMessage}
          onChangeText={setCallMessage}
          multiline
          numberOfLines={3}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Notes (Optional)"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={2}
        />
        
        <TouchableOpacity
          style={[styles.addButton, saving && styles.buttonDisabled]}
          onPress={handleAddCall}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.addButtonText}>Add Call</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call History ({calls.length})</Text>
        
        {calls.map((call) => (
          <View key={call.id} style={styles.callItem}>
            <Text style={styles.callMessage}>{call.call_message}</Text>
            {call.note && (
              <Text style={styles.callNote}>{call.note}</Text>
            )}
            <Text style={styles.callDate}>
              {new Date(call.created_at).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#1877f2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a0c4ff',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  callItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  callMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  callNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  callDate: {
    fontSize: 12,
    color: '#999',
  },
});