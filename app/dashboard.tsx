// app/dashboard.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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
import { authService, personService } from '../services/api';

interface Person {
  id: string;
  profile_name: string;
  profile_id: string;
  phone_number?: string;
  profile_pic_url?: string;
  address?: string;
  occupation?: string;
  age?: string;
}

export default function DashboardScreen() {
  const [userName, setUserName] = useState('');
  const [recentPersons, setRecentPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        router.replace('/login');
        return;
      }

      // Get user info
      const userResponse = await authService.getUser(userId);
      if (userResponse.success) {
        setUserName(userResponse.name);
      }

      // Get all persons (without search filter)
      const personsResponse = await personService.getAllPersons(userId);
      if (personsResponse.success) {
        // Sort by created_at (newest first) and take first 5
        const sortedPersons = personsResponse.persons.sort((a: Person, b: Person) => {
          // If you have created_at field, use it. Otherwise use ID as fallback
          return parseInt(b.id) - parseInt(a.id);
        }).slice(0, 5);
        setRecentPersons(sortedPersons);
      } else {
        console.log('No persons found or error:', personsResponse);
        setRecentPersons([]);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/login');
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
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/add-person')}
        >
          <Text style={styles.actionButtonText}>➕ Add New Person</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Persons</Text>
          <TouchableOpacity onPress={() => router.push('/all-persons')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {recentPersons.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No persons found</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first person to get started
            </Text>
          </View>
        ) : (
          recentPersons.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.personItem}
              onPress={() => router.push(`/person-details?id=${person.id}`)}
            >
              <View style={styles.personImageContainer}>
                {person.profile_pic_url ? (
                  <Image
                    source={{ uri: person.profile_pic_url }}
                    style={styles.personImage}
                  />
                ) : (
                  <View style={styles.personImagePlaceholder}>
                    <Text style={styles.personImagePlaceholderText}>
                      {person.profile_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName} numberOfLines={1}>
                  {person.profile_name}
                </Text>
                <Text style={styles.personId} numberOfLines={1}>
                  ID: {person.profile_id}
                </Text>
                {person.phone_number && (
                  <Text style={styles.personPhone} numberOfLines={1}>
                    📞 {person.phone_number}
                  </Text>
                )}
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* You can add other sections like groups, calls, etc. */}
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
  header: {
    backgroundColor: '#1877f2',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutText: {
    fontSize: 16,
    color: 'white',
    textDecorationLine: 'underline',
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
  seeAllText: {
    fontSize: 14,
    color: '#1877f2',
  },
  actionButton: {
    backgroundColor: '#1877f2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  personItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  personImageContainer: {
    marginRight: 12,
  },
  personImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  personImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1877f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personImagePlaceholderText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  personId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  personPhone: {
    fontSize: 12,
    color: '#666',
  },
  arrow: {
    fontSize: 20,
    color: '#999',
    marginLeft: 10,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
});