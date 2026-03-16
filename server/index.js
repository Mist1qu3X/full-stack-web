const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { nanoid } = require('nanoid');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

const PORT = process.env.PORT || 5000;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';

let users = [];
let products = [];
let refreshTokens = new Set();

const generateAccessToken = (user) => {
    return jwt.sign(
        { 
            sub: user.id, 
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
        },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { sub: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES }
    );
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, JWT_ACCESS_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный или истекший токен' });
        }
        req.user = user;
        next();
    });
};

// Маршруты аутентификации

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name } = req.body;

        // Валидация
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ 
                error: 'Все поля обязательны: email, password, first_name, last_name' 
            });
        }

        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: nanoid(),
            email,
            first_name,
            last_name,
            passwordHash: hashedPassword,
            created_at: new Date().toISOString()
        };

        users.push(newUser);

        const { passwordHash, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        refreshTokens.add(refreshToken);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name
            }
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});


app.post('/api/auth/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        const tokenFromCookie = req.cookies.refreshToken;
        const token = refreshToken || tokenFromCookie;

        if (!token) {
            return res.status(400).json({ error: 'Refresh token обязателен' });
        }

        if (!refreshTokens.has(token)) {
            return res.status(401).json({ error: 'Недействительный refresh token' });
        }

        jwt.verify(token, JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) {
                refreshTokens.delete(token);
                return res.status(401).json({ error: 'Истекший или недействительный refresh token' });
            }

            const user = users.find(u => u.id === decoded.sub);
            if (!user) {
                refreshTokens.delete(token);
                return res.status(401).json({ error: 'Пользователь не найден' });
            }

            refreshTokens.delete(token);

            const newAccessToken = generateAccessToken(user);
            const newRefreshToken = generateRefreshToken(user);
            
            refreshTokens.add(newRefreshToken);

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.json({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });
        });

    } catch (error) {
        console.error('Ошибка обновления токена:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    try {
        const userId = req.user.sub;
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const { passwordHash, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);

    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        refreshTokens.delete(refreshToken);
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Успешный выход' });
});

// маршруты для товаров

app.post('/api/products', authenticateToken, (req, res) => {
    try {
        const { title, category, description, price } = req.body;

        if (!title || !category || !description || !price) {
            return res.status(400).json({ 
                error: 'Все поля обязательны: title, category, description, price' 
            });
        }

        const newProduct = {
            id: nanoid(),
            title,
            category,
            description,
            price: parseFloat(price),
            user_id: req.user.sub,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        products.push(newProduct);
        res.status(201).json(newProduct);

    } catch (error) {
        console.error('Ошибка создания товара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.get('/api/products', authenticateToken, (req, res) => {
    try {
        const userProducts = products.filter(p => p.user_id === req.user.sub);
        res.json(userProducts);
    } catch (error) {
        console.error('Ошибка получения товаров:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.get('/api/products/:id', authenticateToken, (req, res) => {
    try {
        const product = products.find(p => p.id === req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        if (product.user_id !== req.user.sub) {
            return res.status(403).json({ error: 'Нет доступа к этому товару' });
        }

        res.json(product);
    } catch (error) {
        console.error('Ошибка получения товара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.put('/api/products/:id', authenticateToken, (req, res) => {
    try {
        const { title, category, description, price } = req.body;
        const productIndex = products.findIndex(p => p.id === req.params.id);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        if (products[productIndex].user_id !== req.user.sub) {
            return res.status(403).json({ error: 'Нет доступа к этому товару' });
        }

        const updatedProduct = {
            ...products[productIndex],
            title: title || products[productIndex].title,
            category: category || products[productIndex].category,
            description: description || products[productIndex].description,
            price: price ? parseFloat(price) : products[productIndex].price,
            updated_at: new Date().toISOString()
        };

        products[productIndex] = updatedProduct;
        res.json(updatedProduct);

    } catch (error) {
        console.error('Ошибка обновления товара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
    try {
        const productIndex = products.findIndex(p => p.id === req.params.id);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        if (products[productIndex].user_id !== req.user.sub) {
            return res.status(403).json({ error: 'Нет доступа к этому товару' });
        }

        products.splice(productIndex, 1);
        res.json({ message: 'Товар успешно удален' });

    } catch (error) {
        console.error('Ошибка удаления товара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log('Доступные маршруты:');
    console.log('  POST   /api/auth/register    - Регистрация');
    console.log('  POST   /api/auth/login       - Вход');
    console.log('  POST   /api/auth/refresh     - Обновление токенов');
    console.log('  GET    /api/auth/me          - Профиль');
    console.log('  POST   /api/auth/logout       - Выход');
    console.log('  POST   /api/products          - Создание товара');
    console.log('  GET    /api/products          - Список товаров');
    console.log('  GET    /api/products/:id      - Товар по ID');
    console.log('  PUT    /api/products/:id      - Обновление товара');
    console.log('  DELETE /api/products/:id      - Удаление товара');
});