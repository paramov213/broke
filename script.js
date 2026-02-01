const socket = io();
let me = null;

function auth() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    socket.emit('auth', { username: u, password: p });
}

socket.on('auth_success', (data) => {
    me = data;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    if(me.role === 'admin') document.getElementById('adm-btn').classList.remove('hidden');
    renderUI();
});

function tab(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(name + '-tab').classList.remove('hidden');
}

function renderUI() {
    document.getElementById('me-nick').innerText = me.nickname;
    document.getElementById('me-id').innerText = me.id ? `ID: ${me.id}` : "Номер не выдан";
    document.getElementById('me-subs').innerText = me.subs;
    document.getElementById('me-views').innerText = me.views;
    document.getElementById('me-reac').innerText = me.reactions;
    
    const nftBox = document.getElementById('nft-container');
    nftBox.innerHTML = '';
    me.nft.forEach(img => nftBox.innerHTML += `<img src="${img}" class="nft-pic">`);
}

function changePass() {
    const np = document.getElementById('new-pass').value;
    socket.emit('change_password', { username: me.username, newPass: np });
    alert("Пароль успешно обновлен!");
}

function createChan() {
    const name = document.getElementById('c-name').value;
    socket.emit('create_channel', { name, owner: me.username });
    alert("Канал создан!");
}

function adm(type) {
    const target = document.getElementById('a-target').value;
    const val = document.getElementById('a-val').value;
    socket.emit('admin_action', { adminPass: '565811', type, targetUser: target, val });
}

socket.on('update_me', (data) => {
    me = { ...me, ...data };
    renderUI();
});
