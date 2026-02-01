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
            users[data.username] = { password: data.password, nickname: data.username, bio: "", avatar: data.username[0].toUpperCase(), id: Math.floor(Math.random()*999) };
        }
        if (users[data.username].password === data.password) {
            socket.join(data.username);
            socket.emit('auth_success', { ...users[data.username], username: data.username });
        }
    });

    socket.on('search_global', (query) => {
        const results = Object.keys(users)
            .filter(u => u.includes(query))
            .map(u => ({ username: u, nickname: users[u].nickname, avatar: users[u].avatar }));
        socket.emit('search_results', results);
    });

    socket.on('send_msg', (data) => {
        io.to(data.to).to(data.from).emit('render_msg', data);
    });
});

server.listen(10000, '0.0.0.0');
