let socket;
let currentUser = null;
let currentToken = null;

// Проверяем сохраненную сессию
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('broke_token');
    if (savedToken) {
        autoLogin(savedToken);
    }
});

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

async function register() {
    const username = document.getElementById('regUsername').value;
    const nickname = document.getElementById('regNickname').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, nickname })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('broke_token', data.token);
            localStorage.setItem('broke_user', JSON.stringify(data.user));
            initApp(data.token, data.user);
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        alert('Connection error');
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('broke_token', data.token);
            localStorage.setItem('broke_user', JSON.stringify(data.user));
            initApp(data.token, data.user);
        } else {
            alert('Invalid credentials');
        }
    } catch (error) {
        alert('Connection error');
    }
}

async function autoLogin(token) {
    try {
        // В реальном приложении здесь бы была проверка токена
        const user = JSON.parse(localStorage.getItem('broke_user'));
        initApp(token, user);
    } catch (error) {
        localStorage.removeItem('broke_token');
        localStorage.removeItem('broke_user');
    }
}

function initApp(token, user) {
    currentToken = token;
    currentUser = user;
    
    // Скрываем форму авторизации
    document.querySelector('.auth-container').style.display = 'none';
    
    // Показываем основное приложение
    const mainApp = createMainApp();
    document.querySelector('.app-container').innerHTML = '';
    document.querySelector('.app-container').appendChild(mainApp);
    
    // Инициализируем WebSocket соединение
    initSocket();
    
    // Загружаем начальные данные
    loadUserProfile();
}

function initSocket() {
    socket = io('http://localhost:3000');
    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('authenticate', currentToken);
    });
    
    socket.on('new_message', (message) => {
        displayMessage(message, 'received');
    });
    
    socket.on('nft_received', (data) => {
        showNotification(`You received a new NFT gift!`);
        // Обновляем список NFT
        loadUserNFTs();
    });
}

function createMainApp() {
    const div = document.createElement('div');
    div.className = 'main-app';
    div.innerHTML = `
        <div class="sidebar">
            <div class="sidebar-item active" onclick="showSection('chats')">
                <i class="fas fa-comments"></i>
                <span>Chats</span>
            </div>
            <div class="sidebar-item" onclick="showSection('search')">
                <i class="fas fa-search"></i>
                <span>Find User</span>
            </div>
            <div class="sidebar-item" onclick="showSection('channels')">
                <i class="fas fa-satellite-dish"></i>
                <span>Channels</span>
            </div>
            <div class="sidebar-item" onclick="showSection('create_channel')">
                <i class="fas fa-plus-circle"></i>
                <span>Create Channel</span>
            </div>
            <div class="sidebar-item" onclick="showSection('nft')">
                <i class="fas fa-gem"></i>
                <span>NFT Gifts</span>
            </div>
            <div class="sidebar-item" onclick="showSection('profile')">
                <i class="fas fa-user"></i>
                <span>Profile</span>
            </div>
            ${currentUser.username === 'admin' ? `
            <div class="sidebar-item" onclick="showSection('admin')" style="color: var(--danger);">
                <i class="fas fa-crown"></i>
                <span>Admin Panel</span>
            </div>
            ` : ''}
            <div class="sidebar-item" onclick="logout()" style="margin-top: auto;">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </div>
        </div>
        
        <div class="main-content">
            <div class="top-bar">
                <div class="search-bar">
                    <i class="fas fa-search"></i>
                    <input type="text" id="globalSearch" placeholder="Search messages, users, channels...">
                </div>
                <div class="user-profile" onclick="showSection('profile')">
                    <div class="avatar" id="userAvatar">
                        ${currentUser.nickname ? currentUser.nickname.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <div class="username">@${currentUser.username}</div>
                        <div class="status" style="color: var(--secondary); font-size: 12px;">Online</div>
                    </div>
                </div>
            </div>
            
            <div class="content-area" id="contentArea">
                <!-- Динамически загружаемый контент -->
            </div>
        </div>
    `;
    return div;
}

