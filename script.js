const socket = io();
let me = JSON.parse(localStorage.getItem('tg_v2'));
let activeChat = null;

if (me) socket.emit('auth', me);

function auth() {
    const data = { username: document.getElementById('l-u').value, password: document.getElementById('l-p').value };
    socket.emit('auth', data);
    me = data;
}

socket.on('auth_success', (data) => {
    me = {...me, ...data};
    localStorage.setItem('tg_v2', JSON.stringify(me));
    document.getElementById('auth-layer').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('dr-nick').innerText = me.nickname;
    document.getElementById('dr-user').innerText = "@" + me.username;
});

function toggleDrawer() { document.getElementById('side-drawer').classList.toggle('active'); }

function doSearch() {
    const q = document.getElementById('g-search').value;
    if (q.length > 1) socket.emit('search_global', q);
}

socket.on('search_results', (users) => {
    const list = document.getElementById('chat-list');
    list.innerHTML = '';
    users.forEach(u => {
        const item = document.createElement('div');
        item.className = 'chat-item';
        item.onclick = () => openChat(u.username, u.nickname);
        item.innerHTML = `<div class="avatar">${u.avatar}</div><div><b>${u.nickname}</b><br><small>@${u.username}</small></div>`;
        list.appendChild(item);
    });
});

function openChat(user, nick) {
    activeChat = user;
    document.getElementById('h-nick').innerText = nick;
    document.getElementById('h-ava').innerText = nick[0];
    document.getElementById('messages').innerHTML = '';
}

function send() {
    const text = document.getElementById('m-input').value;
    if (!text || !activeChat) return;
    const msg = { from: me.username, to: activeChat, text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    socket.emit('send_msg', msg);
    document.getElementById('m-input').value = '';
}

socket.on('render_msg', (data) => {
    if (activeChat === data.from || activeChat === data.to) {
        const type = data.from === me.username ? 'out' : 'in';
        document.getElementById('messages').innerHTML += `
            <div class="bubble ${type}">${data.text}<span class="time">${data.time}</span></div>`;
        const m = document.getElementById('messages');
        m.scrollTop = m.scrollHeight;
    }
});
