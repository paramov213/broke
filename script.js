const socket = io();
let me = null;
let activeChat = null;

function auth() {
    const u = document.getElementById('l-u').value;
    const p = document.getElementById('l-p').value;
    if(u && p) {
        socket.emit('auth', { username: u, password: p });
    }
}

socket.on('auth_success', (data) => {
    me = data;
    document.getElementById('auth-layer').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('dr-name').innerText = me.nickname;
    document.getElementById('dr-user').innerText = "@" + me.username;
    document.getElementById('my-ava').innerText = me.nickname[0].toUpperCase();
});

function toggleDr() { document.getElementById('drawer').classList.toggle('open'); }

function openChat(user, nick) {
    activeChat = user;
    document.getElementById('h-nick').innerText = nick;
    document.getElementById('h-ava').innerText = nick[0];
    document.getElementById('messages').innerHTML = '';
}

function send() {
    const val = document.getElementById('m-input').value;
    if(val && activeChat) {
        socket.emit('send_msg', { from: me.username, to: activeChat, text: val });
        document.getElementById('m-input').value = '';
    }
}

socket.on('render_msg', (data) => {
    if(activeChat === data.from || activeChat === data.to) {
        const side = data.from === me.username ? 'right' : 'left';
        document.getElementById('messages').innerHTML += `
            <div style="text-align:${side}; margin:10px;">
                <span style="background:${side==='right'?'#007aff':'#333'}; padding:8px 12px; border-radius:15px; display:inline-block;">
                    ${data.text}
                </span>
            </div>`;
    }
});

// Логика кнопок меню
function view(type) {
    toggleDr();
    if(type === 'wallet') alert("Ваш баланс: 0.00 TON");
    if(type === 'calls') alert("Список звонков пуст");
    if(type === 'saved') openChat(me.username, "Избранное");
    if(type === 'profile') alert("Профиль: " + me.nickname);
}

// Простейший звонок
function startCall() {
    if(!activeChat) return;
    document.getElementById('call-screen').classList.remove('hidden');
    document.getElementById('c-name').innerText = activeChat;
}

function endCall() {
    document.getElementById('call-screen').classList.add('hidden');
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
}