async function showSection(section) {
    const contentArea = document.getElementById('contentArea');
    
    switch(section) {
        case 'profile':
            contentArea.innerHTML = `
                <div class="profile-container">
                    <h2>My Profile</h2>
                    <div class="profile-header">
                        <div class="avatar-large" id="profileAvatar">
                            ${currentUser.nickname ? currentUser.nickname.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <button class="btn-primary" onclick="changeAvatar()">Change Avatar</button>
                    </div>
                    <div class="profile-info">
                        <div class="info-item">
                            <label>Nickname</label>
                            <input type="text" id="profileNickname" value="${currentUser.nickname || ''}">
                        </div>
                        <div class="info-item">
                            <label>Username</label>
                            <div class="username-display">@${currentUser.username}</div>
                        </div>
                        ${currentUser.admin_id ? `
                        <div class="info-item">
                            <label>ID Number</label>
                            <div class="id-display">${currentUser.admin_id}</div>
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <label>Bio</label>
                            <textarea id="profileBio" placeholder="Tell something about yourself...">${currentUser.bio || ''}</textarea>
                        </div>
                        <button class="btn-primary" onclick="updateProfile()">Save Changes</button>
                    </div>
                    <div class="nft-section">
                        <h3>My NFT Collection</h3>
                        <div class="nft-grid" id="nftGrid"></div>
                    </div>
                </div>
            `;
            loadUserNFTs();
            break;
            
        case 'admin':
            if (currentUser.username !== 'admin') return;
            contentArea.innerHTML = `
                <div class="admin-panel">
                    <h2><i class="fas fa-crown"></i> Admin Panel</h2>
                    
                    <div class="admin-section">
                        <h3>Give NFT to User</h3>
                        <div class="admin-input-group">
                            <input type="text" id="adminUsername" placeholder="Username">
                            <select id="adminNftSelect">
                                <option value="1">Gold Trophy</option>
                                <option value="2">Silver Star</option>
                                <option value="3">Bronze Medal</option>
                                <option value="4">Diamond</option>
                                <option value="5">Fire Heart</option>
                            </select>
                            <button class="admin-btn" onclick="adminGiveNFT()">Give NFT</button>
                        </div>
                    </div>
                    
                    <div class="admin-section">
                        <h3>Boost Channel</h3>
                        <div class="admin-input-group">
                            <input type="text" id="boostChannel" placeholder="Channel username">
                            <input type="number" id="boostViews" placeholder="Views to add" value="1000">
                            <input type="number" id="boostSubs" placeholder="Subscribers to add" value="100">
                            <button class="admin-btn" onclick="adminBoostChannel()">Boost Channel</button>
                        </div>
                    </div>
                    
                    <div class="admin-section">
                        <h3>Assign ID Number</h3>
                        <div class="admin-input-group">
                            <input type="text" id="assignUser" placeholder="Username">
                            <input type="text" id="assignId" placeholder="ID Number">
                            <button class="admin-btn" onclick="adminAssignId()">Assign ID</button>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'search':
            contentArea.innerHTML = `
                <div class="search-container">
                    <h2>Find User</h2>
                    <div class="search-box">
                        <input type="text" id="searchUsername" placeholder="Enter username without @">
                        <button class="btn-primary" onclick="searchUser()">Search</button>
                    </div>
                    <div id="searchResults"></div>
                </div>
            `;
            break;
            
        case 'channels':
            contentArea.innerHTML = `
                <div class="channels-container">
                    <h2>Channels</h2>
                    <div class="search-box">
                        <input type="text" id="searchChannel" placeholder="Search channel by username">
                        <button class="btn-primary" onclick="searchChannel()">Search</button>
                    </div>
                    <div id="channelsList"></div>
                </div>
            `;
            break;
            
        case 'create_channel':
            contentArea.innerHTML = `
                <div class="create-channel">
                    <h2>Create New Channel</h2>
                    <div class="input-group">
                        <input type="text" id="channelName" placeholder="Channel Name">
                    </div>
                    <div class="input-group">
                        <input type="text" id="channelUsername" placeholder="Channel Username (unique)">
                    </div>
                    <button class="btn-primary" onclick="createChannel()">Create Channel</button>
                </div>
            `;
            break;
            
        case 'nft':
            contentArea.innerHTML = `
                <div class="nft-marketplace">
                    <h2>NFT Gifts Marketplace</h2>
                    <div class="nft-grid" id="marketplaceGrid">
                        <div class="nft-card legendary" onclick="sendNFT(1)">
                            <div class="nft-icon">🏆</div>
                            <h4>Gold Trophy</h4>
                            <p>Legendary</p>
                            <button class="btn-primary">Send as Gift</button>
                        </div>
                        <div class="nft-card epic" onclick="sendNFT(2)">
                            <div class="nft-icon">⭐</div>
                            <h4>Silver Star</h4>
                            <p>Epic</p>
                            <button class="btn-primary">Send as Gift</button>
                        </div>
                        <div class="nft-card rare" onclick="sendNFT(3)">
                            <div class="nft-icon">🥉</div>
                            <h4>Bronze Medal</h4>
                            <p>Rare</p>
                            <button class="btn-primary">Send as Gift</button>
                        </div>
                    </div>
                    <div class="send-nft-form">
                        <h3>Send NFT Gift</h3>
                        <div class="input-group">
                            <input type="text" id="sendToUser" placeholder="Username to send">
                        </div>
                        <button class="btn-primary" onclick="prepareSendNFT()">Send Gift</button>
                    </div>
                </div>
            `;
            break;
    }
    
    // Обновляем активный элемент в сайдбаре
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.sidebar-item').classList.add('active');
}

