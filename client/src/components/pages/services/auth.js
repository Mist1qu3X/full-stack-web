import api from './api';
import toast from 'react-hot-toast';

class AuthService {
    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);
            toast.success('Регистрация успешна! Теперь можно войти.');
            return response.data;
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка регистрации';
            toast.error(message);
            throw error;
        }
    }

    async login(credentials) {
        try {
            const response = await api.post('/auth/login', credentials);
            
            if (response.data.accessToken) {
                localStorage.setItem('accessToken', response.data.accessToken);
            }
            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }
            
            toast.success('Вход выполнен успешно!');
            return response.data;
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка входа';
            toast.error(message);
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            return null;
        }
    }

    async logout() {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await api.post('/auth/logout', { refreshToken });
            }
        } catch (error) {
            console.error('Ошибка выхода:', error);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            toast.success('Выход выполнен');
        }
    }

    isAuthenticated() {
        return !!localStorage.getItem('accessToken');
    }
}

export default new AuthService();