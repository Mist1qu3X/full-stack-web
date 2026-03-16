import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import productService from './services/products';

function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await productService.getAllProducts();
            setProducts(data);
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
            try {
                await productService.deleteProduct(id);
                setProducts(products.filter(p => p.id !== id));
            } catch (error) {
                console.error('Ошибка удаления:', error);
            }
        }
    };

    const filteredProducts = products.filter(product =>
        product.title.toLowerCase().includes(filter.toLowerCase()) ||
        product.category.toLowerCase().includes(filter.toLowerCase())
    );

    if (loading) {
        return <div className="text-center">Загрузка...</div>;
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Мои товары</h1>
                <Link to="/products/new" className="btn btn-primary">
                    + Создать товар
                </Link>
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Поиск по названию или категории..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            {filteredProducts.length === 0 ? (
                <div className="text-center py-5">
                    <p className="text-muted">Товары не найдены</p>
                    {products.length === 0 && (
                        <Link to="/products/new" className="btn btn-outline-primary">
                            Создать первый товар
                        </Link>
                    )}
                </div>
            ) : (
                <div className="row">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="col-md-4 mb-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">{product.title}</h5>
                                    <h6 className="card-subtitle mb-2 text-muted">
                                        {product.category}
                                    </h6>
                                    <p className="card-text">
                                        {product.description.substring(0, 100)}...
                                    </p>
                                    <p className="card-text">
                                        <strong>Цена: {product.price} ₽</strong>
                                    </p>
                                </div>
                                <div className="card-footer bg-transparent">
                                    <div className="btn-group w-100">
                                        <Link
                                            to={`/products/${product.id}`}
                                            className="btn btn-sm btn-outline-primary"
                                        >
                                            Просмотр
                                        </Link>
                                        <Link
                                            to={`/products/${product.id}/edit`}
                                            className="btn btn-sm btn-outline-secondary"
                                        >
                                            Редактировать
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="btn btn-sm btn-outline-danger"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Products;