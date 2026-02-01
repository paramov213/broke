const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = {
    "admin": { password: "123", nickname: "Telegram", bio: "Service notifications", avatar: "T", id: "777" }
};

io.on('connection', (socket) => {
    socket.on('auth', (data) => {
        if (!users[data.username]) {
            users[data.username] = { 
                password: data.password, nickname: data.username, 
                bio: "Using BROKE", avatar: data.username[0].toUpperCase(), id: Math.floor(Math.random()*900)+100 
            };
        }
        if (users[data.username].password === data.password) {
            socket.join(data.username);
            socket.emit('auth_success', { ...users[data.username], username: data.username });
        }
    });

    socket.on('search_global', (query) => {
        const found = Object.keys(users)
            .filter(u => u.includes(query))
            .map(u => ({ username: u, nickname: users[u].nickname, avatar: users[u].avatar }));
        socket.emit('search_results', found);
    });

    socket.on('send_msg', (data) => {
        const msg = { ...data, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        io.to(data.to).to(data.from).emit('render_msg', msg);
    });
});

server.listen(10000, '0.0.0.0');
