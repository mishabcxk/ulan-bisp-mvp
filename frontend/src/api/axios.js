import axios from 'axios';

const API = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/', // Ensure this matches your Django URL
});

// The Interceptor: This runs automatically before EVERY request
API.interceptors.request.use(
    (config) => {
        // UPDATED: Now it perfectly matches your AuthContext!
        const token = localStorage.getItem('access_token'); 
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default API;