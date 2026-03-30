import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('Нет refresh токена');
                
                const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
                const { accessToken, refreshToken: newRefreshToken } = response.data;
                
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userRole');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);



function Navbar({ user, onLogout }) {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole') || 'guest';

    const handleLogout = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                await api.post('/auth/logout', { refreshToken });
            } catch (error) {
                console.error('Ошибка выхода:', error);
            }
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        onLogout();
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <a className="navbar-brand" href="/">Управление товарами</a>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto">
                        {user && (
                            <>
                                <li className="nav-item">
                                    <a className="nav-link" href="/products">Товары</a>
                                </li>
                                {(userRole === 'seller' || userRole === 'admin') && (
                                    <li className="nav-item">
                                        <a className="nav-link" href="/products/new">Создать товар</a>
                                    </li>
                                )}
                                {userRole === 'admin' && (
                                    <li className="nav-item">
                                        <a className="nav-link" href="/users">Пользователи</a>
                                    </li>
                                )}
                            </>
                        )}
                    </ul>
                    <ul className="navbar-nav">
                        {user ? (
                            <>
                                <li className="nav-item">
                                    <span className="nav-link text-light">
                                        <span className={`badge bg-${userRole === 'admin' ? 'danger' : userRole === 'seller' ? 'warning' : 'info'}`}>
                                            {userRole === 'admin' ? 'Админ' : userRole === 'seller' ? 'Продавец' : 'Пользователь'}
                                        </span>
                                        {' '}{user.first_name} {user.last_name}
                                    </span>
                                </li>
                                <li className="nav-item">
                                    <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Выйти</button>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className="nav-item"><a className="nav-link" href="/login">Вход</a></li>
                                <li className="nav-item"><a className="nav-link" href="/register">Регистрация</a></li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}


function Login({ setUser }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const response = await api.post('/auth/login', formData);
            
            if (response.data.accessToken) {
                localStorage.setItem('accessToken', response.data.accessToken);
            }
            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }
            if (response.data.user && response.data.user.role) {
                localStorage.setItem('userRole', response.data.user.role);
            }
            
            setUser(response.data.user);
            navigate('/products');
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка входа';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-6 col-lg-4">
                <div className="card">
                    <div className="card-body">
                        <h2 className="text-center mb-4">Вход в систему</h2>
                        {error && <div className="alert alert-danger">{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" name="email" value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Пароль</label>
                                <input type="password" className="form-control" name="password" value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                            </div>
                            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                                {loading ? 'Вход...' : 'Войти'}
                            </button>
                        </form>
                        <div className="text-center mt-3">
                            <a href="/register">Нет аккаунта? Зарегистрироваться</a>
                        </div>
                        <hr />
                        <div className="text-center">
                            <small className="text-muted">
                                Тестовые аккаунты:<br/>
                                Admin: admin@example.com / admin123<br/>
                                Seller: seller@example.com / seller123<br/>
                                User: user@example.com / user123
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '', first_name: '', last_name: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            await api.post('/auth/register', formData);
            alert('Регистрация успешна! Теперь можно войти.');
            navigate('/login');
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка регистрации';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-6 col-lg-4">
                <div className="card">
                    <div className="card-body">
                        <h2 className="text-center mb-4">Регистрация</h2>
                        {error && <div className="alert alert-danger">{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" name="email" value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Имя</label>
                                <input type="text" className="form-control" name="first_name" value={formData.first_name}
                                    onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Фамилия</label>
                                <input type="text" className="form-control" name="last_name" value={formData.last_name}
                                    onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Пароль</label>
                                <input type="password" className="form-control" name="password" value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})} required minLength="6" />
                                <div className="form-text">Минимум 6 символов</div>
                            </div>
                            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                            </button>
                        </form>
                        <div className="text-center mt-3">
                            <a href="/login">Уже есть аккаунт? Войти</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const userRole = localStorage.getItem('userRole') || 'guest';
    const isAdmin = userRole === 'admin';
    const isSeller = userRole === 'seller';
    const navigate = useNavigate();

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/products');
            setProducts(response.data);
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Удалить товар?')) {
            try {
                await api.delete(`/products/${id}`);
                loadProducts();
                alert('Товар удален');
            } catch (error) {
                alert('Ошибка удаления');
            }
        }
    };

    const filteredProducts = products.filter(p =>
        p.title?.toLowerCase().includes(filter.toLowerCase()) ||
        p.category?.toLowerCase().includes(filter.toLowerCase())
    );

    if (loading) return <div className="text-center mt-5">Загрузка товаров...</div>;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Каталог товаров</h1>
                {(isSeller || isAdmin) && (
                    <a href="/products/new" className="btn btn-primary">+ Создать товар</a>
                )}
            </div>
            <div className="mb-4">
                <input type="text" className="form-control" placeholder="Поиск по названию или категории..." 
                    value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            {filteredProducts.length === 0 ? (
                <div className="text-center py-5"><p>Товары не найдены</p></div>
            ) : (
                <div className="row">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="col-md-4 mb-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">{product.title}</h5>
                                    <h6 className="text-muted">{product.category}</h6>
                                    <p className="card-text">{product.description?.substring(0, 100)}...</p>
                                    <p><strong>{product.price} ₽</strong></p>
                                </div>
                                <div className="card-footer">
                                    <div className="btn-group w-100">
                                        <a href={`/products/${product.id}`} className="btn btn-sm btn-outline-primary">Просмотр</a>
                                        {(isSeller || isAdmin) && (
                                            <a href={`/products/${product.id}/edit`} className="btn btn-sm btn-outline-secondary">Редактировать</a>
                                        )}
                                        {isAdmin && (
                                            <button onClick={() => handleDelete(product.id)} className="btn btn-sm btn-outline-danger">Удалить</button>
                                        )}
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


function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');
    const isAdmin = userRole === 'admin';
    const isSeller = userRole === 'seller';

    useEffect(() => {
        if (id) loadProduct();
    }, [id]);

    const loadProduct = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/products/${id}`);
            setProduct(response.data);
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            alert('Товар не найден');
            navigate('/products');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Удалить товар?')) {
            try {
                await api.delete(`/products/${id}`);
                alert('Товар удален');
                navigate('/products');
            } catch (error) {
                alert('Ошибка удаления');
            }
        }
    };

    if (loading) return <div className="text-center mt-5">Загрузка товара...</div>;
    if (!product) return <div className="text-center mt-5">Товар не найден</div>;

    return (
        <div className="row justify-content-center">
            <div className="col-md-8">
                <div className="card">
                    <div className="card-body">
                        <h1>{product.title}</h1>
                        <p><strong>Категория:</strong> {product.category}</p>
                        <p><strong>Цена:</strong> {product.price} ₽</p>
                        <p><strong>Описание:</strong></p>
                        <p>{product.description}</p>
                        <div className="d-flex gap-2">
                            {(isSeller || isAdmin) && (
                                <a href={`/products/${id}/edit`} className="btn btn-primary">Редактировать</a>
                            )}
                            {isAdmin && (
                                <button onClick={handleDelete} className="btn btn-danger">Удалить</button>
                            )}
                            <a href="/products" className="btn btn-secondary">Назад</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



function ProductForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;
    const [formData, setFormData] = useState({ title: '', category: '', description: '', price: '' });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditing);

    useEffect(() => {
        if (isEditing) loadProduct();
    }, [id]);

    const loadProduct = async () => {
        try {
            const response = await api.get(`/products/${id}`);
            setFormData(response.data);
        } catch (error) {
            alert('Ошибка загрузки товара');
            navigate('/products');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                await api.put(`/products/${id}`, formData);
                alert('Товар обновлен');
            } else {
                await api.post('/products', formData);
                alert('Товар создан');
            }
            navigate('/products');
        } catch (error) {
            alert('Ошибка сохранения');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return <div className="text-center mt-5">Загрузка...</div>;

    return (
        <div className="row justify-content-center">
            <div className="col-md-8">
                <div className="card">
                    <div className="card-body">
                        <h2>{isEditing ? 'Редактирование' : 'Создание'} товара</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Название *</label>
                                <input type="text" className="form-control" value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Категория *</label>
                                <input type="text" className="form-control" value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Цена *</label>
                                <input type="number" className="form-control" value={formData.price}
                                    onChange={(e) => setFormData({...formData, price: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Описание *</label>
                                <textarea className="form-control" rows="5" value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})} required />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Создать')}
                            </button>
                            <button type="button" className="btn btn-secondary ms-2" onClick={() => navigate('/products')}>Отмена</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}



function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            alert('Ошибка загрузки пользователей');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleBlockUnblock = async (id, currentStatus) => {
        const action = currentStatus ? 'разблокировать' : 'заблокировать';
        if (window.confirm(`Вы уверены, что хотите ${action} пользователя?`)) {
            try {
                if (!currentStatus) {
                    await api.delete(`/users/${id}`);
                } else {
                    await api.put(`/users/${id}`, { isBlocked: false });
                }
                loadUsers();
                alert(`Пользователь ${action}н`);
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка при выполнении операции');
            }
        }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await api.put(`/users/${id}`, { role: newRole });
            loadUsers();
            alert('Роль изменена');
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка при изменении роли');
        }
    };

    const getRoleBadgeColor = (role) => {
        switch(role) {
            case 'admin': return 'danger';
            case 'seller': return 'warning';
            default: return 'info';
        }
    };

    const getRoleName = (role) => {
        switch(role) {
            case 'admin': return 'Администратор';
            case 'seller': return 'Продавец';
            default: return 'Пользователь';
        }
    };

    if (loading) return <div className="text-center mt-5">Загрузка пользователей...</div>;

    return (
        <div>
            <h1 className="mb-4">Управление пользователями</h1>
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>Email</th>
                            <th>Имя</th>
                            <th>Фамилия</th>
                            <th>Роль</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className={user.isBlocked ? 'table-danger' : ''}>
                                <td>{user.email}</td>
                                <td>{user.first_name}</td>
                                <td>{user.last_name}</td>
                                <td>
                                    <select 
                                        className={`form-select form-select-sm bg-${getRoleBadgeColor(user.role)} text-white`}
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        style={{ width: '130px' }}
                                    >
                                        <option value="user">Пользователь</option>
                                        <option value="seller">Продавец</option>
                                        <option value="admin">Администратор</option>
                                    </select>
                                </td>
                                <td>
                                    <span className={`badge bg-${user.isBlocked ? 'danger' : 'success'}`}>
                                        {user.isBlocked ? 'Заблокирован' : 'Активен'}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleBlockUnblock(user.id, user.isBlocked)}
                                        className={`btn btn-sm ${user.isBlocked ? 'btn-success' : 'btn-danger'}`}
                                    >
                                        {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const response = await api.get('/auth/me');
                    setUser(response.data);
                    localStorage.setItem('userRole', response.data.role);
                } catch (error) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('userRole');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    if (loading) return <div className="text-center mt-5">Загрузка приложения...</div>;

    return (
        <Router>
            <div>
                <Navbar user={user} onLogout={() => setUser(null)} />
                <div className="container mt-4">
                    <Routes>
                        <Route path="/login" element={user ? <Navigate to="/products" /> : <Login setUser={setUser} />} />
                        <Route path="/register" element={user ? <Navigate to="/products" /> : <Register />} />
                        <Route path="/products" element={user ? <Products /> : <Navigate to="/login" />} />
                        <Route path="/products/:id" element={user ? <ProductDetail /> : <Navigate to="/login" />} />
                        <Route path="/products/new" element={user ? <ProductForm /> : <Navigate to="/login" />} />
                        <Route path="/products/:id/edit" element={user ? <ProductForm /> : <Navigate to="/login" />} />
                        <Route path="/users" element={user && localStorage.getItem('userRole') === 'admin' ? <Users /> : <Navigate to="/products" />} />
                        <Route path="/" element={<Navigate to="/products" />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;