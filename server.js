const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// База данных в памяти (после перезагрузки Render обнулится)
let users = {
    "admin": { password: "123", nickname: "👑 ADMIN", nft: [], id: "001", role: "admin", subs: 0, views: 0, reactions: 0 }
};
let channels = [];
let messages = [];

io.on('connection', (socket) => {
    socket.on('auth', (data) => {
        if (!users[data.username]) {
            users[data.username] = { password: data.password, nickname: data.username, nft: [], id: null, role: "user", subs: 0, views: 0, reactions: 0 };
        }
        if (users[data.username].password === data.password) {
            socket.join(data.username);
            socket.emit('auth_success', { ...users[data.username], username: data.username });
        } else {
            socket.emit('auth_error', 'Ошибка доступа');
        }
    });

    socket.on('change_password', (data) => {
        if (users[data.username]) {
            users[data.username].password = data.newPass;
            socket.emit('toast', 'Пароль успешно изменен!');
        }
    });

    socket.on('create_channel', (chan) => {
        channels.push(chan);
        io.emit('new_channel', channels);
    });

    socket.on('admin_action', (data) => {
        if (data.adminPass === '565811') {
            const t = users[data.targetUser];
            if (t) {
                if (data.type === 'gift_nft') t.nft.push(data.val);
                if (data.type === 'set_id') t.id = data.val;
                if (data.type === 'boost_subs') t.subs += parseInt(data.val);
                if (data.type === 'boost_views') t.views += parseInt(data.val);
                if (data.type === 'boost_reac') t.reactions += parseInt(data.val);
                io.to(data.targetUser).emit('update_me', t);
            }
        }
    });
});

server.listen(10000, '0.0.0.0');
