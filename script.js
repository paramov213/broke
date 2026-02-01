let socket;
let currentUser = null;
let currentToken = null;

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const contentArea = document.getElementById('content-area');
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
            console.error('Error parsing saved user:', e);
            localStorage.clear();
        }
    }
});

// Функции авторизации
function showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showNotification('Введите имя пользователя и пароль', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentToken = data.token;
            currentUser = data.user;
            localStorage.setItem('broke_token', data.token);
            localStorage.setItem('broke_user', JSON.stringify(data.user));
            showMainApp();
            showNotification('Успешный вход!');
        } else {
            showNotification(data.error || 'Ошибка входа', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

async function register() {
    const username = document.getElementById('register-username').value;
    const nickname = document.getElementById('register-nickname').value;
    const password = document.getElementById('register-password').value;
    
    if (!username || !password) {
        showNotification('Заполните все обязательные поля', 'error');
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
            showNotification('Регистрация успешна!');
        } else {
            showNotification(data.error || 'Ошибка регистрации', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

function showMainApp() {
    authScreen.classList.remove('active');
    mainScreen.style.display = 'flex';
    
    // Обновляем информацию пользователя
    document.getElementById('main-avatar').textContent = 
        currentUser.nickname ? currentUser.nickname.charAt(0).toUpperCase() : currentUser.username.charAt(0).toUpperCase();
    document.getElementById('main-nickname').textContent = currentUser.nickname || currentUser.username;
    document.getElementById('main-username').textContent = `@${currentUser.username}`;
    
    // Показываем админ-меню если это админ
    if (currentUser.username === 'admin') {
        document.querySelector('.admin-only').style.display = 'flex';
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
        showNotification('🎁 Вы получили NFT подарок!');
        // Обновляем профиль если открыт
        if (document.querySelector('.section.active')?.id === 'profile-section') {
            loadUserProfile();
        }
    });
    
    socket.on('nft_error', (data) => {
        showNotification(data.error || 'Ошибка отправки NFT', 'error');
    });
    
    socket.on('nft_sent', (data) => {
        showNotification('NFT успешно отправлен!');
    });
}

// Навигация
function showSection(sectionId) {
    // Обновляем активный пункт меню
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    // Загружаем контент
    switch(sectionId) {
        case 'chats':
            contentTitle.textContent = 'Чаты';
            contentArea.innerHTML = `
                <div class="section active" id="chats-section">
                    <div class="chats-list">
                        <div class="chat-item">
                            <div class="avatar">T</div>
                            <div class="chat-info">
                                <h4>Тестовый пользователь</h4>
                                <p>Привет! Добро пожаловать в BROKE!</p>
                            </div>
                            <div class="chat-time">12:30</div>
                        </div>
                    </div>
                    <div class="chat-input">
                        <input type="text" placeholder="Введите сообщение...">
                        <button class="btn btn-primary">Отправить</button>
                    </div>
                </div>
            `;
            break;
            
        case 'search':
            contentTitle.textContent = 'Поиск пользователей';
            contentArea.innerHTML = `
                <div class="section active" id="search-section">
                    <div class="search-container">
                        <div class="search-box">
                            <input type="text" id="search-username" placeholder="Введите имя пользователя">
                            <button class="btn btn-primary" onclick="searchUser()">Найти</button>
                        </div>
                        <div id="search-results" class="search-results"></div>
                    </div>
                </div>
            `;
            break;
            
        case 'channels':
            contentTitle.textContent = 'Каналы';
            contentArea.innerHTML = `
                <div class="section active" id="channels-section">
                    <div style="margin-bottom: 30px;">
                        <h3>Создать канал</h3>
                        <div class="search-box">
                            <input type="text" id="channel-name" placeholder="Название канала">
                            <input type="text" id="channel-username" placeholder="Username канала">
                            <button class="btn btn-primary" onclick="createChannel()">Создать</button>
                        </div>
                    </div>
                    <div>
                        <h3>Найти канал</h3>
                        <div class="search-box">
                            <input type="text" id="search-channel" placeholder="Username канала">
                            <button class="btn btn-primary" onclick="searchChannel()">Найти</button>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'nft':
            contentTitle.textContent = 'NFT Подарки';
            contentArea.innerHTML = `
                <div class="section active" id="nft-section">
                    <h3>Мои NFT</h3>
                    <div id="my-nfts" class="nft-grid"></div>
                    
                    <h3 style="margin-top: 40px;">Отправить NFT подарок</h3>
                    <div style="margin-bottom: 30px;">
                        <div class="search-box">
                            <input type="text" id="nft-receiver" placeholder="Имя пользователя получателя">
                            <select id="nft-select">
                                <option value="1">🏆 Gold Trophy</option>
                                <option value="2">⭐ Silver Star</option>
                                <option value="3">🥉 Bronze Medal</option>
                                <option value="4">💎 Diamond</option>
                                <option value="5">❤️‍🔥 Fire Heart</option>
                            </select>
                            <button class="btn btn-primary" onclick="sendNFT()">Отправить</button>
                        </div>
                    </div>
                    
                    <h3>Доступные NFT</h3>
                    <div id="all-nfts" class="nft-grid">
                        <div class="nft-card legendary" onclick="selectNFT(1)">
                            <div class="nft-icon">🏆</div>
                            <div class="nft-name">Gold Trophy</div>
                            <div class="nft-rarity">Легендарный</div>
                        </div>
                        <div class="nft-card epic" onclick="selectNFT(2)">
                            <div class="nft-icon">⭐</div>
                            <div class="nft-name">Silver Star</div>
                            <div class="nft-rarity">Эпический</div>
                        </div>
                        <div class="nft-card rare" onclick="selectNFT(3)">
                            <div class="nft-icon">🥉</div>
                            <div class="nft-name">Bronze Medal</div>
                            <div class="nft-rarity">Редкий</div>
                        </div>
                    </div>
                </div>
            `;
            loadUserNFTs();
            break;
            
        case 'profile':
            contentTitle.textContent = 'Мой профиль';
            contentArea.innerHTML = `
                <div class="section active" id="profile-section">
                    <div class="profile-container">
                        <div class="profile-avatar" id="profile-avatar">
                            ${currentUser.nickname ? currentUser.nickname.charAt(0).toUpperCase() : currentUser.username.charAt(0).toUpperCase()}
                        </div>
                        
                        <div class="profile-form">
                            <div class="form-group">
                                <label>Имя пользователя</label>
                                <input type="text" value="@${currentUser.username}" disabled>
                            </div>
                            
                            <div class="form-group">
                                <label>Ваше имя</label>
                                <input type="text" id="profile-nickname" value="${currentUser.nickname || ''}" placeholder="Введите ваше имя">
                            </div>
                            
                            ${currentUser.admin_id ? `
                            <div class="form-group">
                                <label>ID номер</label>
                                <input type="text" value="${currentUser.admin_id}" disabled>
                            </div>
                            ` : ''}
                            
                            <div class="form-group">
                                <label>О себе</label>
                                <textarea id="profile-bio" placeholder="Расскажите о себе...">${currentUser.bio || ''}</textarea>
                            </div>
                            
                            <button class="btn btn-primary" onclick="updateProfile()">Сохранить изменения</button>
                        </div>
                        
                        <h3 style="margin-top: 40px;">Мои NFT подарки</h3>
                        <div id="profile-nfts" class="nft-grid"></div>
                    </div>
                </div>
            `;
            loadUserNFTsForProfile();
            break;
            
        case 'admin':
            contentTitle.textContent = 'Админ-панель';
            contentArea.innerHTML = `
                <div class="section active" id="admin-section">
                    <div class="admin-section">
                        <h3>Выдать NFT пользователю</h3>
                        <div class="admin-controls">
                            <input type="text" id="admin-give-user" placeholder="Имя пользователя">
                            <select id="admin-give-nft">
                                <option value="1">🏆 Gold Trophy</option>
                                <option value="2">⭐ Silver Star</option>
                                <option value="3">🥉 Bronze Medal</option>
                                <option value="4">💎 Diamond</option>
                                <option value="5">❤️‍🔥 Fire Heart</option>
                            </select>
                            <button class="btn btn-primary" onclick="adminGiveNFT()">Выдать NFT</button>
                        </div>
                    </div>
                    
                    <div class="admin-section">
                        <h3>Буст канала</h3>
                        <div class="admin-controls">
                            <input type="text" id="boost-channel-name" placeholder="Username канала">
                            <input type="number" id="boost-views" placeholder="Просмотры" value="1000">
                            <input type="number" id="boost-subs" placeholder="Подписчики" value="100">
                            <button class="btn btn-primary" onclick="adminBoostChannel()">Бустнуть канал</button>
                        </div>
                    </div>
                    
                    <div class="admin-section">
                        <h3>Выдать ID номер</h3>
                        <div class="admin-controls">
                            <input type="text" id="assign-id-user" placeholder="Имя пользователя">
                            <input type="text" id="assign-id-number" placeholder="ID номер">
                            <button class="btn btn-primary" onclick="adminAssignID()">Выдать ID</button>
                        </div>
                    </div>
                </div>
            `;
            break;
    }
}

// Поиск пользователей
async function searchUser() {
    const username = document.getElementById('search-username').value;
    const resultsDiv = document.getElementById('search-results');
    
    if (!username) {
        resultsDiv.innerHTML = '<p style="color: var(--gray); text-align: center;">Введите имя пользователя для поиска</p>';
        return;
    }
    
    try {
        const response = await fetch(`/api/user/${username}`);
        if (response.ok) {
            const user = await response.json();
            resultsDiv.innerHTML = `
                <div class="user-result">
                    <div class="avatar" style="background: linear-gradient(135deg, var(--primary), var(--secondary));">
                        ${user.nickname ? user.nickname.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                    </div>
                    <div style="flex: 1;">
                        <h4>${user.nickname || user.username}</h4>
                        <p>@${user.username}</p>
                        ${user.bio ? `<p style="margin-top: 5px; color: var(--gray);">${user.bio}</p>` : ''}
                    </div>
                    <button class="btn btn-primary" onclick="startChat(${user.id})">Написать</button>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = '<p style="color: var(--danger); text-align: center;">Пользователь не найден</p>';
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = '<p style="color: var(--danger); text-align: center;">Ошибка поиска</p>';
    }
}

// NFT функции
function selectNFT(nftId) {
    document.getElementById('nft-select').value = nftId;
}

async function sendNFT() {
    const receiver = document.getElementById('nft-receiver').value;
    const nftId = document.getElementById('nft-select').value;
    
    if (!receiver) {
        showNotification('Введите имя пользователя получателя', 'error');
        return;
    }
    
    if (socket) {
        socket.emit('send_nft', {
            receiver_username: receiver,
            nft_id: parseInt(nftId)
        });
    }
}

async function loadUserNFTs() {
    try {
        const response = await fetch(`/api/user/${currentUser.username}`);
        if (response.ok) {
            const user = await response.json();
            const myNftsDiv = document.getElementById('my-nfts');
            
            if (user.nfts && user.nfts.length > 0) {
                myNftsDiv.innerHTML = user.nfts.map(nft => `
                    <div class="nft-card ${nft.rarity}">
                        <div class="nft-icon">${nft.image_url}</div>
                        <div class="nft-name">${nft.name}</div>
                        <div class="nft-rarity">${getRarityName(nft.rarity)}</div>
                    </div>
                `).join('');
            } else {
                myNftsDiv.innerHTML = '<p style="color: var(--gray); text-align: center;">У вас еще нет NFT подарков</p>';
            }
        }
    } catch (error) {
        console.error('Error loading NFTs:', error);
    }
}

async function loadUserNFTsForProfile() {
    try {
        const response = await fetch(`/api/user/${currentUser.username}`);
        if (response.ok) {
            const user = await response.json();
            const profileNftsDiv = document.getElementById('profile-nfts');
            
            if (user.nfts && user.nfts.length > 0) {
                profileNftsDiv.innerHTML = user.nfts.map(nft => `
                    <div class="nft-card ${nft.rarity}">
                        <div class="nft-icon">${nft.image_url}</div>
                        <div class="nft-name">${nft.name}</div>
                        <div class="nft-rarity">${getRarityName(nft.rarity)}</div>
                    </div>
                `).join('');
            } else {
                profileNftsDiv.innerHTML = '<p style="color: var(--gray); text-align: center;">У вас еще нет NFT подарков</p>';
            }
        }
    } catch (error) {
        console.error('Error loading profile NFTs:', error);
    }
}

function getRarityName(rarity) {
    const names = {
        'legendary': 'Легендарный',
        'epic': 'Эпический',
        'rare': 'Редкий'
    };
    return names[rarity] || rarity;
}

// Админ функции
function adminGiveNFT() {
    const username = document.getElementById('admin-give-user').value;
    const nftId = document.getElementById('admin-give-nft').value;
    
    if (!username) {
        showNotification('Введите имя пользователя', 'error');
        return;
    }
    
    if (socket && currentUser.username === 'admin') {
        socket.emit('send_nft', {
            receiver_username: username,
            nft_id: parseInt(nftId)
        });
        showNotification(`NFT отправлен пользователю @${username}`);
    }
}

function adminBoostChannel() {
    const channelName = document.getElementById('boost-channel-name').value;
    const views = document.getElementById('boost-views').value;
    const subs = document.getElementById('boost-subs').value;
    
    if (!channelName) {
        showNotification('Введите имя канала', 'error');
        return;
    }
    
    showNotification(`Канал @${channelName} бустнут на ${views} просмотров и ${subs} подписчиков`);
}

function adminAssignID() {
    const username = document.getElementById('assign-id-user').value;
    const idNumber = document.getElementById('assign-id-number').value;
    
    if (!username || !idNumber) {
        showNotification('Введите имя пользователя и ID номер', 'error');
        return;
    }
    
    showNotification(`ID номер ${idNumber} выдан пользователю @${username}`);
}

// Вспомогательные функции
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.background = type === 'error' ? 'linear-gradient(135deg, var(--danger), #dc2626)' : 
                                 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
    
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
