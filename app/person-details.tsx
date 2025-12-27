import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { callService, personService } from '../services/api';

interface PersonDetails {
  id: string;
  profile_name: string;
  profile_id: string;
  phone_number?: string;
  address?: string;
  occupation?: string;
  age?: string;
  profile_pic_url?: string;
}

interface Group {
  id: string;
  group_name: string;
  note?: string;
}

interface Call {
  id: string;
  call_message: string;
  note?: string;
  created_at: string;
}

export default function PersonDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    loadPersonData();
  }, [id]);

  const loadPersonData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        router.replace('/login');
        return;
      }

      // Search for person
      const response = await personService.search('', userId);
      if (response.success) {
        const foundPerson = response.persons.find((p: PersonDetails) => p.id.toString() === id);
        if (foundPerson) {
          setPerson(foundPerson);
        }
      }

      // Load groups
      const groupsResponse = await personService.getGroups(id as string, userId);
      if (groupsResponse.success) {
        setGroups(groupsResponse.groups);
      }

      // Load calls
      const callsResponse = await callService.getCalls(id as string, userId);
      if (callsResponse.success) {
        setCalls(callsResponse.calls);
      }
    } catch (error) {
      console.error('Load person data error:', error);
      Alert.alert('Error', 'Failed to load person data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCall = () => {
    router.push(`/calls?personId=${id}`);
  };

  const handleAddGroup = () => {
    // Navigate to add group screen
    router.push(`/add-person?edit=${id}`);
  };

  const handleViewPosts = (groupId: string) => {
    router.push(`/posts?groupId=${groupId}&personId=${id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877f2" />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.container}>
        <Text>Person not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileSection}>
        {person.profile_pic_url && (
          <Image
            source={{ uri: person.profile_pic_url }}
            style={styles.profileImage}
          />
        )}
        <Text style={styles.profileName}>{person.profile_name}</Text>
        <Text style={styles.profileId}>ID: {person.profile_id}</Text>
        
        <View style={styles.infoGrid}>
          {person.phone_number && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{person.phone_number}</Text>
            </View>
          )}
          {person.age && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{person.age}</Text>
            </View>
          )}
          {person.occupation && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Occupation</Text>
              <Text style={styles.infoValue}>{person.occupation}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Groups ({groups.length})</Text>
          <TouchableOpacity onPress={handleAddGroup}>
            <Text style={styles.addButton}>+ Add Group</Text>
          </TouchableOpacity>
        </View>
        
        {groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={styles.groupItem}
            onPress={() => handleViewPosts(group.id)}
          >
            <View>
              <Text style={styles.groupName}>{group.group_name}</Text>
              {group.note && (
                <Text style={styles.groupNote}>{group.note}</Text>
              )}
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Call History ({calls.length})</Text>
          <TouchableOpacity onPress={handleAddCall}>
            <Text style={styles.addButton}>+ Add Call</Text>
          </TouchableOpacity>
        </View>
        
        {calls.map((call) => (
          <View key={call.id} style={styles.callItem}>
            <Text style={styles.callMessage}>{call.call_message}</Text>
            {call.note && (
              <Text style={styles.callNote}>{call.note}</Text>
            )}
            <Text style={styles.callDate}>
              {new Date(call.created_at).toLocaleDateString()}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  profileId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  infoItem: {
    alignItems: 'center',
    margin: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    color: '#1877f2',
    fontSize: 14,
    fontWeight: '600',
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  groupNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    color: '#999',
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