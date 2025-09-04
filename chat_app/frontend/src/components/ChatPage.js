import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from './Header';
import '../App.css';
import { FaPaperPlane } from 'react-icons/fa';
import SocketIOClient from 'socket.io-client';

const ChatPage = () => {
  const { username } = useParams();
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState([]);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Connect to backend on port 5000 (separate from React dev server 3000)
    const newSocket = SocketIOClient('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      setConnected(false);
      console.error('Socket connect error:', err.message);
    });

    newSocket.on('chat', (chatMessage) => {
      console.log('Received chat message', chatMessage);
      setChats((prevChats) => [...prevChats, chatMessage]);
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      console.warn('Socket disconnected:', reason);
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      console.log('Reconnect attempt', attempt);
    });

    return () => {
      newSocket.close();
    };
  }, [setSocket]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!socket) {
      console.warn('No socket yet, ignoring submit');
      return;
    }
    if (!socket.connected) {
      console.warn('Socket not connected, cannot send');
      return;
    }
    if (message.trim()) {
      const payload = { sender: username, message };
      console.log('Emitting chat', payload);
      socket.emit('chat', payload, (ack) => {
        console.log('Ack from server (if any):', ack);
      });
      setMessage('');
    }
  };

  return (
    <main>
      <Header />
      <Link to='/' className='logout-link'>LOGOUT</Link>
      <div style={{padding: '4px 12px', fontSize: '0.8rem', color: connected ? 'green' : 'red'}}>
        Status: {connected ? 'Connected' : 'Disconnected'} {socket && socket.id ? `(id: ${socket.id})` : ''}
      </div>
      <div className='chat-container'>
        {chats.map((chat, index) => (
          <div key={index} className={chat.sender === username ? 'my-chat' : 'notmy-chat'}>
            <p>
              <span className='user'>{chat.sender === username ? `You: ${username}` : `User: ${chat.sender}`}</span>
              <span className='msg'>{chat.message}</span>
            </p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className='chatbox-container'>
        <div className='chatbox'>
          <form onSubmit={handleSubmit}>
            <input 
              type='text'
              placeholder='Enter a new message'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type='submit' disabled={!connected || !message.trim()}>
              <FaPaperPlane />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default ChatPage;
