let socket;
let currentUser = null;
let currentToken = null;

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const adminMenu = document.getElementById('admin-menu');
const contentBody = document.getElementById('content-body');
const contentTitle = document.getElementById('content-title');

// Проверка сохраненной сессии
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('broke_token');
    const savedUser = localStorage.getItem('broke_user');
    
    if (savedToken && savedUser) {
        try {
            currentToken = savedToken;
            currentUser = JSON.parse(savedUser);
            showMainApp();
        } catch (e) {
            localStorage.clear();
        }
    }
});

function showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
    
    if (tab === 'login') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('login-form').style.display = 'block';
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('register-form').style.display = 'block';
    }
}

async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentToken = data.token;
            currentUser = data.user;
            localStorage.setItem('broke_token', data.token);
            localStorage.setItem('broke_user', JSON.stringify(data.user));
            showMainApp();
        } else {
            alert(data.error || 'Ошибка входа');
        }
    } catch (error) {
        alert('Ошибка соединения');
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const nickname = document.getElementById('reg-nickname').value;
    const password = document.getElementById('reg-password').value;
    
    if (!username || !password) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, nickname })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentToken = data.token;
            currentUser = data.user;
            localStorage.setItem('broke_token', data.token);
            localStorage.setItem('broke_user', JSON.stringify(data.user));
            showMainApp();
        } else {
            alert(data.error || 'Ошибка регистрации');
        }
    } catch (error) {
        alert('Ошибка соединения');
    }
}

function showMainApp() {
    authScreen.classList.remove('active');
    mainScreen.style.display = 'flex';
    
    // Обновляем информацию пользователя
    document.getElementById('user-avatar').textContent = 
        currentUser.nickname ? currentUser.nickname.charAt(0).toUpperCase() : currentUser.username.charAt(0).toUpperCase();
    document.getElementById('user-nickname').textContent = currentUser.nickname || currentUser.username;
    document.getElementById('user-username').textContent = `@${currentUser.username}`;
    
    // Показываем админ-меню если это админ
    if (currentUser.username === 'admin') {
        adminMenu.style.display = 'flex';
    }
    
    // Инициализируем сокет
    initSocket();
    
    // Показываем чаты по умолчанию
    showSection('chats');
}

function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('authenticate', currentToken);
    });
    
    socket.on('new_message', (message) => {
        showNotification('Новое сообщение!');
    });
    
    socket.on('nft_received', (data) => {
        showNotification('Вы получили NFT подарок!');
    });
}

