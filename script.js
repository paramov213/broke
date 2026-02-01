const socket = io();
let me = null;
let activeChat = null;

function auth() {
    const u = document.getElementById('l-u').value;
    const p = document.getElementById('l-p').value;
    if(u && p) socket.emit('auth', { username: u, password: p });
}

socket.on('auth_success', (data) => {
    me = data;
    document.getElementById('auth-layer').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('dr-name').innerText = me.nickname;
    document.getElementById('dr-user').innerText = "@" + me.username;
    document.getElementById('my-ava').innerText = me.nickname[0].toUpperCase();
    if(me.username === 'admin') document.getElementById('adm-btn').classList.remove('hidden');
});

function toggleDrawer() { document.getElementById('drawer').classList.toggle('open'); }

function openView(name) {
    toggleDrawer();
    if(name === 'wallet') alert("Кошелёк: " + (me.wallet || 0) + " TON");
    if(name === 'profile') alert("Профиль пользователя: " + me.nickname);
    if(name === 'saved') selectChat(me.username, "Избранное");
    if(name === 'calls') alert("Список вызовов пуст");
}

function selectChat(user, nick) {
    activeChat = user;
    document.getElementById('h-nick').innerText = nick;
    document.getElementById('h-ava').innerText = nick[0].toUpperCase();
    document.getElementById('messages').innerHTML = '';
}

function sendMsg() {
    const text = document.getElementById('m-input').value;
    if(text && activeChat) {
        socket.emit('send_msg', { from: me.username, to: activeChat, text });
        document.getElementById('m-input').value = '';
    }
}

socket.on('render_msg', (data) => {
    if(activeChat === data.from || activeChat === data.to) {
        const side = data.from === me.username ? 'out' : 'in';
        document.getElementById('messages').innerHTML += `<div class="bubble ${side}">${data.text}</div>`;
        const m = document.getElementById('messages'); m.scrollTop = m.scrollHeight;
    }
});

function startCall() {
    if(!activeChat) return;
    document.getElementById('call-screen').classList.remove('hidden');
    document.getElementById('call-user-name').innerText = activeChat;
}

function endCall() { document.getElementById('call-screen').classList.add('hidden'); }

function toggleTheme() { document.body.classList.toggle('light-theme'); }
