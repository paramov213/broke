const socket = io();
let me = JSON.parse(localStorage.getItem('broke_session'));
let chatWith = null;
let knownChats = new Set();

if(me) socket.emit('auth', me);

function auth() {
    const data = { username: document.getElementById('log-u').value, password: document.getElementById('log-p').value };
    socket.emit('auth', data);
    me = data;
}

socket.on('auth_success', (data) => {
    me = {...me, ...data};
    localStorage.setItem('broke_session', JSON.stringify(me));
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    if(me.username === 'admin') document.getElementById('adm-nav').classList.remove('hidden');
    updateUI();
});

// Список чатов
socket.on('new_chat_notification', (data) => {
    if(!knownChats.has(data.from)) {
        knownChats.add(data.from);
        const btn = document.createElement('button');
        btn.innerText = `💬 Чат с ${data.from}`;
        btn.onclick = () => openChat(data.from);
        document.getElementById('chat-list').appendChild(btn);
        document.getElementById('chat-dot').classList.remove('hidden');
    }
});

function openChat(user) {
    chatWith = user;
    document.getElementById('active-chat').classList.remove('hidden');
    document.getElementById('chat-title').innerText = "Чат с " + user;
    document.getElementById('messages').innerHTML = '';
}

function send() {
    const t = document.getElementById('m-text').value;
    socket.emit('private_msg', { from: me.username, to: chatWith, text: t });
    document.getElementById('m-text').value = '';
}

socket.on('msg_receive', (data) => {
    if(chatWith === data.from || chatWith === data.to) {
        document.getElementById('messages').innerHTML += `<div><b>${data.from}:</b> ${data.text}</div>`;
    }
});

// Редактирование профиля
function saveProfile() {
    const newData = {
        oldUser: me.username,
        newUser: document.getElementById('ed-user').value || me.username,
        nickname: document.getElementById('ed-nick').value || me.nickname,
        bio: document.getElementById('ed-bio').value || me.bio,
        password: document.getElementById('ed-pass').value || me.password
    };
    socket.emit('update_profile_data', newData);
}

socket.on('update_me', (data) => {
    me = data;
    localStorage.setItem('broke_session', JSON.stringify(me));
    updateUI();
    alert("Данные обновлены!");
});

function createChan() {
    socket.emit('create_channel', { 
        name: document.getElementById('c-name').value, 
        tag: document.getElementById('c-tag').value, 
        owner: me.username 
    });
}

function updateUI() {
    document.getElementById('me-nick').innerText = me.nickname;
    document.getElementById('me-user').innerText = "@" + me.username;
    document.getElementById('me-bio').innerText = me.bio;
    const wall = document.getElementById('me-nft');
    wall.innerHTML = '';
    me.nft.forEach(url => wall.innerHTML += `<img src="${url}" class="nft-pic">`);
}

function nav(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(id + '-page').classList.remove('hidden');
}

function logout() { localStorage.clear(); location.reload(); }
