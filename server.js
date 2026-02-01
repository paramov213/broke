const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// База данных
const db = new sqlite3.Database(':memory:');

// Инициализация БД
db.serialize(() => {
  // Пользователи
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    nickname TEXT,
    avatar TEXT,
    bio TEXT,
    admin_id TEXT,
    session_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Каналы
  db.run(`CREATE TABLE channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    channel_username TEXT UNIQUE,
    owner_id INTEGER,
    subscribers INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Сообщения
  db.run(`CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    channel_id INTEGER,
    content TEXT,
    type TEXT DEFAULT 'text',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // NFT подарки
  db.run(`CREATE TABLE nfts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    image_url TEXT,
    rarity TEXT
  )`);

  db.run(`CREATE TABLE user_nfts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    nft_id INTEGER,
    sender_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Создаем админа
  bcrypt.hash('565811', 10, (err, hash) => {
    if (err) {
      console.error('Error hashing admin password:', err);
      return;
    }
    
    db.run(`INSERT INTO users (username, password, nickname, admin_id) 
            VALUES ('admin', ?, 'Администратор', 'ADMIN-001')`, [hash], function(err) {
      if (err) {
        console.error('Error creating admin:', err.message);
      } else {
        console.log('Admin user created with ID:', this.lastID);
      }
    });
  });

  // Добавляем NFT
  const nfts = [
    ['Gold Trophy', '🏆', 'legendary'],
    ['Silver Star', '⭐', 'epic'],
    ['Bronze Medal', '🥉', 'rare'],
    ['Diamond', '💎', 'legendary'],
    ['Fire Heart', '❤️‍🔥', 'epic']
  ];
  
  nfts.forEach((nft, index) => {
    db.run(`INSERT INTO nfts (name, image_url, rarity) VALUES (?, ?, ?)`, nft, function(err) {
      if (err) {
        console.error('Error inserting NFT:', err.message);
      }
    });
  });

  // Создаем тестового пользователя
  bcrypt.hash('test123', 10, (err, hash) => {
    db.run(`INSERT INTO users (username, password, nickname) 
            VALUES ('test', ?, 'Тестовый пользователь')`, [hash]);
  });
});

// API маршруты
app.post('/api/register', async (req, res) => {
  const { username, password, nickname } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(`INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)`,
      [username, hashedPassword, nickname || username], function(err) {
      if (err) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      const token = jwt.sign({ id: this.lastID, username }, 'broke_secret');
      res.json({ 
        token, 
        user: {
          id: this.lastID,
          username,
          nickname: nickname || username,
          avatar: null,
          bio: null,
          admin_id: null
        }
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
      
      const token = jwt.sign({ id: user.id, username: user.username }, 'broke_secret');
      
      res.json({ 
        token, 
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          bio: user.bio,
          admin_id: user.admin_id
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });
});

app.get('/api/user/:username', (req, res) => {
  const { username } = req.params;
  
  db.get(`SELECT id, username, nickname, avatar, bio, admin_id FROM users WHERE username = ?`,
    [username], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Получаем NFT пользователя
    db.all(`SELECT nfts.* FROM user_nfts 
            JOIN nfts ON user_nfts.nft_id = nfts.id 
            WHERE user_nfts.user_id = ?`, [user.id], (err, nfts) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      user.nfts = nfts || [];
      res.json(user);
    });
  });
});

// NFT API
app.get('/api/nfts', (req, res) => {
  db.all(`SELECT * FROM nfts`, [], (err, nfts) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(nfts);
  });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('authenticate', (token) => {
    try {
      const user = jwt.verify(token, 'broke_secret');
      socket.userId = user.id;
      socket.username = user.username;
      socket.join(`user_${user.id}`);
      console.log(`User ${user.username} authenticated`);
    } catch (err) {
      console.log('Invalid token');
    }
  });
  
  socket.on('send_message', (data) => {
    const { receiver_id, content } = data;
    
    db.run(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`,
      [socket.userId, receiver_id, content], function(err) {
        if (err) {
          console.error('Error saving message:', err);
          return;
        }
        
        const message = {
          id: this.lastID,
          sender_id: socket.userId,
          receiver_id,
          content,
          timestamp: new Date().toISOString()
        };
        
        io.to(`user_${receiver_id}`).emit('new_message', message);
        socket.emit('message_sent', message);
      });
  });
  
  socket.on('send_nft', (data) => {
    const { receiver_username, nft_id } = data;
    
    db.get(`SELECT id FROM users WHERE username = ?`, [receiver_username], (err, receiver) => {
      if (err) {
        console.error('Database error:', err);
        return;
      }
      
      if (!receiver) {
        socket.emit('nft_error', { error: 'User not found' });
        return;
      }
      
      db.run(`INSERT INTO user_nfts (user_id, nft_id, sender_id) VALUES (?, ?, ?)`,
        [receiver.id, nft_id, socket.userId], function(err) {
          if (err) {
            console.error('Error saving NFT:', err);
            socket.emit('nft_error', { error: 'Failed to send NFT' });
            return;
          }
          
          io.to(`user_${receiver.id}`).emit('nft_received', {
            nft_id,
            sender_id: socket.userId,
            timestamp: new Date().toISOString()
          });
          
          socket.emit('nft_sent', { success: true });
        });
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Все остальные запросы отправляют index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(3000, () => {
  console.log('=================================');
  console.log('BROKE Messenger запущен!');
  console.log('Адрес: http://localhost:3000');
  console.log('=================================');
  console.log('Тестовые аккаунты:');
  console.log('Админ: логин - admin, пароль - 565811');
  console.log('Пользователь: логин - test, пароль - test123');
  console.log('=================================');
});
