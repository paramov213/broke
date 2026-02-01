const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = {
    "admin": { password: "565811", nickname: "Admin Root", bio: "Основатель", nft: [], id: "001", subs: 0 }
};
let channels = {};

io.on('connection', (socket) => {
    socket.on('auth', (data) => {
        if (!users[data.username]) {
            users[data.username] = { password: data.password, nickname: data.username, bio: "Broke User", nft: [], id: null, subs: 0 };
        }
        if (users[data.username].password === data.password) {
            socket.join(data.username);
            socket.emit('auth_success', { ...users[data.username], username: data.username });
        }
    });

    // Смена данных профиля
    socket.on('update_profile_data', (data) => {
        const u = users[data.oldUser];
        if (u) {
            u.nickname = data.nickname;
            u.bio = data.bio;
            u.password = data.password;
            if (data.newUser !== data.oldUser) {
                users[data.newUser] = u;
                delete users[data.oldUser];
            }
            io.to(data.newUser).emit('update_me', { ...u, username: data.newUser });
        }
    });

    socket.on('private_msg', (data) => {
        io.to(data.to).to(data.from).emit('msg_receive', data);
        // Сигнал для обновления списка чатов у получателя
        io.to(data.to).emit('new_chat_notification', { from: data.from });
    });

    socket.on('create_channel', (data) => {
        channels[data.tag] = { name: data.name, owner: data.owner };
        io.emit('toast', `Канал ${data.name} создан!`);
    });

    socket.on('admin_action', (data) => {
        if (data.adminPass === '565811' && users[data.target]) {
            const t = users[data.target];
            if (data.type === 'gift_nft') t.nft.push(data.val);
            if (data.type === 'set_id') t.id = data.val;
            io.to(data.target).emit('update_me', { ...t, username: data.target });
        }
    });
});

server.listen(10000, '0.0.0.0');