async function loadUserProfile() {
    try {
        const response = await fetch(`http://localhost:3000/api/user/${currentUser.username}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const userData = await response.json();
        currentUser = { ...currentUser, ...userData };
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadUserNFTs() {
    try {
        const response = await fetch(`http://localhost:3000/api/user/${currentUser.username}`);
        const userData = await response.json();
        
        if (userData.nfts && document.getElementById('nftGrid')) {
            const nftGrid = document.getElementById('nftGrid');
            nftGrid.innerHTML = userData.nfts.map(nft => `
                <div class="nft-card ${nft.rarity}">
                    <div class="nft-icon">${getNftIcon(nft.name)}</div>
                    <h4>${nft.name}</h4>
                    <p>${nft.rarity.charAt(0).toUpperCase() + nft.rarity.slice(1)}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading NFTs:', error);
    }
}

function getNftIcon(name) {
    const icons = {
        'Gold Trophy': '🏆',
        'Silver Star': '⭐',
        'Bronze Medal': '🥉',
        'Diamond': '💎',
        'Fire Heart': '❤️‍🔥'
    };
    return icons[name] || '🎁';
}

async function searchUser() {
    const username = document.getElementById('searchUsername').value;
    const resultsDiv = document.getElementById('searchResults');
    
    try {
        const response = await fetch(`http://localhost:3000/api/user/${username}`);
        if (response.ok) {
            const user = await response.json();
            resultsDiv.innerHTML = `
                <div class="user-card">
                    <div class="avatar">${user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}</div>
                    <div class="user-info">
                        <h3>${user.nickname || user.username}</h3>
                        <p>@${user.username}</p>
                        ${user.admin_id ? `<p><strong>ID:</strong> ${user.admin_id}</p>` : ''}
                        ${user.bio ? `<p>${user.bio}</p>` : ''}
                        <button class="btn-primary" onclick="startChat('${user.username}')">Message</button>
                    </div>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = '<p class="error">User not found</p>';
        }
    } catch (error) {
        resultsDiv.innerHTML = '<p class="error">Search error</p>';
    }
}

function startChat(username) {
    // Здесь бы открывался чат с пользователем
    alert(`Starting chat with @${username}`);
}

function sendNFT(nftId) {
    const receiver = prompt("Enter username to send NFT gift:");
    if (receiver && socket) {
        socket.emit('send_nft', {
            receiver_username: receiver,
            nft_id: nftId
        });
        showNotification(`NFT sent to @${receiver}!`);
    }
}

// Админ функции
function adminGiveNFT() {
    const username = document.getElementById('adminUsername').value;
    const nftId = document.getElementById('adminNftSelect').value;
    
    if (username && socket) {
        socket.emit('admin_give_nft', { username, nft_id: parseInt(nftId) });
        showNotification(`NFT given to @${username}`);
    }
}

function adminBoostChannel() {
    const channel = document.getElementById('boostChannel').value;
    const views = parseInt(document.getElementById('boostViews').value);
    const subs = parseInt(document.getElementById('boostSubs').value);
    
    if (channel && socket) {
        socket.emit('admin_boost_channel', {
            channel_username: channel,
            views: views,
            subscribers: subs
        });
        showNotification(`Channel @${channel} boosted!`);
    }
}

function createChannel() {
    const name = document.getElementById('channelName').value;
    const username = document.getElementById('channelUsername').value;
    
    if (name && username) {
        fetch('http://localhost:3000/api/create_channel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                name,
                channel_username: username,
                owner_id: currentUser.id
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                showNotification(`Channel ${name} created!`);
            }
        });
    }
}

function showNotification(message) {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary);
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function logout() {
    localStorage.removeItem('broke_token');
    localStorage.removeItem('broke_user');
    location.reload();
}

// Стили для анимаций
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .notification {
        font-family: 'Inter', sans-serif;
    }
`;
document.head.appendChild(style);
