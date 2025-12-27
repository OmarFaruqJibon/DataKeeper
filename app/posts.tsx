// app/posts.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Clock, Edit2, FileText, MessageSquare, Plus, Send, X } from 'lucide-react-native';
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
import { postService } from '../services/api';

interface Post {
  id: string;
  post_details: string;
  comments?: string;
  created_at: string;
}

export default function PostsScreen() {
  const { groupId, personId } = useLocalSearchParams();
  const router = useRouter();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [postDetails, setPostDetails] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    loadPosts();
  }, [groupId, personId]);

  const loadPosts = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        router.replace('/login');
        return;
      }

      const response = await postService.getPosts(
        personId as string,
        groupId as string,
        userId
      );
      if (response.success) {
        setPosts(response.posts);
      }
    } catch (error) {
      console.error('Load posts error:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleAddPost = async () => {
    if (!postDetails.trim()) {
      Alert.alert('Error', 'Please enter post details');
      return;
    }

    setSaving(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        router.replace('/login');
        return;
      }

      const response = await postService.createPost(
        personId as string,
        groupId as string,
        postDetails,
        userId,
        comments || undefined
      );

      if (response.success) {
        Alert.alert('Success', 'Post added successfully');
        setPostDetails('');
        setComments('');
        loadPosts(); // Refresh list
      } else {
        Alert.alert('Error', 'Failed to add post');
      }
    } catch (error) {
      console.error('Add post error:', error);
      Alert.alert('Error', 'Failed to add post');
    } finally {
      setSaving(false);
    }
  };

  const handleClearForm = () => {
    setPostDetails('');
    setComments('');
  };

  const renderPostItem = ({ item, index }: { item: Post; index: number }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postAvatar}>
          <MessageSquare size={16} color="#8b5cf6" />
        </View>
        <View style={styles.postInfo}>
          <Text style={styles.postNumber}>Post #{posts.length - index}</Text>
          <View style={styles.postMeta}>
            <Clock size={12} color="#9ca3af" />
            <Text style={styles.postDate}>
              {new Date(item.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.postDetails}>{item.post_details}</Text>
      
      {item.comments && (
        <View style={styles.commentsContainer}>
          <View style={styles.commentsHeader}>
            <Edit2 size={12} color="#6b7280" />
            <Text style={styles.commentsLabel}>Comments</Text>
          </View>
          <Text style={styles.commentsText}>{item.comments}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading posts...</Text>
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
          <Text style={styles.headerTitle}>Group Posts</Text>
          <Text style={styles.headerSubtitle}>{posts.length} posts in this group</Text>
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
        {/* New Post Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={[styles.formIcon, { backgroundColor: '#8b5cf6' }]}>
              <Plus size={20} color="white" />
            </View>
            <View style={styles.formHeaderContent}>
              <Text style={styles.formTitle}>Create New Post</Text>
              <Text style={styles.formSubtitle}>Share updates in this group</Text>
            </View>
            {(postDetails.trim() || comments.trim()) && (
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
              <MessageSquare size={16} color="#8b5cf6" />
              <Text style={styles.label}>Post Details *</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's on your mind? Share updates..."
              placeholderTextColor="#9ca3af"
              value={postDetails}
              onChangeText={setPostDetails}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Edit2 size={16} color="#8b5cf6" />
              <Text style={styles.label}>Comments (Optional)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any additional comments or notes..."
              placeholderTextColor="#9ca3af"
              value={comments}
              onChangeText={setComments}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleAddPost}
            disabled={saving || !postDetails.trim()}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Send size={18} color="white" />
                <Text style={styles.submitButtonText}>Publish Post</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Posts List */}
        <View style={styles.postsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: '#10b98120' }]}>
                <FileText size={18} color="#10b981" />
              </View>
              <Text style={styles.sectionTitle}>
                All Posts
                
              </Text>
            </View>
            {posts.length > 0 && (
              <TouchableOpacity
                style={[styles.sortButton, { backgroundColor: '#10b98120' }]}
                
                activeOpacity={0.7}
              >
                <Text style={styles.sortButtonText}> {posts.length}</Text>
              </TouchableOpacity>
            )}
          </View>

          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MessageSquare size={48} color="#d1d5db" />
              </View>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>
                Be the first to share something in this group
              </Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPostItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.postsList}
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
    paddingTop:  20,
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
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    padding: 16,
    gap: 8,
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
  postsSection: {
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
  postsCount: {
    color: '#6b7280',
    fontWeight: 'normal',
  },
  sortButton: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: "50%",
    alignItems: "center",
    justifyContent: "center"
  },
  sortButtonText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: '500',
  },
  postsList: {
    gap: 12,
  },
  postCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postInfo: {
    flex: 1,
  },
  postNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postDate: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  postDetails: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 12,
  },
  commentsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  commentsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  commentsText: {
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