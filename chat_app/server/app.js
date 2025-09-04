const express = require('express');
const http = require('http');
const cors = require('cors');
const socketio = require('socket.io');

const app = express();

// Basic health route (prevents "Cannot GET /" confusion in browser)
app.get('/', (req, res) => {
    res.send('Real-time chat server is running');
});

// Dev CORS: allow all localhost origins (frontend might run on 3000, 3001, etc.)
app.use(cors());

const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Simple in-memory user store
const users = new Map(); // socket.id -> { username, room }

function broadcastUsers(room){
    if(!room) return;
    const list = [];
    for (const [,u] of users.entries()) {
        if (u.room === room) list.push(u.username);
    }
    console.log(`[broadcastUsers] room=${room} users=${JSON.stringify(list)}`);
    io.to(room).emit('userList', list);
}

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinRoom', ({ room, username }, cb) => {
        if (!room || !username) return;
        socket.join(room);
        users.set(socket.id, { username, room });
        console.log(`Socket ${socket.id} (${username}) joined room ${room}`);
        socket.to(room).emit('system', { type: 'system', message: `${username} joined`, room });
        broadcastUsers(room);
        if (cb) {
            // compute list after join
            const list = [];
            for (const [,u] of users.entries()) if (u.room === room) list.push(u.username);
            cb({ users: list });
        }
    });

    // Explicit user list fetch
    socket.on('getUsers', (roomName, cb) => {
        const list = [];
        for (const [,u] of users.entries()) if (u.room === roomName) list.push(u.username);
        console.log(`[getUsers] room=${roomName} => ${JSON.stringify(list)}`);
        if (cb) cb({ users: list });
    });

    socket.on('chat', (data, ack) => {
        // data: { sender, message, room }
        if (data?.room) {
            io.to(data.room).emit('chat', { ...data, timestamp: Date.now() });
        } else {
            io.emit('chat', { ...data, timestamp: Date.now() });
        }
        if (ack) ack({ status: 'ok' });
    });

    socket.on('privateMessage', ({ from, to, message }) => {
        if(!from || !to || !message) return;
        let targetId = null;
        for (const [id, u] of users.entries()) {
            if (u.username === to) { targetId = id; break; }
        }
        const payload = { from, to, message, timestamp: Date.now(), type:'private' };
        if (targetId) {
            io.to(targetId).emit('privateMessage', payload);
        }
        // echo back to sender (so they also see it)
        socket.emit('privateMessage', payload);
    });

    socket.on('disconnect', () => {
        const info = users.get(socket.id);
        if (info) {
            users.delete(socket.id);
            socket.to(info.room).emit('system', { type: 'system', message: `${info.username} left`, room: info.room });
            broadcastUsers(info.room);
        }
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000; // move backend off 3000 (CRA default)
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});