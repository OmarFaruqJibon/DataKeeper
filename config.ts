// config.ts
// export const API_BASE_URL = __DEV__
//   ? "http://10.0.2.2/data"
//   : "https://nexovisionai.com/data";


export const API_BASE_URL = "http://192.168.68.134/data";

export const API_ENDPOINTS = {
  LOGIN: '/login.php',
  GET_USER: '/get-user.php',
  PERSONS: '/persons.php',
  GROUPS: '/groups.php',
  PERSON_GROUPS: '/person-groups.php',
  CALLS: '/calls.php',
  POSTS: '/posts.php',
  SAVE_DATA: '/save-data.php',
  UPLOADS: '/uploads/profile_pics/',
  ALL_PERSONS: '/get-all-persons.php',
  STATISISTICS_OVERVIEW: '/statistics-overview.php',
  STATISISTICS_MONTHLY: '/statistics-monthly.php',
  STATISISTICS_DEMOGRAPHICS: '/statistics-demographics.php',
};
