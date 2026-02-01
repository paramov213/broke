const socket = io();
let me = JSON.parse(localStorage.getItem('broke_user'));
let activeChat = null;

if(me) socket.emit('auth', me);

function auth() {
    const data = { username: document.getElementById('u-in').value, password: document.getElementById('p-in').value };
    socket.emit('auth', data);
    me = data;
}

socket.on('auth_success', (data) => {
    me = {...me, ...data};
    localStorage.setItem('broke_user', JSON.stringify(me));
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    if(me.username === 'admin') document.getElementById('adm-nav').classList.remove('hidden');
    updateUI();
});

function find() {
    const target = document.getElementById('s-user').value;
    socket.emit('find_user', target);
}

socket.on('search_result', (user) => {
    if(!user) return alert("Пользователь не найден");
    activeChat = user.username;
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('chat-with').innerText = "Чат с " + user.nickname;
});

function sendMsg() {
    const text = document.getElementById('m-text').value;
    if(!text || !activeChat) return;
    socket.emit('private_msg', { from: me.username, to: activeChat, text: text });
    document.getElementById('m-text').value = '';
}

socket.on('msg_receive', (data) => {
    const box = document.getElementById('messages');
    box.innerHTML += `<div><b>${data.from}:</b> ${data.text}</div>`;
    box.scrollTop = box.scrollHeight;
});

function adm(type) {
    socket.emit('admin_action', { 
        adminPass: '565811', 
        type, 
        target: document.getElementById('a-target').value, 
        val: document.getElementById('a-val').value 
    });
}

function updateUI() {
    document.getElementById('disp-nick').innerText = me.nickname;
    document.getElementById('disp-user').innerText = "@" + me.username;
    document.getElementById('disp-id').innerText = me.id ? "ID: " + me.id : "";
    document.getElementById('disp-subs').innerText = me.subs;
    
    const wall = document.getElementById('nft-wall');
    wall.innerHTML = '';
    me.nft.forEach(url => wall.innerHTML += `<img src="${url}" class="nft-pic">`);
}

function nav(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(id + '-page').classList.remove('hidden');
}

socket.on('update_profile', (data) => {
    me = {...me, ...data};
    updateUI();
});

function logout() { localStorage.clear(); location.reload(); }
