const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = {
    "admin": { password: "565811", nickname: "Admin Root", nft: [], id: "001", subs: 0, views: 0 }
};

io.on('connection', (socket) => {
    socket.on('auth', (data) => {
        if (!users[data.username]) {
            users[data.username] = { password: data.password, nickname: data.username, nft: [], id: null, subs: 0, views: 0 };
        }
        if (users[data.username].password === data.password) {
            socket.join(data.username); // Входим в личную комнату для получения ЛС
            socket.emit('auth_success', { ...users[data.username], username: data.username });
        }
    });

    // Поиск пользователя для переписки
    socket.on('find_user', (target) => {
        if (users[target]) {
            socket.emit('search_result', { username: target, nickname: users[target].nickname });
        } else {
            socket.emit('search_result', null);
        }
    });

    // Отправка личного сообщения
    socket.on('private_msg', (data) => {
        // Отправляем сообщение и получателю, и себе (для отображения в чате)
        io.to(data.to).to(data.from).emit('msg_receive', data);
    });

    // Исправленная Админ-панель
    socket.on('admin_action', (data) => {
        if (data.adminPass === '565811') {
            const t = users[data.target];
            if (t) {
                if (data.type === 'gift_nft') t.nft.push(data.val);
                if (data.type === 'set_id') t.id = data.val;
                if (data.type === 'boost_subs') t.subs += parseInt(data.val || 0);
                
                io.to(data.target).emit('update_profile', t); // Обновляем данные у цели в реальном времени
                socket.emit('toast', 'Успешно применено!');
            }
        }
    });
});

server.listen(10000, '0.0.0.0');