function showSection(section) {
    // Обновляем активный пункт меню
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.menu-item').classList.add('active');
    
    // Загружаем контент
    switch(section) {
        case 'chats':
            contentTitle.textContent = 'Чаты';
            contentBody.innerHTML = `
                <div class="chat-list">
                    <div class="chat-item">
                        <div class="avatar" style="background: #4CAF50;">A</div>
                        <div>
                            <div class="chat-name">Alex</div>
                            <div class="chat-last-msg">Привет! Как дела?</div>
                        </div>
                    </div>
                    <div class="chat-item">
                        <div class="avatar" style="background: #2196F3;">M</div>
                        <div>
                            <div class="chat-name">Maria</div>
                            <div class="chat-last-msg">Посмотри это видео</div>
                        </div>
                    </div>
                </div>
                <div class="message-input">
                    <input type="text" placeholder="Напишите сообщение...">
                    <button class="btn primary">Отправить</button>
                </div>
            `;
            break;
            
        case 'search':
            contentTitle.textContent = 'Поиск пользователей';
            contentBody.innerHTML = `
                <div class="search-box">
                    <input type="text" id="search-input" placeholder="Введите имя пользователя">
                    <button class="btn primary" onclick="searchUser()">Найти</button>
                </div>
                <div id="search-results"></div>
            `;
            break;
            
        case 'channels':
            contentTitle.textContent = 'Каналы';
            contentBody.innerHTML = `
                <div class="search-box">
                    <input type="text" id="channel-search" placeholder="Поиск каналов">
                    <button class="btn primary" onclick="searchChannel()">Найти</button>
                </div>
                <button class="btn primary" onclick="showSection('create_channel')" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> Создать канал
                </button>
            `;
            break;
            
        case 'create_channel':
            contentTitle.textContent = 'Создать канал';
            contentBody.innerHTML = `
                <div class="profile-form">
                    <input type="text" id="channel-name" placeholder="Название канала">
                    <input type="text" id="channel-username" placeholder="Username канала">
                    <button class="btn primary" onclick="createChannel()">Создать канал</button>
                </div>
            `;
            break;
            
        case 'nft':
            contentTitle.textContent = 'NFT Подарки';
            contentBody.innerHTML = `
                <div class="nft-grid">
                    <div class="nft-card" onclick="sendNFT(1)">
                        <div class="nft-icon">🏆</div>
                        <h4>Gold Trophy</h4>
                        <p>Легендарный</p>
                        <button class="btn primary" style="margin-top: 10px;">Отправить</button>
                    </div>
                    <div class="nft-card" onclick="sendNFT(2)">
                        <div class="nft-icon">⭐</div>
                        <h4>Silver Star</h4>
                        <p>Эпический</p>
                        <button class="btn primary" style="margin-top: 10px;">Отправить</button>
                    </div>
                    <div class="nft-card" onclick="sendNFT(3)">
                        <div class="nft-icon">🥉</div>
                        <h4>Bronze Medal</h4>
                        <p>Редкий</p>
                        <button class="btn primary" style="margin-top: 10px;">Отправить</button>
                    </div>
                </div>
                <div style="margin-top: 30px;">
                    <h3>Отправить подарок</h3>
                    <div class="search-box">
                        <input type="text" id="nft-receiver" placeholder="Имя пользователя">
                        <button class="btn primary" onclick="sendSelectedNFT()">Отправить выбранный NFT</button>
                    </div>
                </div>
            `;
            break;
            
        case 'profile':
            contentTitle.textContent = 'Мой профиль';
            contentBody.innerHTML = `
                <div class="profile-form">
                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                        <div class="avatar" style="width: 80px; height: 80px; font-size: 32px;">
                            ${currentUser.nickname ? currentUser.nickname.charAt(0).toUpperCase() : currentUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3>${currentUser.nickname || currentUser.username}</h3>
                            <p>@${currentUser.username}</p>
                            ${currentUser.admin_id ? `<p><strong>ID:</strong> ${currentUser.admin_id}</p>` : ''}
                        </div>
                    </div>
                    
                    <input type="text" id="profile-nickname" value="${currentUser.nickname || ''}" placeholder="Ваше имя">
                    <textarea id="profile-bio" placeholder="Расскажите о себе...">${currentUser.bio || ''}</textarea>
                    <button class="btn primary" onclick="updateProfile()">Сохранить</button>
                </div>
            `;
            break;
            
        case 'admin':
            contentTitle.textContent = 'Админ-панель';
            contentBody.innerHTML = `
                <div class="admin-section">
                    <h3>Выдать NFT пользователю</h3>
                    <div class="admin-controls">
                        <input type="text" id="admin-user" placeholder="Имя пользователя">
                        <select id="admin-nft">
                            <option value="1">🏆 Gold Trophy</option>
                            <option value="2">⭐ Silver Star</option>
                            <option value="3">🥉 Bronze Medal</option>
                            <option value="4">💎 Diamond</option>
                            <option value="5">❤️‍🔥 Fire Heart</option>
                        </select>
                        <button class="btn primary" onclick="adminGiveNFT()">Выдать</button>
                    </div>
                </div>
                
                <div class="admin-section">
                    <h3>Буст канала</h3>
                    <div class="admin-controls">
                        <input type="text" id="boost-channel" placeholder="Username канала">
                        <input type="number" id="boost-views" placeholder="Просмотры" value="1000">
                        <input type="number" id="boost-subs" placeholder="Подписчики" value="100">
                        <button class="btn primary" onclick="adminBoostChannel()">Буст</button>
                    </div>
                </div>
                
                <div class="admin-section">
                    <h3>Выдать ID номер</h3>
                    <div class="admin-controls">
                        <input type="text" id="assign-user" placeholder="Имя пользователя">
                        <input type="text" id="assign-id" placeholder="ID номер">
                        <button class="btn primary" onclick="adminAssignID()">Выдать ID</button>
                    </div>
                </div>
            `;
            break;
    }
}

async function searchUser() {
    const username = document.getElementById('search-input').value;
    const resultsDiv = document.getElementById('search-results');
    
    if (!username) {
        resultsDiv.innerHTML = '<p>Введите имя пользователя</p>';
        return;
    }
    
    try {
        const response = await fetch(`/api/user/${username}`);
        if (response.ok) {
            const user = await response.json();
            resultsDiv.innerHTML = `
                <div class="chat-item">
                    <div class="avatar">${user.nickname ? user.nickname.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="chat-name">${user.nickname || user.username}</div>
                        <div class="username">@${user.username}</div>
                        ${user.bio ? `<p>${user.bio}</p>` : ''}
                        <button class="btn primary" onclick="startChat(${user.id})">Написать</button>
                    </div>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = '<p>Пользователь не найден</p>';
        }
    } catch (error) {
        resultsDiv.innerHTML = '<p>Ошибка поиска</p>';
    }
}

function sendNFT(nftId) {
    window.selectedNFT = nftId;
    document.getElementById('nft-receiver').focus();
}

function sendSelectedNFT() {
    const receiver = document.getElementById('nft-receiver').value;
    const nftId = window.selectedNFT || 1;
    
    if (!receiver) {
        alert('Введите имя пользователя');
        return;
    }
    
    if (socket) {
        socket.emit('send_nft', {
            receiver_username: receiver,
            nft_id: nftId
        });
        alert(`NFT отправлен пользователю @${receiver}`);
    }
}

function adminGiveNFT() {
    const username = document.getElementById('admin-user').value;
    const nftId = document.getElementById('admin-nft').value;
    
    if (username && socket && currentUser.username === 'admin') {
        socket.emit('send_nft', {
            receiver_username: username,
            nft_id: parseInt(nftId)
        });
        alert(`NFT выдан пользователю @${username}`);
    }
}

function showNotification(message) {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function logout() {
    localStorage.removeItem('broke_token');
    localStorage.removeItem('broke_user');
    location.reload();
}
