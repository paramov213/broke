const socket = io();
let me = JSON.parse(localStorage.getItem('tg_session'));
let currentChat = null;

if(me) socket.emit('auth', me);

function auth() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    socket.emit('auth', { username: u, password: p });
    me = { username: u, password: p };
}

socket.on('auth_success', (data) => {
    me = {...me, ...data};
    localStorage.setItem('tg_session', JSON.stringify(me));
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    if(me.username === 'admin') document.getElementById('adm-btn').classList.remove('hidden');
    renderProfile();
});

// Кнопка "Найти и написать" (интегрирована в поиск)
function searchAndOpen() {
    const target = document.getElementById('tg-search').value.replace('@','');
    socket.emit('find_user', target);
}

socket.on('find_user_res', (user) => {
    if(!user) return alert("Пользователь не найден");
    openChat(user.username, user.nickname);
});

function openChat(username, nickname) {
    currentChat = username;
    showView('chat');
    document.getElementById('active-chat-name').innerText = nickname;
    document.getElementById('header-avatar').innerText = nickname[0].toUpperCase();
    document.getElementById('messages').innerHTML = '';
    
    // Добавляем в список чатов слева, если еще нет
    addChatToList(username, nickname);
}

function addChatToList(username, nickname) {
    const list = document.getElementById('chat-list');
    if(document.getElementById('item-' + username)) return;
    
    const div = document.createElement('div');
    div.id = 'item-' + username;
    div.className = 'chat-item';
    div.onclick = () => openChat(username, nickname);
    div.innerHTML = `<div class="chat-avatar">${nickname[0]}</div>
                     <div><b>${nickname}</b><br><small>@${username}</small></div>`;
    list.prepend(div);
}

function send() {
    const text = document.getElementById('m-text').value;
    if(!text || !currentChat) return;
    socket.emit('private_msg', { from: me.username, to: currentChat, text });
    document.getElementById('m-text').value = '';
}

socket.on('msg_receive', (data) => {
    if(currentChat === data.from || currentChat === data.to) {
        const side = data.from === me.username ? 'msg-out' : 'msg-in';
        document.getElementById('messages').innerHTML += `<div class="msg-bubble ${side}">${data.text}</div>`;
        const area = document.getElementById('messages');
        area.scrollTop = area.scrollHeight;
    }
    // Если нам написали, а мы в другом чате - добавляем в список
    addChatToList(data.from, data.from);
});

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(id + '-view').classList.remove('hidden');
}

function adm(type) {
    socket.emit('admin_action', { 
        adminPass: '565811', 
        type, 
        target: document.getElementById('adm-target').value, 
        val: document.getElementById('adm-val').value 
    });
}
