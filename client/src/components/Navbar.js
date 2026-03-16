import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar({ user, onLogout }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await onLogout();
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <Link className="navbar-brand" to="/">
                    Управление товарами
                </Link>
                
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto">
                        {user && (
                            <li className="nav-item">
                                <Link className="nav-link" to="/products">
                                    Товары
                                </Link>
                            </li>
                        )}
                        {user && (
                            <li className="nav-item">
                                <Link className="nav-link" to="/products/new">
                                    Создать товар
                                </Link>
                            </li>
                        )}
                    </ul>
                    
                    <ul className="navbar-nav">
                        {user ? (
                            <>
                                <li className="nav-item">
                                    <span className="nav-link text-light">
                                        {user.first_name} {user.last_name}
                                    </span>
                                </li>
                                <li className="nav-item">
                                    <button
                                        className="btn btn-outline-light btn-sm"
                                        onClick={handleLogout}
                                    >
                                        Выйти
                                    </button>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/login">
                                        Вход
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/register">
                                        Регистрация
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;