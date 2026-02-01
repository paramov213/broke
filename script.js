const socket = io();
let myUser = null;

function auth() {
    const username = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    socket.emit('auth', { username, password: pass });
}

socket.on('auth_success', (data) => {
    myUser = data;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    if(myUser.username === 'admin') {
        document.getElementById('admin-nav').classList.remove('hidden');
    }
    updateUI();
});

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
}

// Поиск пользователя
function searchUser() {
    const query = document.getElementById('search-input').value;
    // В реальном приложении здесь socket.emit('find_user', query)
    document.getElementById('search-result').innerHTML = `<div class="profile-card">Пользователь ${query} найден!</div>`;
}

// Настройка профиля
function updateProfileData() {
    const newName = document.getElementById('new-username').value;
    myUser.nickname = newName;
    updateUI();
    // socket.emit('update_profile', myUser);
}

// Админ-функции (накрутка)
function adminAction(type) {
    const target = document.getElementById('adm-target').value;
    const adminPass = "565811"; // Твой пароль
    socket.emit('admin_action', { type, targetUser: target, adminPass });
    alert("Запрос на " + type + " отправлен!");
}

function updateUI() {
    document.getElementById('disp-nickname').innerText = myUser.nickname;
    document.getElementById('disp-id').innerText = "ID: " + (myUser.id || "Не назначен");
}
