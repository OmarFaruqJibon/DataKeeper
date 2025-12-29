// app/person-details.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Briefcase, Calendar, ChevronLeft, ChevronRight, Edit2, Hash, MapPin, Phone, PhoneCall, Plus, User, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { callService, personService, postService } from '../services/api';

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
  const [refreshing, setRefreshing] = useState(false);
  const [postCount, setPostCount] = useState(0); 

  useEffect(() => {
    loadPersonData();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadPersonData(true);
    }, [id])
  );

  const loadPersonData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    if (isRefresh) setRefreshing(true);

    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        router.replace('/login');
        return;
      }

      // Search person
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

      //  post count 
      await loadPostCount(id as string, userId, groupsResponse.groups || []);

    } catch (error) {
      console.error('Load person data error:', error);
      Alert.alert('Error', 'Failed to load person data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // calculate total post count
  const loadPostCount = async (personId: string, userId: string, groups: Group[]) => {
    try {
      let totalPosts = 0;
      
      if (!groups || groups.length === 0) {
        setPostCount(0);
        return;
      }
      for (const group of groups) {
        const postsResponse = await postService.getPosts(personId, group.id, userId);
        if (postsResponse.success && postsResponse.posts) {
          totalPosts += postsResponse.posts.length;
        }
      }
      
      setPostCount(totalPosts);
    } catch (error) {
      console.error('Error loading post count:', error);
      setPostCount(0);
    }
  };

  const onRefresh = () => {
    loadPersonData(true);
  };

  const handleAddCall = () => {
    router.push(`/calls?personId=${id}`);
  };

  const handleAddGroup = () => {
    router.push(`/add-person?edit=${id}`);
  };

  const handleViewPosts = (groupId: string) => {
    router.push(`/posts?groupId=${groupId}&personId=${id}`);
  };

  const handleEditPerson = () => {
    Alert.alert('Info', 'Edit feature coming soon!');
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => handleViewPosts(item.id)}
      activeOpacity={0.9}
    >
      <View style={styles.groupCardContent}>
        <View style={styles.groupIconContainer}>
          <Users size={20} color="#10b981" />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.group_name}</Text>
          {item.note && (
            <Text style={styles.groupNote} numberOfLines={1}>
              {item.note}
            </Text>
          )}
        </View>
        <ChevronRight size={20} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  const renderCallItem = ({ item }: { item: Call }) => (
    <View style={styles.callCard}>
      <View style={styles.callHeader}>
        <View style={styles.callIconContainer}>
          <PhoneCall size={16} color="#3b82f6" />
        </View>
        <Text style={styles.callDate}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>
      <Text style={styles.callMessage}>{item.call_message}</Text>
      {item.note && (
        <Text style={styles.callNote}>{item.note}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <User size={48} color="#d1d5db" />
          </View>
          <Text style={styles.errorTitle}>Person not found</Text>
          <Text style={styles.errorText}>The person you are looking for does not exist</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={styles.headerTitle}>Profile Details</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditPerson}
          activeOpacity={0.7}
        >
          <Edit2 size={20} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8b5cf6']}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {person.profile_pic_url ? (
                <Image
                  source={{ uri: person.profile_pic_url }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>
                    {person.profile_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{person.profile_name}</Text>
              <View style={styles.profileIdContainer}>
                <Hash size={14} color="#6b7280" />
                <Text style={styles.profileId}>{person.profile_id}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{groups.length}</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{calls.length}</Text>
              <Text style={styles.statLabel}>Calls</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{postCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.infoGrid}>
              {person.phone_number && (
                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#3b82f6' }]}>
                    <Phone size={16} color="white" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{person.phone_number}</Text>
                  </View>
                </View>
              )}

              {person.age && (
                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#8b5cf6' }]}>
                    <Calendar size={16} color="white" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Age</Text>
                    <Text style={styles.infoValue}>{person.age} years</Text>
                  </View>
                </View>
              )}

              {person.occupation && (
                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#10b981' }]}>
                    <Briefcase size={16} color="white" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Occupation</Text>
                    <Text style={styles.infoValue}>{person.occupation}</Text>
                  </View>
                </View>
              )}

              {person.address && (
                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: '#f59e0b' }]}>
                    <MapPin size={16} color="white" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue} numberOfLines={2}>{person.address}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Groups Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: '#10b981' }]}>
                <Users size={18} color="white" />
              </View>
              <Text style={styles.sectionTitle}>Groups ({groups.length})</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddGroup}
              activeOpacity={0.8}
            >
              <Plus size={16} color="white" />
              <Text style={styles.addButtonText}>New Group</Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users size={32} color="#d1d5db" />
              </View>
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptyText}>Add your first group for this person</Text>
            </View>
          ) : (
            <FlatList
              data={groups}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>

        {/* Calls Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: '#3b82f6' }]}>
                <PhoneCall size={18} color="white" />
              </View>
              <Text style={styles.sectionTitle}>Call History ({calls.length})</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddCall}
              activeOpacity={0.8}
            >
              <Plus size={16} color="white" />
              <Text style={styles.addButtonText}>New Call</Text>
            </TouchableOpacity>
          </View>

          {calls.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <PhoneCall size={32} color="#d1d5db" />
              </View>
              <Text style={styles.emptyTitle}>No calls yet</Text>
              <Text style={styles.emptyText}>Add your first call for this person</Text>
            </View>
          ) : (
            <FlatList
              data={calls}
              renderItem={renderCallItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 50,
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
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#f3f4f6',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#f3f4f6',
  },
  profileImageText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileId: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  infoSection: {
    marginBottom: 8,
  },
  infoGrid: {
    gap: 12,
    marginTop: 13
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  section: {
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
    marginBottom: 16,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    gap: 8,
  },
  groupCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  groupCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#dcfce7',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  groupNote: {
    fontSize: 12,
    color: '#6b7280',
  },
  callCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  callIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  callMessage: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 6,
  },
  callNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footerSpacer: {
    height: 40,
  },
});