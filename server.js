const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = {
    "admin": { password: "565811", nickname: "Основатель", bio: "Admin Root", nft: [], id: "001", avatar: "https://cdn-icons-png.flaticon.com/512/714/714424.png", subs: 0, views: 0 }
};
let channels = {};

io.on('connection', (socket) => {
    // Авторизация и Авто-вход
    socket.on('auth', (data) => {
        if (!users[data.username]) {
            users[data.username] = { 
                password: data.password, nickname: data.username, 
                bio: "Статус BROKE", nft: [], id: null, 
                avatar: `https://ui-avatars.com/api/?name=${data.username}`,
                subs: 0, views: 0 
            };
        }
        if (users[data.username].password === data.password) {
            socket.join(data.username);
            socket.emit('auth_success', { ...users[data.username], username: data.username });
        } else {
            socket.emit('auth_error', 'Ошибка входа');
        }
    });

    // Поиск
    socket.on('search_user', (username) => {
        const found = users[username];
        socket.emit('search_result', found ? { ...found, username } : null);
    });

    // NFT Подарки
    socket.on('send_nft', (data) => {
        if (users[data.to]) {
            users[data.to].nft.push(data.nftUrl);
            io.to(data.to).emit('update_profile', users[data.to]);
            socket.emit('toast', 'Подарок отправлен!');
        }
    });

    // Каналы
    socket.on('create_channel', (data) => {
        channels[data.tag] = { name: data.name, owner: data.owner, subs: 0, views: 0, posts: [] };
        io.emit('new_channel_alert', data.tag);
    });

    // Админ-действия
    socket.on('admin_action', (data) => {
        const t = users[data.target];
        if (t) {
            if (data.type === 'gift_nft') t.nft.push(data.val);
            if (data.type === 'set_id') t.id = data.val;
            if (data.type === 'boost_subs') t.subs += parseInt(data.val);
            io.to(data.target).emit('update_profile', t);
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`BROKE OS LIVE`));
