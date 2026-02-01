const socket = io();
let me = null;

function auth() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    if(!user || !pass) return alert("Заполни поля!");
    socket.emit('auth', { username: user, password: pass });
}

socket.on('auth_success', (userData) => {
    me = userData;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    if(me.role === 'admin') document.getElementById('admin-nav').classList.remove('hidden');
    updateUI();
});

function updateUI() {
    document.getElementById('u-nick').innerText = me.nickname;
    document.getElementById('u-id').innerText = me.id ? `ID: ${me.id}` : "ID не назначен";
    document.getElementById('u-subs').innerText = me.subs;
    document.getElementById('u-views').innerText = me.views;
    document.getElementById('u-reac').innerText = me.reactions;

    const wall = document.getElementById('nft-wall');
    wall.innerHTML = '';
    me.nft.forEach(url => wall.innerHTML += `<img src="${url}" class="nft-item">`);
}

function showSection(id) {
    document.querySelectorAll('.content-block').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id + '-section').classList.remove('hidden');
}

function adminSet(type) {
    const target = document.getElementById('adm-user').value;
    const val = document.getElementById('adm-val').value;
    socket.emit('admin_action', { 
        adminPass: '565811', 
        type: type, 
        targetUser: target, 
        val: val,
        nftUrl: val
    });
}

socket.on('update_profile', (data) => {
    if(me && data.username === me.username) {
        me = data.data;
        updateUI();
    }
});
