const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = {}; 
let channels = {}; 

io.on('connection', (socket) => {
    // Авторизация
    socket.on('auth', (data) => {
        if (!users[data.username]) {
            users[data.username] = { 
                password: data.password, 
                nickname: data.username,
                bio: "Пользователь BROKE", nft: [], id: null 
            };
        }
        if (users[data.username].password === data.password) {
            socket.emit('auth_success', users[data.username]);
        } else {
            socket.emit('auth_error', 'Ошибка входа');
        }
    });

    // Админ-панель (NFT, ID, Накрутка)
    socket.on('admin_action', (data) => {
        if (data.adminPass === '565811') {
            const target = users[data.targetUser];
            if (target) {
                if (data.type === 'gift_nft') target.nft.push(data.nftUrl);
                if (data.type === 'set_id') target.id = data.newId;
                io.emit('update_profile', {username: data.targetUser, data: target});
            }
            if (data.type === 'boost' && channels[data.channelTag]) {
                channels[data.channelTag].subs += parseInt(data.amount);
                io.emit('update_channel_stats', { tag: data.channelTag, subs: channels[data.channelTag].subs });
            }
        }
    });

    // Каналы и посты
    socket.on('create_channel', (data) => {
        if (!channels[data.username]) {
            channels[data.username] = { name: data.name, owner: data.owner, subs: 0, posts: [] };
            io.emit('channel_list_update', channels);
        }
    });

    socket.on('send_post', (data) => {
        if (channels[data.tag] && channels[data.tag].owner === data.username) {
            const post = { id: Date.now(), text: data.text, comments: [] };
            channels[data.tag].posts.push(post);
            io.emit('new_post', { tag: data.tag, post: post });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`BROKE Server on port ${PORT}`));