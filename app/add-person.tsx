import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Briefcase, Calendar, Camera, Hash, MapPin, Phone, Plus, Search, Upload, User, Users, X } from 'lucide-react-native';
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

  // Search for groups when group name changes (for existing person)
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

    // Set profile preview if exists
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
  // In the handleSelectGroup function (around line 264-267), update it to:
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      // Create a File object for FormData
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const file = new File([blob], 'profile.jpg', { type: blob.type });
      setProfileImage(file);
      setProfilePreview(result.assets[0].uri);
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
      // If person doesn't exist yet, we need to save person first
      if (!selectedPersonId) {
        if (!personInfo.profileName.trim() || !personInfo.profileId.trim()) {
          throw new Error('Please fill in Profile Name and Profile ID');
        }

        // Create FormData for new person + group
        const formData = new FormData();
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
          formData.append('profile_pic', profileImage as any);
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

  // Render person suggestion item
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
            <User size={20} color="#666" />
          </View>
        )}
        <View style={styles.suggestionText}>
          <Text style={styles.suggestionName}>{item.profile_name}</Text>
          <Text style={styles.suggestionId}>ID: {item.profile_id}</Text>
          {item.phone_number && (
            <Text style={styles.suggestionPhone}>{item.phone_number}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render group suggestion item
  // In the renderGroupSuggestion function (around line 460-490), update it to:
  const renderGroupSuggestion = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectGroup(item)}
    >
      <View style={styles.suggestionContent}>
        <View style={[styles.groupThumb, { backgroundColor: '#10b981' }]}>
          <Users size={20} color="white" />
        </View>
        <View style={styles.suggestionText}>
          <Text style={styles.suggestionName}>{item.group_name}</Text>
          {item.note && (
            <Text style={styles.suggestionNote}>{item.note}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // And in the FlatList for group suggestions (around line 530-540):
  <FlatList
    data={groupSuggestions}
    renderItem={renderGroupSuggestion}
    keyExtractor={(item) => item.id}
    style={styles.suggestionsList}
    nestedScrollEnabled
  />

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add New Person</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Person Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#3b82f6' }]}>
              <User size={24} color="white" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Person Information</Text>
              <Text style={styles.sectionSubtitle}>Enter or search for Facebook profile</Text>
            </View>
          </View>

          {/* Profile Name with Suggestions */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Search size={16} color="#4b5563" /> Profile Name *
            </Text>
            <View>
              <TextInput
                style={[styles.input, errors.profileName && styles.inputError]}
                placeholder="Search Facebook profile..."
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
                  <X size={20} color="#9ca3af" />
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
                />
              </View>
            )}

            {errors.profileName && (
              <Text style={styles.errorText}>{errors.profileName}</Text>
            )}
          </View>

          {/* Profile ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Hash size={16} color="#4b5563" /> Profile ID *
            </Text>
            <TextInput
              style={[styles.input, errors.profileId && styles.inputError]}
              placeholder="Enter profile ID"
              value={personInfo.profileId}
              onChangeText={(text) => setPersonInfo(prev => ({ ...prev, profileId: text }))}
              editable={!selectedPersonId} // Disable if person is selected from suggestions
            />
            {errors.profileId && (
              <Text style={styles.errorText}>{errors.profileId}</Text>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Phone size={16} color="#4b5563" /> Phone Number
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={personInfo.phoneNumber}
              onChangeText={(text) => setPersonInfo(prev => ({ ...prev, phoneNumber: text }))}
              keyboardType="phone-pad"
            />
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <MapPin size={16} color="#4b5563" /> Address
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter address"
              value={personInfo.address}
              onChangeText={(text) => setPersonInfo(prev => ({ ...prev, address: text }))}
            />
          </View>

          {/* Occupation */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Briefcase size={16} color="#4b5563" /> Occupation
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter occupation"
              value={personInfo.occupation}
              onChangeText={(text) => setPersonInfo(prev => ({ ...prev, occupation: text }))}
            />
          </View>

          {/* Age */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Calendar size={16} color="#4b5563" /> Age
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter age"
              value={personInfo.age}
              onChangeText={(text) => setPersonInfo(prev => ({ ...prev, age: text }))}
              keyboardType="number-pad"
            />
          </View>

          {/* Profile Picture */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Camera size={16} color="#4b5563" /> Profile Picture
            </Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {profilePreview ? (
                <Image source={{ uri: profilePreview }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Upload size={24} color="#9ca3af" />
                  <Text style={styles.imagePlaceholderText}>Choose Image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Group Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>

            <View style={[styles.iconContainer, { backgroundColor: '#10b981' }]}>
              <Users size={24} color="white" />
            </View>

            <View>
              <Text style={styles.sectionTitle}>Group Information</Text>
            </View>

            <View style={styles.sectionActions}>
              <TouchableOpacity
                style={[styles.actionButton, (!selectedPersonId && !personInfo.profileName.trim()) && styles.actionButtonDisabled]}
                onPress={() => setShowGroupModal(true)}
                disabled={!selectedPersonId && !personInfo.profileName.trim()}
              >
                <Plus size={18} color="white" />
                <Text style={styles.actionButtonText}>New Group</Text>
              </TouchableOpacity>

              {groupInfo.id && selectedPersonId && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
                  onPress={() => setShowPostModal(true)}
                >
                  <Plus size={18} color="white" />
                  <Text style={styles.actionButtonText}>New Post</Text>
                </TouchableOpacity>
              )}
            </View>
            
          </View>

          {/* Group Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Group</Text>
            <View>
              <TextInput
                style={[styles.input, errors.groupName && styles.inputError]}
                placeholder="Search or select group..."
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

              {/* Group Suggestions */}
              {showGroupSuggestions && groupSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={groupSuggestions}
                    renderItem={renderGroupSuggestion}
                    keyExtractor={(item) => item.id}
                    style={styles.suggestionsList}
                    nestedScrollEnabled
                  />
                </View>
              )}
            </View>

            {errors.groupName && (
              <Text style={styles.errorText}>{errors.groupName}</Text>
            )}
          </View>

          {/* Group Note */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Group Note (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add notes about this group..."
              value={groupInfo.note}
              onChangeText={(text) => setGroupInfo(prev => ({ ...prev, note: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Existing Posts */}
          {existingPosts.length > 0 && (
            <View style={styles.postsContainer}>
              <Text style={styles.postsTitle}>
                Existing Posts ({existingPosts.length})
              </Text>
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
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Save All Data</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Group Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Group</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Facebook Group Name *</Text>
                <TextInput
                  style={[styles.input, errors.groupName && styles.inputError]}
                  placeholder="Enter group name"
                  value={groupInfo.groupName}
                  onChangeText={(text) => setGroupInfo(prev => ({ ...prev, groupName: text }))}
                />
                {errors.groupName && (
                  <Text style={styles.errorText}>{errors.groupName}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add notes..."
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
      </Modal>

      {/* Post Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Post</Text>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Post Details *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter post details..."
                  value={postInfo.postDetails}
                  onChangeText={(text) => setPostInfo(prev => ({ ...prev, postDetails: text }))}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Comments (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add comments..."
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
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  backButton: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  sectionActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  clearButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  suggestionsContainer: {
    marginTop: 8,
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  placeholderThumb: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  suggestionId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  suggestionPhone: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  suggestionNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: '#6b7280',
    fontSize: 14,
  },
  postsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  postsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  postItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  postDetails: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  postComments: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  postDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  modalButtonSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  modalButtonSecondaryText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  modalButtonPrimaryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});