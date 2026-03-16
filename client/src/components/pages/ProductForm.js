import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import productService from './services/products';

function ProductForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        price: ''
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditing);

    useEffect(() => {
        if (isEditing) {
            loadProduct();
        }
    }, [isEditing, id]);

    const loadProduct = async () => {
        try {
            const product = await productService.getProductById(id);
            setFormData({
                title: product.title || '',
                category: product.category || '',
                description: product.description || '',
                price: product.price || ''
            });
        } catch (error) {
            console.error('Ошибка загрузки товара:', error);
            navigate('/products');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditing) {
                await productService.updateProduct(id, formData);
            } else {
                await productService.createProduct(formData);
            }
            navigate('/products');
        } catch (error) {
            console.error('Ошибка сохранения товара:', error);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return <div className="text-center">Загрузка...</div>;
    }

    return (
        <div className="row justify-content-center">
            <div className="col-md-8">
                <div className="card">
                    <div className="card-body">
                        <h2 className="text-center mb-4">
                            {isEditing ? 'Редактирование товара' : 'Создание товара'}
                        </h2>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="title" className="form-label">
                                    Название *
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="category" className="form-label">
                                    Категория *
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="price" className="form-label">
                                    Цена *
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="price"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">
                                    Описание *
                                </label>
                                <textarea
                                    className="form-control"
                                    id="description"
                                    name="description"
                                    rows="5"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Создать')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => navigate('/products')}
                                >
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductForm;