import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Briefcase, Calendar, Camera, ChevronLeft, FileText, Hash, MapPin, MessageSquare, Phone, Plus, Search, Upload, User, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { dataService, groupService, personService, postService } from '../services/api';

interface Person {
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
  person_id?: string;
}

interface Post {
  id: string;
  post_details: string;
  comments?: string;
  created_at: string;
}

export default function AddPersonScreen() {
  const router = useRouter();

  // States
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Person Info
  const [personInfo, setPersonInfo] = useState({
    profileName: '',
    profileId: '',
    phoneNumber: '',
    address: '',
    occupation: '',
    age: '',
  });

  // Group Info
  const [groupInfo, setGroupInfo] = useState({
    id: null as string | null,
    groupName: '',
    note: '',
  });

  // Post Info
  const [postInfo, setPostInfo] = useState({
    postDetails: '',
    comments: '',
  });

  // Auto-suggestion states
  const [personSuggestions, setPersonSuggestions] = useState<Person[]>([]);
  const [groupSuggestions, setGroupSuggestions] = useState<Group[]>([]);
  const [showPersonSuggestions, setShowPersonSuggestions] = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personGroups, setPersonGroups] = useState<Group[]>([]);
  const [existingPosts, setExistingPosts] = useState<Post[]>([]);

  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  // Image states
  const [image, setImage] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>('');

  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch user ID
  const getUserId = async (): Promise<string> => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        router.replace('/login');
        return '';
      }
      return userId;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return '';
    }
  };

  // Search for persons when profile name changes
  useEffect(() => {
    const searchPersons = async () => {
      if (personInfo.profileName.length < 2) {
        setPersonSuggestions([]);
        setShowPersonSuggestions(false);
        return;
      }

      const userId = await getUserId();
      if (!userId) return;

      try {
        const response = await personService.search(personInfo.profileName, userId);
        if (response.success) {
          setPersonSuggestions(response.persons);
          setShowPersonSuggestions(true);
        }
      } catch (error) {
        console.error('Error searching persons:', error);
      }
    };

    const debounceTimer = setTimeout(searchPersons, 300);
    return () => clearTimeout(debounceTimer);
  }, [personInfo.profileName]);

  // Search for groups when group name changes
  useEffect(() => {
    const searchGroups = async () => {
      if (!selectedPersonId || groupInfo.groupName.length < 2) {
        setGroupSuggestions([]);
        setShowGroupSuggestions(false);
        return;
      }

      const userId = await getUserId();
      if (!userId) return;

      try {
        // Filter person's groups by search term
        const filtered = personGroups.filter(group =>
          group.group_name.toLowerCase().includes(groupInfo.groupName.toLowerCase())
        );
        setGroupSuggestions(filtered);
        setShowGroupSuggestions(filtered.length > 0);
      } catch (error) {
        console.error('Error searching groups:', error);
      }
    };

    const debounceTimer = setTimeout(searchGroups, 300);
    return () => clearTimeout(debounceTimer);
  }, [groupInfo.groupName, selectedPersonId, personGroups]);

  // Handle person selection from suggestions
  const handleSelectPerson = async (person: Person) => {
    // Fill person info
    setPersonInfo({
      profileName: person.profile_name,
      profileId: person.profile_id,
      phoneNumber: person.phone_number || '',
      address: person.address || '',
      occupation: person.occupation || '',
      age: person.age || '',
    });

    if (person.profile_pic_url) {
      setProfilePreview(person.profile_pic_url);
    }

    // Set selected person ID
    setSelectedPersonId(person.id);

    // Hide suggestions
    setShowPersonSuggestions(false);

    // Clear group info
    setGroupInfo({
      id: null,
      groupName: '',
      note: '',
    });

    // Clear posts
    setExistingPosts([]);

    // Fetch person's groups
    const userId = await getUserId();
    if (!userId) return;

    try {
      const response = await personService.getGroups(person.id, userId);
      if (response.success) {
        setPersonGroups(response.groups);
      }
    } catch (error) {
      console.error('Error fetching person groups:', error);
    }
  };

  // Handle group selection from suggestions
  const handleSelectGroup = async (group: Group) => {
    setGroupInfo({
      id: group.id,
      groupName: group.group_name,
      note: group.note || '',
    });

    setShowGroupSuggestions(false);

    // Fetch posts for this group
    if (selectedPersonId) {
      const userId = await getUserId();
      if (!userId) return;

      try {
        const response = await postService.getPosts(
          selectedPersonId,
          group.id,
          userId
        );
        if (response.success) {
          setExistingPosts(response.posts);
        }
      } catch (error) {
        console.error('Error fetching group posts:', error);
        setExistingPosts([]);
      }
    }
  };

  // Pick image from gallery
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], 
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled) {
    setImage(result.assets[0].uri);
    
    const uri = result.assets[0].uri;
    const filename = uri.split('/').pop() || 'profile.jpg';
    const fileType = result.assets[0].mimeType || 'image/jpeg';
    
    // Create the object structure React Native FormData expects
    const fileObject = {
      uri,
      name: filename,
      type: fileType,
    };
    
    setProfileImage(fileObject as any);
    setProfilePreview(uri);
  }
};

  // Save group
