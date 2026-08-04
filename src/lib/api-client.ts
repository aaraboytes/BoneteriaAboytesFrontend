import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiClient = axios.create({
    baseURL: apiUrl ? (apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`) : '',
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    let token = null;
    try {
        token = localStorage.getItem('custom-auth-token');
    } catch (error) {
        console.error('Failed to load token from localStorage', error);
    }
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('Auth/login')) {
            try {
                localStorage.removeItem('custom-auth-token');
            } catch (err) {
                console.error('Failed to remove token from localStorage', err);
            }
            if (typeof window !== 'undefined') {
                window.location.href = '/auth/sign-in';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
