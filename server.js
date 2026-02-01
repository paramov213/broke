const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// База данных SQLite
const db = new sqlite3.Database('./broke.db');

// Инициализация базы данных
db.serialize(() => {
  // Пользователи
  db.run(`CREATE TABLE IF NOT EXISTS users (
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
  db.run(`CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    channel_username TEXT UNIQUE,
    owner_id INTEGER,
    subscribers INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  )`);

  // Сообщения
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    channel_id INTEGER,
    content TEXT,
    type TEXT DEFAULT 'text',
    reactions TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // NFT подарки
  db.run(`CREATE TABLE IF NOT EXISTS nfts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    image_url TEXT,
    rarity TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_nfts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    nft_id INTEGER,
    sender_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(nft_id) REFERENCES nfts(id)
  )`);

  // Создаем админа
  const adminPassword = '565811';
  bcrypt.hash(adminPassword, 10, (err, hash) => {
    db.run(`INSERT OR IGNORE INTO users (username, password, nickname, admin_id) 
            VALUES ('admin', ?, 'Administrator', 'ADMIN-001')`, [hash]);
  });

  // Добавляем NFT
  const nfts = [
    ['Gold Trophy', '/nfts/gold.png', 'legendary'],
    ['Silver Star', '/nfts/silver.png', 'epic'],
    ['Bronze Medal', '/nfts/bronze.png', 'rare'],
    ['Diamond', '/nfts/diamond.png', 'legendary'],
    ['Fire Heart', '/nfts/fire.png', 'epic']
  ];
  
  nfts.forEach(nft => {
    db.run(`INSERT OR IGNORE INTO nfts (name, image_url, rarity) VALUES (?, ?, ?)`, nft);
  });
});

// Хранилище для сессий
const sessions = new Map();

// Socket.IO соединения
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('authenticate', (token) => {
    jwt.verify(token, 'broke_secret', (err, user) => {
      if (!err && user) {
        socket.userId = user.id;
        socket.join(`user_${user.id}`);
      }
    });
  });

  // Отправка сообщения
  socket.on('send_message', (data) => {
    const { receiver_id, channel_id, content, type } = data;
    const message = {
      id: uuidv4(),
      sender_id: socket.userId,
      receiver_id,
      channel_id,
      content,
      type,
      timestamp: new Date().toISOString()
    };

    // Сохраняем в БД
    db.run(`INSERT INTO messages (sender_id, receiver_id, channel_id, content, type) 
            VALUES (?, ?, ?, ?, ?)`, 
            [socket.userId, receiver_id, channel_id, content, type],
            function(err) {
              if (!err) {
                message.id = this.lastID;
                
                if (receiver_id) {
                  // Личное сообщение
                  io.to(`user_${receiver_id}`).emit('new_message', message);
                  socket.emit('message_sent', message);
                } else if (channel_id) {
                  // Сообщение в канале
                  io.emit('channel_message', { channel_id, message });
                }
              }
            });
  });

  // Отправка NFT подарка
  socket.on('send_nft', async (data) => {
    const { receiver_username, nft_id } = data;
    
    db.get(`SELECT id FROM users WHERE username = ?`, [receiver_username], (err, receiver) => {
      if (receiver) {
        db.run(`INSERT INTO user_nfts (user_id, nft_id, sender_id) VALUES (?, ?, ?)`,
                [receiver.id, nft_id, socket.userId], function(err) {
          if (!err) {
            // Отправляем уведомление получателю
            io.to(`user_${receiver.id}`).emit('nft_received', {
              nft_id,
              sender_id: socket.userId,
              timestamp: new Date().toISOString()
            });
            
            socket.emit('nft_sent', { success: true });
          }
        });
      }
    });
  });

  // Админ функции
  socket.on('admin_give_nft', (data) => {
    const { username, nft_id } = data;
    
    db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, user) => {
      if (user) {
        db.run(`INSERT INTO user_nfts (user_id, nft_id, sender_id) VALUES (?, ?, 0)`,
                [user.id, nft_id], function(err) {
          if (!err) {
            io.to(`user_${user.id}`).emit('nft_received', {
              nft_id,
              sender_id: 0,
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    });
  });

  socket.on('admin_boost_channel', (data) => {
    const { channel_username, views, subscribers } = data;
    
    db.run(`UPDATE channels SET views = views + ?, subscribers = subscribers + ? 
            WHERE channel_username = ?`, [views, subscribers, channel_username]);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API маршруты
app.post('/api/register', async (req, res) => {
  const { username, password, nickname } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(`INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)`,
            [username, hashedPassword, nickname], function(err) {
      if (err) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      const token = jwt.sign({ id: this.lastID, username }, 'broke_secret');
      res.json({ token, userId: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, username }, 'broke_secret', { expiresIn: '7d' });
    
    // Обновляем сессию
    db.run(`UPDATE users SET session_token = ? WHERE id = ?`, [token, user.id]);
    
    res.json({ token, user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      admin_id: user.admin_id
    }});
  });
});

app.get('/api/user/:username', (req, res) => {
  const { username } = req.params;
  
  db.get(`SELECT id, username, nickname, avatar, bio, admin_id FROM users WHERE username = ?`,
          [username], (err, user) => {
    if (user) {
      // Получаем NFT пользователя
      db.all(`SELECT nfts.* FROM user_nfts 
              JOIN nfts ON user_nfts.nft_id = nfts.id 
              WHERE user_nfts.user_id = ?`, [user.id], (err, nfts) => {
        user.nfts = nfts || [];
        res.json(user);
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

app.post('/api/create_channel', (req, res) => {
  const { name, channel_username, owner_id } = req.body;
  
  db.run(`INSERT INTO channels (name, channel_username, owner_id) VALUES (?, ?, ?)`,
          [name, channel_username, owner_id], function(err) {
    if (err) {
      return res.status(400).json({ error: 'Channel username already exists' });
    }
    res.json({ id: this.lastID, name, channel_username });
  });
});

server.listen(3000, () => {
  console.log('BROKE Messenger server running on port 3000');
});
