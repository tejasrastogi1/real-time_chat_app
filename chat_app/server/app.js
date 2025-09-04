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

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('chat', (data) => {
        io.emit('chat', data);
    });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000; // move backend off 3000 (CRA default)
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});