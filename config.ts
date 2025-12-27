// config.ts
const API_BASE_URL = "http://10.0.2.2/data";

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/login.php`,
  GET_USER: `${API_BASE_URL}/get-user.php`,
  PERSONS: `${API_BASE_URL}/persons.php`,
  GROUPS: `${API_BASE_URL}/groups.php`,
  PERSON_GROUPS: `${API_BASE_URL}/person-groups.php`,
  CALLS: `${API_BASE_URL}/calls.php`,
  POSTS: `${API_BASE_URL}/posts.php`,
  SAVE_DATA: `${API_BASE_URL}/save-data.php`,
  UPLOADS: `${API_BASE_URL}/uploads/profile_pics/`,
  ALL_PERSONS: `${API_BASE_URL}/get-all-persons.php`,
  STATISISTICS_OVERVIEW: `${API_BASE_URL}/statistics-overview.php`,
  STATISISTICS_MONTHLY: `${API_BASE_URL}/statistics-monthly.php`,
  STATISISTICS_DEMOGRAPHICS: `${API_BASE_URL}/statistics-demographics.php`,

};

export default API_ENDPOINTS;