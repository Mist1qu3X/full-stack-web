import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './components/pages/Login';
import Register from './components/pages/Register';
import Products from './components/pages/Products';
import ProductDetail from './components/pages/ProductDetail';
import ProductForm from './components/pages/ProductForm';
import Navbar from './components/Navbar';

import authService from './components/pages/services/auth';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        if (authService.isAuthenticated()) {
            const userData = await authService.getCurrentUser();
            setUser(userData);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await authService.logout();
        setUser(null);
    };

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    return (
        <Router>
            <div className="App">
                <Toaster position="top-right" />
                <Navbar user={user} onLogout={handleLogout} />
                
                <div className="container mt-4">
                    <Routes>
                        <Route 
                            path="/login" 
                            element={user ? <Navigate to="/products" /> : <Login setUser={setUser} />}
                        />
                        <Route 
                            path="/register" 
                            element={user ? <Navigate to="/products" /> : <Register />}
                        />
                        <Route 
                            path="/products" 
                            element={user ? <Products /> : <Navigate to="/login" />}
                        />
                        <Route 
                            path="/products/new" 
                            element={user ? <ProductForm /> : <Navigate to="/login" />}
                        />
                        <Route 
                            path="/products/:id" 
                            element={user ? <ProductDetail /> : <Navigate to="/login" />}
                        />
                        <Route 
                            path="/products/:id/edit" 
                            element={user ? <ProductForm /> : <Navigate to="/login" />}
                        />
                        <Route path="/" element={<Navigate to="/products" />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;