const saveGroup = async () => {
  if (!groupInfo.groupName.trim()) {
    Alert.alert('Error', 'Group name is required');
    return;
  }

  const userId = await getUserId();
  if (!userId) return;

  setSaving(true);

  try {
    if (!selectedPersonId) {
      if (!personInfo.profileName.trim() || !personInfo.profileId.trim()) {
        throw new Error('Please fill in Profile Name and Profile ID');
      }

      // Create FormData correctly for React Native
      const formData = new FormData();
      
      // Append all text fields
      formData.append('userId', userId);
      formData.append('profile_name', personInfo.profileName);
      formData.append('profile_id', personInfo.profileId);
      formData.append('phone_number', personInfo.phoneNumber || '');
      formData.append('address', personInfo.address || '');
      formData.append('occupation', personInfo.occupation || '');
      formData.append('age', personInfo.age || '');
      formData.append('group_name', groupInfo.groupName.trim());
      formData.append('note', groupInfo.note.trim() || '');
      formData.append('post_details', 'auto-created');
      formData.append('comments', '');

      if (profileImage) {
        const filename = profileImage.name || 'profile.jpg';
        const fileType = profileImage.type || 'image/jpeg';
        
        // In React Native, use the object format
        formData.append('profile_pic', {
          uri: image, // Use the URI from state
          name: filename,
          type: fileType,
        } as any);
      }

      const response = await dataService.saveData(formData);

      if (response.success) {
        setSelectedPersonId(response.personId);
        setGroupInfo(prev => ({ ...prev, id: response.groupId }));

        // Fetch updated groups
        const groupsResponse = await personService.getGroups(response.personId, userId);
        if (groupsResponse.success) {
          setPersonGroups(groupsResponse.groups);
        }

        setShowGroupModal(false);
        Alert.alert('Success', 'Person and group saved successfully!');
      } else {
        throw new Error(response.error || 'Failed to save');
      }
    } else {
      // For existing person, save just the group
      const response = await groupService.createGroup(
        selectedPersonId,
        groupInfo.groupName,
        userId,
        groupInfo.note
      );

      if (response.success) {
        const newGroup = response.group;
        setPersonGroups(prev => [...prev, newGroup]);
        setGroupInfo({
          id: newGroup.id,
          groupName: newGroup.group_name,
          note: newGroup.note || '',
        });

        setShowGroupModal(false);
        Alert.alert('Success', 'Group saved successfully!');
      } else {
        throw new Error(response.error || 'Failed to save group');
      }
    }
  } catch (error) {
    console.error('Save error:', error);
    Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save');
  } finally {
    setSaving(false);
  }
};

  // Save post
  const savePost = async () => {
    if (!postInfo.postDetails.trim()) {
      Alert.alert('Error', 'Post details are required');
      return;
    }

    if (!selectedPersonId || !groupInfo.id) {
      Alert.alert('Error', 'Please select a person and group first');
      return;
    }

    const userId = await getUserId();
    if (!userId) return;

    setSaving(true);

    try {
      const response = await postService.createPost(
        selectedPersonId,
        groupInfo.id,
        postInfo.postDetails,
        userId,
        postInfo.comments
      );

      if (response.success) {
        // Add new post to existing posts
        const newPost: Post = {
          id: response.post?.id || Date.now().toString(),
          post_details: postInfo.postDetails,
          comments: postInfo.comments,
          created_at: new Date().toISOString(),
        };

        setExistingPosts(prev => [newPost, ...prev]);
        setPostInfo({ postDetails: '', comments: '' });
        setShowPostModal(false);
        Alert.alert('Success', 'Post saved successfully!');
      } else {
        throw new Error('Failed to save post');
      }
    } catch (error) {
      console.error('Save post error:', error);
      Alert.alert('Error', 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const userId = await getUserId();
    if (!userId) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('profile_name', personInfo.profileName);
      formData.append('profile_id', personInfo.profileId);
      formData.append('phone_number', personInfo.phoneNumber);
      formData.append('address', personInfo.address);
      formData.append('occupation', personInfo.occupation);
      formData.append('age', personInfo.age);

      if (profileImage) {
        formData.append('profile_pic', profileImage as any);
      }

      formData.append('group_name', groupInfo.groupName);
      formData.append('note', groupInfo.note);
      formData.append('post_details', postInfo.postDetails);
      formData.append('comments', postInfo.comments);

      if (groupInfo.id) {
        formData.append('group_id', groupInfo.id);
      }

      const response = await dataService.saveData(formData);

      if (response.success) {
        Alert.alert('Success', 'Data saved successfully!');
        resetForm();
      } else {
        throw new Error(response.error || 'Failed to save data');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!personInfo.profileName.trim()) {
      newErrors.profileName = 'Profile Name is required';
    }
    if (!personInfo.profileId.trim()) {
      newErrors.profileId = 'Profile ID is required';
    }
    if (!groupInfo.groupName.trim()) {
      newErrors.groupName = 'Group Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset form
  const resetForm = () => {
    setPersonInfo({
      profileName: '',
      profileId: '',
      phoneNumber: '',
      address: '',
      occupation: '',
      age: '',
    });
    setGroupInfo({
      id: null,
      groupName: '',
      note: '',
    });
    setPostInfo({
      postDetails: '',
      comments: '',
    });
    setProfileImage(null);
    setProfilePreview('');
    setSelectedPersonId(null);
    setPersonGroups([]);
    setExistingPosts([]);
    setPersonSuggestions([]);
    setGroupSuggestions([]);
  };



  const renderPersonSuggestion = ({ item }: { item: Person }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectPerson(item)}
    >
      <View style={styles.suggestionContent}>
        {item.profile_pic_url ? (
          <Image
            source={{ uri: item.profile_pic_url }}
            style={styles.profileThumb}
          />
        ) : (
          <View style={[styles.profileThumb, styles.placeholderThumb]}>
            <User size={18} color="#8b5cf6" />
          </View>
        )}
        <View style={styles.suggestionText}>
          <Text style={styles.suggestionName}>{item.profile_name}</Text>
          <View style={styles.suggestionMeta}>
            <Text style={styles.suggestionId}>ID: {item.profile_id}</Text>
            {item.phone_number && (
              <Text style={styles.suggestionPhone}>• {item.phone_number}</Text>
            )}
          </View>
        </View>
        <View style={styles.suggestionArrow}>
          <ChevronLeft size={16} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGroupSuggestion = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectGroup(item)}
    >
      <View style={styles.suggestionContent}>
        <View style={[styles.groupThumb]}>
          <Users size={18} color="#10b981" />
        </View>
        <View style={styles.suggestionText}>
          <Text style={styles.suggestionName}>{item.group_name}</Text>
          {item.note && (
            <Text style={styles.suggestionNote} numberOfLines={1}>{item.note}</Text>
          )}
        </View>
        <View style={styles.suggestionArrow}>
          <ChevronLeft size={16} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Add New Person</Text>
            <Text style={styles.headerSubtitle}>Create or select existing profile</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Person Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#8b5cf6' }]}>
              <User size={20} color="white" />
            </View>
            <View style={styles.cardHeaderContent}>
              <Text style={styles.cardTitle}>Person Information</Text>
              <Text style={styles.cardSubtitle}>Enter or search Facebook profile details</Text>
            </View>
          </View>

          {/* Profile Name with Suggestions */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Search size={16} color="#8b5cf6" />
              <Text style={styles.label}>Profile Name *</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.profileName && styles.inputError]}
                placeholder="Search by name..."
                placeholderTextColor="#9ca3af"
                value={personInfo.profileName}
                onChangeText={(text) => {
                  setPersonInfo(prev => ({ ...prev, profileName: text }));
                  setSelectedPersonId(null);
                }}
                onFocus={() => {
                  if (personSuggestions.length > 0) {
                    setShowPersonSuggestions(true);
                  }
                }}
              />
              {personInfo.profileName && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setPersonInfo(prev => ({ ...prev, profileName: '' }));
                    setPersonSuggestions([]);
                    setShowPersonSuggestions(false);
                  }}
                >
                  <X size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Person Suggestions */}
            {showPersonSuggestions && personSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={personSuggestions}
                  renderItem={renderPersonSuggestion}
                  keyExtractor={(item) => item.id}
                  style={styles.suggestionsList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}
            
            {errors.profileName && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.profileName}</Text>
              </View>
            )}
          </View>

          {/* Profile ID */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Hash size={16} color="#8b5cf6" />
              <Text style={styles.label}>Profile ID *</Text>
            </View>
            <TextInput
              style={[styles.input, errors.profileId && styles.inputError]}
              placeholder="Enter unique profile ID"
              placeholderTextColor="#9ca3af"
              value={personInfo.profileId}
              onChangeText={(text) => setPersonInfo(prev => ({ ...prev, profileId: text }))}
              editable={!selectedPersonId}
            />
            {errors.profileId && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.profileId}</Text>
              </View>
            )}
          </View>

          {/* Two Column Layout for Phone and Age */}
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <View style={styles.labelContainer}>
                <Phone size={16} color="#8b5cf6" />
                <Text style={styles.label}>Phone Number</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#9ca3af"
                value={personInfo.phoneNumber}
                onChangeText={(text) => setPersonInfo(prev => ({ ...prev, phoneNumber: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <View style={styles.labelContainer}>
                <Calendar size={16} color="#8b5cf6" />
                <Text style={styles.label}>Age</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter age"
                placeholderTextColor="#9ca3af"
                value={personInfo.age}
                onChangeText={(text) => setPersonInfo(prev => ({ ...prev, age: text }))}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <MapPin size={16} color="#8b5cf6" />
              <Text style={styles.label}>Address</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter complete address"
              placeholderTextColor="#9ca3af"
              value={personInfo.address}
              onChangeText={(text) => setPersonInfo(prev => ({ ...prev, address: text }))}
            />
          </View>

          {/* Occupation */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Briefcase size={16} color="#8b5cf6" />
              <Text style={styles.label}>Occupation</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter profession or occupation"
              placeholderTextColor="#9ca3af"
              value={personInfo.occupation}
              onChangeText={(text) => setPersonInfo(prev => ({ ...prev, occupation: text }))}
            />
          </View>

          {/* Profile Picture */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Camera size={16} color="#8b5cf6" />
              <Text style={styles.label}>Profile Picture</Text>
            </View>
            <TouchableOpacity 
              style={styles.imagePicker} 
              onPress={pickImage}
              activeOpacity={0.7}
            >
              {profilePreview ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: profilePreview }} 
                    style={styles.imagePreview} 
                  />
                  <View style={styles.imageOverlay}>
                    <Camera size={20} color="white" />
                    <Text style={styles.imageOverlayText}>Change Photo</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Upload size={24} color="#8b5cf6" />
                  <Text style={styles.imagePlaceholderText}>Choose Profile Image</Text>
                  <Text style={styles.imagePlaceholderSubtext}>JPEG, PNG, GIF or WebP • Max 5MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Group Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#10b981' }]}>
              <Users size={20} color="white" />
              
            </View>
            <View style={styles.cardHeaderContent}>
              <Text style={styles.cardTitle}>Group Information</Text>
              <Text style={styles.cardSubtitle}>Select existing group or create new</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.cardActionButton, (!selectedPersonId && !personInfo.profileName.trim()) && styles.cardActionButtonDisabled]}
                onPress={() => setShowGroupModal(true)}
                disabled={!selectedPersonId && !personInfo.profileName.trim()}
              >
                <Plus size={16} color="white" />
                <Text style={styles.cardActionButtonText}>New Group</Text>
              </TouchableOpacity>

              {groupInfo.id && selectedPersonId && (
                <TouchableOpacity
                  style={[styles.cardActionButton, { backgroundColor: '#8b5cf6' }]}
                  onPress={() => setShowPostModal(true)}
                >
                  <MessageSquare size={16} color="white" />
                  <Text style={styles.cardActionButtonText}>New Post</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Group Selection */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Users size={16} color="#10b981" />
              <Text style={styles.label}>Select Group *</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.groupName && styles.inputError]}
                placeholder="Search or select group..."
                placeholderTextColor="#9ca3af"
                value={groupInfo.groupName}
                onChangeText={(text) => {
                  setGroupInfo(prev => ({ ...prev, groupName: text, id: null }));
                  setExistingPosts([]);
                }}
                onFocus={() => {
                  if (groupSuggestions.length > 0) {
                    setShowGroupSuggestions(true);
                  }
                }}
              />
            </View>

            {/* Group Suggestions */}
            {showGroupSuggestions && groupSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={groupSuggestions}
                  renderItem={renderGroupSuggestion}
                  keyExtractor={(item) => item.id}
                  style={styles.suggestionsList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}

            {errors.groupName && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.groupName}</Text>
              </View>
            )}
          </View>

          {/* Group Note */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <FileText size={16} color="#10b981" />
              <Text style={styles.label}>Group Note (Optional)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add notes about this group..."
              placeholderTextColor="#9ca3af"
              value={groupInfo.note}
              onChangeText={(text) => setGroupInfo(prev => ({ ...prev, note: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Existing Posts */}
          {existingPosts.length > 0 && (
            <View style={styles.postsContainer}>
              <View style={styles.postsHeader}>
                <Text style={styles.postsTitle}>Existing Posts</Text>
                <View style={styles.postsCount}>
                  <Text style={styles.postsCountText}>{existingPosts.length}</Text>
                </View>
              </View>
              <FlatList
                data={existingPosts}
                renderItem={({ item }) => (
                  <View style={styles.postItem}>
                    <Text style={styles.postDetails}>{item.post_details}</Text>
                    {item.comments && (
                      <Text style={styles.postComments}>{item.comments}</Text>
                    )}
                    <Text style={styles.postDate}>
                      {new Date(item.created_at).toLocaleString()}
                    </Text>
                  </View>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Save All Data</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Group Modal */}
      <Modal
        visible={showGroupModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Users size={24} color="#10b981" />
                </View>
                <Text style={styles.modalTitle}>Create New Group</Text>
                <TouchableOpacity 
                  style={styles.modalClose}
                  onPress={() => setShowGroupModal(false)}
                >
                  <X size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.modalLabel}>Facebook Group Name *</Text>
                  <TextInput
                    style={[styles.modalInput, errors.groupName && styles.inputError]}
                    placeholder="Enter group name"
                    placeholderTextColor="#9ca3af"
                    value={groupInfo.groupName}
                    onChangeText={(text) => setGroupInfo(prev => ({ ...prev, groupName: text }))}
                  />
                  {errors.groupName && (
                    <Text style={styles.errorText}>{errors.groupName}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.modalLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Add notes..."
                    placeholderTextColor="#9ca3af"
                    value={groupInfo.note}
                    onChangeText={(text) => setGroupInfo(prev => ({ ...prev, note: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setShowGroupModal(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonPrimary, saving && styles.modalButtonDisabled]}
                  onPress={saveGroup}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonPrimaryText}>Save Group</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post Modal */}
      <Modal
        visible={showPostModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIcon, { backgroundColor: '#8b5cf620' }]}>
                  <MessageSquare size={24} color="#8b5cf6" />
                </View>
                <Text style={styles.modalTitle}>Add New Post</Text>
                <TouchableOpacity 
                  style={styles.modalClose}
                  onPress={() => setShowPostModal(false)}
                >
                  <X size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.modalLabel}>Post Details *</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Enter post details..."
                    placeholderTextColor="#9ca3af"
                    value={postInfo.postDetails}
                    onChangeText={(text) => setPostInfo(prev => ({ ...prev, postDetails: text }))}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.modalLabel}>Comments (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Add comments..."
                    placeholderTextColor="#9ca3af"
                    value={postInfo.comments}
                    onChangeText={(text) => setPostInfo(prev => ({ ...prev, comments: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setShowPostModal(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonPrimary, { backgroundColor: '#8b5cf6' }, saving && styles.modalButtonDisabled]}
                  onPress={savePost}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonPrimaryText}>Save Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    paddingTop:  50,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
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
  cardHeader: {
    flexDirection: "column",
    alignItems: 'center',
    justifyContent: "center",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderContent: {
    flexDirection: "column",
    alignItems: 'center',
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 15
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardActionButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowColor: '#9ca3af',
  },
  cardActionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
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
  row: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  inputContainer: {
    position: 'relative',
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
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 1,
  },
  suggestionsContainer: {
    marginTop: 8,
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  placeholderThumb: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  groupThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#dcfce7',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionId: {
    fontSize: 12,
    color: '#6b7280',
  },
  suggestionPhone: {
    fontSize: 12,
    color: '#6b7280',
  },
  suggestionNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  suggestionArrow: {
    opacity: 0.6,
  },
  errorContainer: {
    marginTop: 6,
    paddingLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  imagePicker: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 150,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  postsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  postsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  postsCount: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 24,
    alignItems: 'center',
  },
  postsCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  postItem: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  postDetails: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 6,
  },
  postComments: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 6,
    lineHeight: 18,
  },
  postDate: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#a78bfa',
    shadowColor: '#a78bfa',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fafafa',
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10b98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
    backgroundColor: '#fafafa',
  },
  modalButtonSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  modalButtonSecondaryText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowColor: '#9ca3af',
  },
  modalButtonPrimaryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});