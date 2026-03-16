import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from './services/auth';

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: ''
    });
    const [loading, setLoading] = useState(false);

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
            await authService.register(formData);
            navigate('/login');
        } catch (error) {
            console.error('Ошибка регистрации:', error);
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
                        
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="email" className="form-label">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="first_name" className="form-label">
                                    Имя
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="last_name" className="form-label">
                                    Фамилия
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="password" className="form-label">
                                    Пароль
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength="6"
                                />
                                <div className="form-text">
                                    Минимум 6 символов
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary w-100"
                                disabled={loading}
                            >
                                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                            </button>
                        </form>

                        <div className="text-center mt-3">
                            <Link to="/login">Уже есть аккаунт? Войти</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;