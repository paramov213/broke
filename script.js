const socket = io();
let currentUser = null;

function auth() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    localStorage.setItem('broke_user', user);
    localStorage.setItem('broke_pass', pass);
    socket.emit('auth', { username: user, password: pass });
}

socket.on('auth_success', (user) => {
    currentUser = user;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    if(user.username === 'admin') document.getElementById('admin-btn').classList.remove('hidden');
    updateUI();
});

function updateUI() {
    document.getElementById('my-nickname').innerText = currentUser.nickname;
    document.getElementById('my-id').innerText = currentUser.id ? `ID: ${currentUser.id}` : "";
    const nftBox = document.getElementById('nft-gallery');
    nftBox.innerHTML = '';
    currentUser.nft.forEach(url => nftBox.innerHTML += `<img src="${url}" class="nft-item">`);
}

function adminAction(type) {
    const target = document.getElementById('adm-target').value;
    const val = document.getElementById('adm-val').value;
    socket.emit('admin_action', { 
        adminPass: '565811', type: type, targetUser: target, nftUrl: val, newId: val 
    });
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
}

socket.on('update_profile', (data) => {
    if(currentUser && data.username === currentUser.username) {
        currentUser = data.data;
        updateUI();
    }
});