import api from './api';
import toast from 'react-hot-toast';

class ProductService {
    async getAllProducts() {
        try {
            const response = await api.get('/products');
            return response.data;
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка загрузки товаров';
            toast.error(message);
            throw error;
        }
    }

    async getProductById(id) {
        try {
            const response = await api.get(`/products/${id}`);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка загрузки товара';
            toast.error(message);
            throw error;
        }
    }

    async createProduct(productData) {
        try {
            const response = await api.post('/products', productData);
            toast.success('Товар создан успешно!');
            return response.data;
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка создания товара';
            toast.error(message);
            throw error;
        }
    }

    async updateProduct(id, productData) {
        try {
            const response = await api.put(`/products/${id}`, productData);
            toast.success('Товар обновлен успешно!');
            return response.data;
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка обновления товара';
            toast.error(message);
            throw error;
        }
    }

    async deleteProduct(id) {
        try {
            await api.delete(`/products/${id}`);
            toast.success('Товар удален успешно!');
            return true;
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка удаления товара';
            toast.error(message);
            throw error;
        }
    }
}

export default new ProductService();