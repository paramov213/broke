const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = {
    "admin": { password: "123", nickname: "Admin", nft: ['👑 Founder'], wallet: 999 }
};

io.on('connection', (socket) => {
    socket.on('auth', (data) => {
        if (!users[data.username]) {
            users[data.username] = { password: data.password, nickname: data.username, nft: [], wallet: 0 };
        }
        socket.join(data.username);
        socket.emit('auth_success', { ...users[data.username], username: data.username });
    });

    socket.on('send_msg', (data) => {
        const msg = { ...data, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        io.to(data.to).to(data.from).emit('render_msg', msg);
    });

    socket.on('typing', (data) => socket.to(data.to).emit('user_typing', { from: data.from }));

    // Сигналы для звонков
    socket.on('call_user', (data) => io.to(data.to).emit('incoming_call', { from: data.from, signal: data.signal }));
    socket.on('answer_call', (data) => io.to(data.to).emit('call_accepted', data.signal));

    socket.on('admin_command', (data) => {
        if (data.adminPass === '565811' && users[data.target]) {
            if (data.type === 'gift_nft') users[data.target].nft.push(data.val);
            io.to(data.target).emit('update_me', users[data.target]);
        }
    });
});

server.listen(10000, '0.0.0.0');
