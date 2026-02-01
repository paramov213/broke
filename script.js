const socket = io();
let currentUser = null;

function auth() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    socket.emit('auth', { username: user, password: pass });
}

socket.on('auth_success', (userData) => {
    currentUser = userData;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('nav-menu').classList.remove('hidden');
    document.getElementById('profile-section').classList.remove('hidden');
    
    if(currentUser.username === 'admin') {
        document.getElementById('admin-btn').classList.remove('hidden');
    }
    updateUI();
});

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
}

function updateUI() {
    document.getElementById('disp-nickname').innerText = currentUser.nickname;
    document.getElementById('disp-id').innerText = currentUser.id ? "ID: " + currentUser.id : "ID не назначен";
    
    const container = document.getElementById('nft-container');
    container.innerHTML = '';
    currentUser.nft.forEach(url => {
        container.innerHTML += `<img src="${url}" class="nft-item">`;
    });
}

function adminAction(type) {
    const target = document.getElementById('adm-target').value;
    const val = (type === 'gift_nft') ? document.getElementById('adm-nft').value : document.getElementById('adm-id').value;
    socket.emit('admin_action', { 
        adminPass: '565811', type: type, targetUser: target, nftUrl: val, newId: val 
    });
}

socket.on('update_profile', (data) => {
    if(currentUser && data.username === currentUser.username) {
        currentUser = data.data;
        updateUI();
    }
});
