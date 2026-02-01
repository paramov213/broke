const socket = io();
let me = JSON.parse(localStorage.getItem('tg_ios_vfinal'));
let activeChat = null, localStream, peerConnection;
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

if (me) socket.emit('auth', me);

function auth() {
    const data = { username: document.getElementById('l-u').value, password: document.getElementById('l-p').value };
    socket.emit('auth', data); me = data;
}

socket.on('auth_success', (data) => {
    me = {...me, ...data}; localStorage.setItem('tg_ios_vfinal', JSON.stringify(me));
    document.getElementById('auth-layer').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('dr-name').innerText = me.nickname;
    document.getElementById('my-ava').innerText = me.nickname[0];
    if(me.username === 'admin') document.getElementById('adm-btn').classList.remove('hidden');
});

function toggleDr() { document.getElementById('drawer').classList.toggle('open'); }

async function startCall() {
    if(!activeChat) return;
    document.getElementById('call-screen').classList.remove('hidden');
    document.getElementById('call-name').innerText = activeChat;
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
    peerConnection.ontrack = e => document.getElementById('remote-audio').srcObject = e.streams[0];
    peerConnection.onicecandidate = e => e.candidate && socket.emit('ice_candidate', { to: activeChat, candidate: e.candidate });
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('call_user', { to: activeChat, from: me.username, signal: offer });
}

socket.on('incoming_call', async (data) => {
    if(confirm("Call from " + data.from + "?")) {
        document.getElementById('call-screen').classList.remove('hidden');
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        peerConnection = new RTCPeerConnection(rtcConfig);
        localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
        peerConnection.ontrack = e => document.getElementById('remote-audio').srcObject = e.streams[0];
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        const ans = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(ans);
        socket.emit('answer_call', { to: data.from, signal: ans });
    }
});

socket.on('call_accepted', s => peerConnection.setRemoteDescription(new RTCSessionDescription(s)));
socket.on('ice_candidate', c => peerConnection && peerConnection.addIceCandidate(new RTCIceCandidate(c)));

function endCall() { location.reload(); }

function send() {
    const text = document.getElementById('m-input').value;
    if(text && activeChat) socket.emit('send_msg', { from: me.username, to: activeChat, text });
    document.getElementById('m-input').value = '';
}

socket.on('render_msg', (data) => {
    if(activeChat === data.from || activeChat === data.to) {
        const side = data.from === me.username ? 'out' : 'in';
        document.getElementById('messages').innerHTML += `<div class="bubble ${side}">${data.text}<span style="font-size:10px;opacity:0.5;margin-left:8px">${data.time}</span></div>`;
        const m = document.getElementById('messages'); m.scrollTop = m.scrollHeight;
    }
});

function view(n) {
    if(n === 'profile') document.getElementById('profile-modal').classList.remove('hidden');
    if(n.includes('close')) document.querySelectorAll('.ios-modal').forEach(m => m.classList.add('hidden'));
    if(!n.includes('close')) toggleDr();
}
