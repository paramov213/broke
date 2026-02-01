const socket = io();
let me = JSON.parse(localStorage.getItem('tg_final'));
let activeChat = null;

if (me) socket.emit('auth', me);

function auth() {
    const data = { username: document.getElementById('u').value, password: document.getElementById('p').value };
    socket.emit('auth', data);
    me = data;
}

socket.on('auth_success', (data) => {
    me = {...me, ...data};
    localStorage.setItem('tg_final', JSON.stringify(me));
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('my-nick').innerText = me.nickname;
    document.getElementById('my-user').innerText = "@" + me.username;
    document.getElementById('my-ava').innerText = me.nickname[0];
});

function toggleDr() { document.getElementById('drawer').classList.toggle('open'); }

function doSearch() {
    const q = document.getElementById('g-search').value;
    if (q.length > 1) socket.emit('search_global', q);
}

socket.on('search_results', (users) => {
    const list = document.getElementById('chat-list');
    list.innerHTML = '';
    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.onclick = () => openChat(u.username, u.nickname);
        div.innerHTML = `<div class="ava">${u.avatar}</div><div><b>${u.nickname}</b><br><small>@${u.username}</small></div>`;
        list.appendChild(div);
    });
});

function openChat(user, nick) {
    activeChat = user;
    document.getElementById('h-nick').innerText = nick;
    document.getElementById('h-ava').innerText = nick[0];
    document.getElementById('messages').innerHTML = '';
}

function send() {
    const text = document.getElementById('m-in').value;
    if (!text || !activeChat) return;
    socket.emit('send_msg', { from: me.username, to: activeChat, text });
    document.getElementById('m-in').value = '';
}

socket.on('render_msg', (data) => {
    if (activeChat === data.from || activeChat === data.to) {
        const side = data.from === me.username ? 'out' : 'in';
        document.getElementById('messages').innerHTML += `<div class="bubble ${side}">${data.text}<span class="time">${data.time}</span></div>`;
        const m = document.getElementById('messages');
        m.scrollTop = m.scrollHeight;
    }
});
