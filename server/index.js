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
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_secret_12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_12345';
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '1h';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';

const ROLES = {
    USER: 'user',
    SELLER: 'seller',
    ADMIN: 'admin'
};


let users = [];
let products = [];
let refreshTokens = new Set();

const generateAccessToken = (user) => {
    return jwt.sign(
        { 
            sub: user.id, 
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { sub: user.id, role: user.role },
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

const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Не авторизован' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Доступ запрещен. Требуется роль: ${allowedRoles.join(' или ')}`,
                userRole: req.user.role
            });
        }
        
        next();
    };
};


async function initializeTestData() {
    if (users.length === 0) {
        console.log('Создание тестовых пользователей...');
        
        const adminHash = await bcrypt.hash('admin123', 10);
        const sellerHash = await bcrypt.hash('seller123', 10);
        const userHash = await bcrypt.hash('user123', 10);
        

        users.push({
            id: nanoid(),
            email: 'admin@example.com',
            first_name: 'Admin',
            last_name: 'System',
            passwordHash: adminHash,
            role: ROLES.ADMIN,
            isBlocked: false,
            created_at: new Date().toISOString()
        });
        
        users.push({
            id: nanoid(),
            email: 'seller@example.com',
            first_name: 'Test',
            last_name: 'Seller',
            passwordHash: sellerHash,
            role: ROLES.SELLER,
            isBlocked: false,
            created_at: new Date().toISOString()
        });

        users.push({
            id: nanoid(),
            email: 'user@example.com',
            first_name: 'Regular',
            last_name: 'User',
            passwordHash: userHash,
            role: ROLES.USER,
            isBlocked: false,
            created_at: new Date().toISOString()
        });
        
        console.log('Тестовые пользователи созданы:');
        console.log('Админ: admin@example.com / admin123');
        console.log('Продавец: seller@example.com / seller123');
        console.log('Пользователь: user@example.com / user123');
        
        products.push({
            id: nanoid(),
            title: 'Тестовый товар 1',
            category: 'Тест',
            description: 'Это тестовый товар для демонстрации',
            price: 1000,
            user_id: users[0].id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        
        products.push({
            id: nanoid(),
            title: 'Тестовый товар 2',
            category: 'Тест',
            description: 'Еще один тестовый товар',
            price: 2000,
            user_id: users[1].id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
}


app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name } = req.body;

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
            role: ROLES.USER,
            isBlocked: false,
            created_at: new Date().toISOString()
        };

        users.push(newUser);

        const { passwordHash, ...userWithoutPassword } = newUser;
        console.log('Новый пользователь зарегистрирован:', email);
        res.status(201).json(userWithoutPassword);

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Попытка входа:', email);

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            console.log('Пользователь не найден:', email);
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ error: 'Ваш аккаунт заблокирован' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            console.log('Неверный пароль для:', email);
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        console.log('Успешный вход:', email, 'Роль:', user.role);

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
                last_name: user.last_name,
                role: user.role
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

            if (user.isBlocked) {
                refreshTokens.delete(token);
                return res.status(403).json({ error: 'Аккаунт заблокирован' });
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



app.get('/api/users', authenticateToken, roleMiddleware([ROLES.ADMIN]), (req, res) => {
    try {
        const usersList = users.map(({ passwordHash, ...user }) => user);
        res.json(usersList);
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});


app.get('/api/users/:id', authenticateToken, roleMiddleware([ROLES.ADMIN]), (req, res) => {
    try {
        const user = users.find(u => u.id === req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const { passwordHash, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});


app.put('/api/users/:id', authenticateToken, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
    try {
        const { first_name, last_name, role, isBlocked } = req.body;
        const userIndex = users.findIndex(u => u.id === req.params.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (first_name) users[userIndex].first_name = first_name;
        if (last_name) users[userIndex].last_name = last_name;
        if (role && ['user', 'seller', 'admin'].includes(role)) {
            users[userIndex].role = role;
        }
        if (typeof isBlocked === 'boolean') {
            users[userIndex].isBlocked = isBlocked;
        }
        
        users[userIndex].updated_at = new Date().toISOString();

        const { passwordHash, ...userWithoutPassword } = users[userIndex];
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});


app.delete('/api/users/:id', authenticateToken, roleMiddleware([ROLES.ADMIN]), (req, res) => {
    try {
        const userIndex = users.findIndex(u => u.id === req.params.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        users[userIndex].isBlocked = true;
        users[userIndex].blocked_at = new Date().toISOString();

        res.json({ 
            message: 'Пользователь успешно заблокирован',
            user: {
                id: users[userIndex].id,
                email: users[userIndex].email,
                isBlocked: true
            }
        });
    } catch (error) {
        console.error('Ошибка блокировки пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});



app.post('/api/products', authenticateToken, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
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
        const allProducts = products.map(p => ({
            id: p.id,
            title: p.title,
            category: p.category,
            description: p.description,
            price: p.price,
            created_at: p.created_at
        }));
        res.json(allProducts);
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

        res.json(product);
    } catch (error) {
        console.error('Ошибка получения товара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});


app.put('/api/products/:id', authenticateToken, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
    try {
        const { title, category, description, price } = req.body;
        const productIndex = products.findIndex(p => p.id === req.params.id);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        if (req.user.role === ROLES.SELLER && products[productIndex].user_id !== req.user.sub) {
            return res.status(403).json({ error: 'Вы можете редактировать только свои товары' });
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


app.delete('/api/products/:id', authenticateToken, roleMiddleware([ROLES.ADMIN]), (req, res) => {
    try {
        const productIndex = products.findIndex(p => p.id === req.params.id);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        products.splice(productIndex, 1);
        res.json({ message: 'Товар успешно удален' });

    } catch (error) {
        console.error('Ошибка удаления товара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});


app.listen(PORT, async () => {
    await initializeTestData();
    
    console.log(`\nСервер запущен на http://localhost:${PORT}`);
    console.log('\nРоли в системе:');
    console.log('  user   - обычный пользователь');
    console.log('  seller - продавец');
    console.log('  admin  - администратор');
    console.log('\nТестовые аккаунты:');
    console.log('  Админ:    admin@example.com / admin123');
    console.log('  Продавец: seller@example.com / seller123');
    console.log('  Пользователь: user@example.com / user123');
    console.log('\nДоступные маршруты:');
    console.log('  POST   /api/auth/register');
    console.log('  POST   /api/auth/login');
    console.log('  POST   /api/auth/refresh');
    console.log('  GET    /api/auth/me');
    console.log('  GET    /api/users (admin only)');
    console.log('  GET    /api/users/:id (admin only)');
    console.log('  PUT    /api/users/:id (admin only)');
    console.log('  DELETE /api/users/:id (admin only)');
    console.log('  POST   /api/products (seller, admin)');
    console.log('  GET    /api/products');
    console.log('  GET    /api/products/:id');
    console.log('  PUT    /api/products/:id (seller, admin)');
    console.log('  DELETE /api/products/:id (admin only)\n');
});