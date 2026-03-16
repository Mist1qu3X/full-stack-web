import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import productService from './services/products';

function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProduct();
    }, [id]);

    const loadProduct = async () => {
        try {
            const data = await productService.getProductById(id);
            setProduct(data);
        } catch (error) {
            console.error('Ошибка загрузки товара:', error);
            navigate('/products');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
            try {
                await productService.deleteProduct(id);
                navigate('/products');
            } catch (error) {
                console.error('Ошибка удаления:', error);
            }
        }
    };

    if (loading) {
        return <div className="text-center">Загрузка...</div>;
    }

    if (!product) {
        return <div className="text-center">Товар не найден</div>;
    }

    return (
        <div className="row justify-content-center">
            <div className="col-md-8">
                <div className="card">
                    <div className="card-body">
                        <h1 className="card-title mb-4">{product.title}</h1>
                        
                        <div className="mb-3">
                            <strong>Категория:</strong> {product.category}
                        </div>
                        
                        <div className="mb-3">
                            <strong>Цена:</strong> {product.price} ₽
                        </div>
                        
                        <div className="mb-4">
                            <strong>Описание:</strong>
                            <p className="mt-2">{product.description}</p>
                        </div>

                        <div className="mb-3 text-muted small">
                            <div>Создан: {new Date(product.created_at).toLocaleString()}</div>
                            <div>Обновлен: {new Date(product.updated_at).toLocaleString()}</div>
                        </div>

                        <div className="d-flex gap-2">
                            <Link
                                to={`/products/${id}/edit`}
                                className="btn btn-primary"
                            >
                                Редактировать
                            </Link>
                            <button
                                onClick={handleDelete}
                                className="btn btn-danger"
                            >
                                Удалить
                            </button>
                            <Link
                                to="/products"
                                className="btn btn-secondary"
                            >
                                Назад к списку
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductDetail;