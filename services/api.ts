// services/api.ts
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  async (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (phone: string, password: string) => {
    const response = await api.post(API_ENDPOINTS.LOGIN, { phone, password });
    return response.data;
  },
  getUser: async (userId: string) => {
    const response = await api.get(API_ENDPOINTS.GET_USER, {
      params: { userId },
    });
    return response.data;
  },
};

export const personService = {
  search: async (query: string, userId: string) => {
    const response = await api.get(API_ENDPOINTS.PERSONS, {
      params: { q: query, userId },
    });
    return response.data;
  },
  getAllPersons: async (userId: string) => {
    const response = await api.get(API_ENDPOINTS.ALL_PERSONS, {
      params: { userId },
    });
    return response.data;
  },
  getGroups: async (personId: string, userId: string) => {
    const response = await api.get(API_ENDPOINTS.PERSON_GROUPS, {
      params: { personId, userId },
    });
    return response.data;
  },
  getById: async (personId: string, userId: string) => {
    const response = await api.get(API_ENDPOINTS.PERSONS, {
      params: { q: '', userId },
    });
    if (response.data.success) {
      const person = response.data.persons.find((p: any) => p.id.toString() === personId);
      return person || null;
    }
    return null;
  },
};

export const groupService = {
  getGroups: async (userId: string) => {
    const response = await api.get(API_ENDPOINTS.GROUPS, {
      params: { userId },
    });
    return response.data;
  },
  createGroup: async (personId: string, groupName: string, userId: string, note?: string) => {
    const response = await api.post(API_ENDPOINTS.GROUPS, {
      personId,
      groupName,
      userId,
      note,
    });
    return response.data;
  },
  getPosts: async (personId: string, groupId: string, userId: string) => {
    const response = await api.get(API_ENDPOINTS.POSTS, {
      params: { personId, groupId, userId },
    });
    return response.data;
  },
};

export const callService = {
  getCalls: async (personId: string, userId: string) => {
    const response = await api.get(API_ENDPOINTS.CALLS, {
      params: { personId, userId },
    });
    return response.data;
  },
  createCall: async (personId: string, userId: string, callMessage: string, note?: string) => {
    const response = await api.post(API_ENDPOINTS.CALLS, {
      personId,
      userId,
      callMessage,
      note,
    });
    return response.data;
  },
};

export const postService = {
  getPosts: async (personId: string, groupId: string, userId: string) => {
    const response = await api.get(API_ENDPOINTS.POSTS, {
      params: { personId, groupId, userId },
    });
    return response.data;
  },
  createPost: async (personId: string, groupId: string, postDetails: string, userId: string, comments?: string) => {
    const response = await api.post(API_ENDPOINTS.POSTS, {
      personId,
      groupId,
      postDetails,
      comments,
      userId,
    });
    return response.data;
  },
};

export const dataService = {
  saveData: async (formData: FormData) => {
    const response = await api.post(API_ENDPOINTS.SAVE_DATA, formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
      }
    );
    return response.data;
  },
};


export const statisticsService = {
  getOverview: async (userId: string) => {
    const response = await api.get(API_ENDPOINTS.STATISISTICS_OVERVIEW, {
      params: { userId },
    });
    return response.data;
  },

  getMonthlyData: async (userId: string, period: string) => {
    const response = await api.get(API_ENDPOINTS.STATISISTICS_MONTHLY, {
      params: { userId, period },
    });
    return response.data;
  },

  getDemographics: async (userId: string) => {
    const response = await api.get(API_ENDPOINTS.STATISISTICS_DEMOGRAPHICS, {
      params: { userId },
    });
    return response.data;
  },
};

export default api;