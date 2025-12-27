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
    }
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
        <Text style={styles.sectionTitle}>Add New Post</Text>
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Post Details *"
          value={postDetails}
          onChangeText={setPostDetails}
          multiline
          numberOfLines={4}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Comments (Optional)"
          value={comments}
          onChangeText={setComments}
          multiline
          numberOfLines={3}
        />
        
        <TouchableOpacity
          style={[styles.addButton, saving && styles.buttonDisabled]}
          onPress={handleAddPost}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.addButtonText}>Add Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Posts ({posts.length})</Text>
        
        {posts.map((post) => (
          <View key={post.id} style={styles.postItem}>
            <Text style={styles.postDetails}>{post.post_details}</Text>
            {post.comments && (
              <Text style={styles.comments}>Comments: {post.comments}</Text>
            )}
            <Text style={styles.postDate}>
              {new Date(post.created_at).toLocaleString()}
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
    height: 120,
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
  postItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postDetails: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  comments: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
  },
});