const socket = io();
let me = JSON.parse(localStorage.getItem('broke_me'));

// Авто-вход
if (me) {
    socket.emit('auth', { username: me.username, password: me.password });
}

function auth() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    socket.emit('auth', { username: u, password: p });
    localStorage.setItem('temp_p', p);
}

socket.on('auth_success', (data) => {
    me = { ...data, password: data.password || localStorage.getItem('temp_p') };
    localStorage.setItem('broke_me', JSON.stringify(me));
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    if (me.username === 'admin') document.getElementById('admin-nav').classList.remove('hidden');
    updateUI();
});

function updateUI() {
    document.getElementById('u-nick').innerText = me.nickname;
    document.getElementById('u-user').innerText = "@" + me.username;
    document.getElementById('u-avatar').src = me.avatar;
    document.getElementById('u-id').innerText = me.id ? `ID: ${me.id}` : "";
    document.getElementById('u-subs').innerText = me.subs;
    document.getElementById('u-views').innerText = me.views;
    
    const nftBox = document.getElementById('u-nft');
    nftBox.innerHTML = '';
    me.nft.forEach(url => nftBox.innerHTML += `<img src="${url}" class="nft-item">`);
}

function nav(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(id + '-page').classList.remove('hidden');
}

function adm(type) {
    const target = document.getElementById('adm-target').value;
    const val = document.getElementById('adm-val').value;
    socket.emit('admin_action', { adminPass: '565811', type, target, val });
}

function logout() {
    localStorage.clear();
    location.reload();
}

socket.on('update_profile', (data) => {
    me = { ...me, ...data };
    updateUI();
});
