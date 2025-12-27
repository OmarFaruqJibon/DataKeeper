// app/dashboard.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { BarChart3, Briefcase, Calendar, ChevronRight, Hash, LogOut, Phone, Plus, Search, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  created_at?: string;
}

export default function DashboardScreen() {
  const [userName, setUserName] = useState('');
  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [filteredPersons, setFilteredPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update the filtering logic
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // No search query
      if (showAll) {
        // Show all persons
        setFilteredPersons(allPersons);
      } else {
        // Show only recent persons
        setFilteredPersons(allPersons.slice(0, 5));
      }
    } else {
      const filtered = allPersons.filter(person =>
        person.profile_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.profile_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (person.phone_number && person.phone_number.includes(searchQuery))
      );
      setFilteredPersons(filtered);
    }
  }, [searchQuery, allPersons, showAll]);

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

      // Get all persons
      const personsResponse = await personService.getAllPersons(userId);
      if (personsResponse.success) {
        // Sort by ID 
        const sortedPersons = personsResponse.persons.sort((a: Person, b: Person) => {
          return parseInt(b.id) - parseInt(a.id);
        });
        setAllPersons(sortedPersons);
        setFilteredPersons(sortedPersons.slice(0, 5));
        setShowAll(false);
      } else {
        console.log('No persons found or error:', personsResponse);
        setAllPersons([]);
        setFilteredPersons([]);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleToggleShowAll = () => {
    setShowAll(!showAll);
    setSearchQuery('');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const renderPersonItem = ({ item }: { item: Person }) => (
    <TouchableOpacity
      style={styles.personCard}
      onPress={() => router.push(`/person-details?id=${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.personCardHeader}>
        <View style={styles.personAvatarContainer}>
          {item.profile_pic_url ? (
            <Image
              source={{ uri: item.profile_pic_url }}
              style={styles.personAvatar}
            />
          ) : (
            <View style={styles.personAvatarPlaceholder}>
              <Text style={styles.personAvatarText}>
                {item.profile_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.personInfo}>
          <Text style={styles.personName} numberOfLines={1}>
            {item.profile_name}
          </Text>
          <View style={styles.personDetails}>
            <View style={styles.detailItem}>
              <Hash size={12} color="#6b7280" />
              <Text style={styles.detailText}>{item.profile_id}</Text>
            </View>
            {item.phone_number && (
              <View style={styles.detailItem}>
                <Phone size={12} color="#6b7280" />
                <Text style={styles.detailText}>{item.phone_number}</Text>
              </View>
            )}
          </View>
        </View>
        <ChevronRight size={20} color="#9ca3af" />
      </View>

      {item.occupation || item.age ? (
        <View style={styles.personCardFooter}>
          {item.occupation && (
            <View style={styles.footerItem}>
              <Briefcase size={14} color="#10b981" />
              <Text style={styles.footerText}>{item.occupation}</Text>
            </View>
          )}
          {item.age && (
            <View style={styles.footerItem}>
              <Calendar size={14} color="#8b5cf6" />
              <Text style={styles.footerText}>{item.age} years</Text>
            </View>
          )}
        </View>
      ) : null}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search persons by name, ID or phone..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Text style={styles.clearSearch}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >


        {/* Quick Actions */}
        <View style={{ marginTop: 20 }}></View>
        <View style={styles.section}>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/add-person')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#8b5cf620' }]}>
                <Plus size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.actionTitle}>Add New Person</Text>
              <Text style={styles.actionSubtitle}>Create a new profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/statistics')}
              // onPress={() =>
              //   Alert.alert(
              //     'Coming Soon',
              //     'This feature will come soon.',
              //     [{ text: 'OK' }]
              //   )
              // }
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#10b98120' }]}>
                <BarChart3 size={24} color="#10b981" />
              </View>
              <Text style={styles.actionTitle}>Statistics</Text>
              <Text style={styles.actionSubtitle}>View insights & analysis</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Persons List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? 'Search Results' : showAll ? 'All Persons' : 'Recent Persons'}
              <Text style={styles.sectionCount}> ({filteredPersons.length})</Text>
            </Text>
            {!searchQuery && allPersons.length > 5 && (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={handleToggleShowAll}
              >
                <Text style={styles.toggleButtonText}>
                  {showAll ? 'Show Less' : 'View All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredPersons.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <User size={48} color="#d1d5db" />
              </View>
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'No results found' : 'No persons yet'}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? 'Try searching with different terms'
                  : 'Add your first person to get started'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => router.push('/add-person')}
                >
                  <Text style={styles.emptyStateButtonText}>Add New Person</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredPersons}
              renderItem={renderPersonItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.personsList}
            />
          )}
        </View>
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
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1f2937',
  },
  clearSearch: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sectionCount: {
    color: '#6b7280',
    fontWeight: 'normal',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    justifyContent: "space-around"
  },
  actionCard: {
    width: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  personsList: {
    paddingBottom: 8,
  },
  personCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  personCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  personAvatarContainer: {
    marginRight: 12,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  personAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  personDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  personCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
});