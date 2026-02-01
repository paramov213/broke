const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = {
    "admin": { password: "123", nickname: "👑 ADMIN", bio: "Основатель BROKE", nft: [], id: "001", role: "admin", subs: 9999, views: 0, reactions: 0 }
};

io.on('connection', (socket) => {
    socket.on('auth', (data) => {
        // Если пользователя нет - создаем, если есть - проверяем пароль
        if (!users[data.username]) {
            users[data.username] = { 
                password: data.password, nickname: data.username, 
                bio: "Новый пользователь", nft: [], id: null, role: "user",
                subs: 0, views: 0, reactions: 0 
            };
        }

        if (users[data.username].password === data.password) {
            socket.emit('auth_success', users[data.username]);
        } else {
            socket.emit('auth_error', 'Неверный пароль!');
        }
    });

    socket.on('admin_action', (data) => {
        if (data.adminPass === '565811') {
            const target = users[data.targetUser];
            if (target) {
                if (data.type === 'gift_nft') target.nft.push(data.nftUrl);
                if (data.type === 'set_id') target.id = data.val;
                if (data.type === 'boost_subs') target.subs += parseInt(data.val || 100);
                if (data.type === 'boost_views') target.views += parseInt(data.val || 500);
                if (data.type === 'boost_reac') target.reactions += parseInt(data.val || 50);
                
                io.emit('update_profile', {username: data.targetUser, data: target});
            }
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`BROKE Live on ${PORT}`));
