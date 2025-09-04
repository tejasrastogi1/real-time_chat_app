import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from './Header';
import '../App.css';
import { FaPaperPlane } from 'react-icons/fa';
import SocketIOClient from 'socket.io-client';

const ChatPage = () => {
  const { room, username } = useParams();
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState([]); // visible messages (room or private)
  const [roomMessages, setRoomMessages] = useState([]); // all room messages
  const [privateMessages, setPrivateMessages] = useState({}); // { otherUser: [msgs] }
  const [users, setUsers] = useState([]); // other users in room
  const [mode, setMode] = useState('room'); // 'room' | 'private'
  const [activeUser, setActiveUser] = useState(null); // recipient when private
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
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
      if (chatMessage.room && chatMessage.room !== room) return;
      const msg = { ...chatMessage, type: 'user' };
      setRoomMessages(prev => [...prev, msg]);
    });
    newSocket.on('system', (sysMessage) => {
      if (sysMessage.room && sysMessage.room !== room) return;
      const msg = { ...sysMessage, type: 'system' };
      setRoomMessages(prev => [...prev, msg]);
    });
    newSocket.on('userList', (list) => {
  console.log('userList event received', list);
  setUsers(list.filter(u => u !== username));
    });
    newSocket.on('privateMessage', (payload) => {
      const other = payload.from === username ? payload.to : payload.from;
      setPrivateMessages(prev => ({
        ...prev,
        [other]: [...(prev[other] || []), payload]
      }));
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

  // Emit joinRoom only after listeners are mounted & socket connected
  useEffect(() => {
    if (socket && connected) {
      console.log('Emitting joinRoom now');
      socket.emit('joinRoom', { room, username }, (data) => {
        if (data?.users) {
          setUsers(data.users.filter(u => u !== username));
          console.log('Initial users list', data.users);
        }
      });
    }
  }, [socket, connected, room, username]);

  // Poll for users if none appear (helps in case first broadcast was missed)
  useEffect(() => {
    if (!socket || !connected) return;
    if (users.length > 0) return; // have users
    if (pollAttempts >= 5) return; // stop after 5 tries
    const id = setTimeout(() => {
      console.log('Polling for users attempt', pollAttempts + 1);
      socket.emit('getUsers', room, (data) => {
        if (data?.users) {
          console.log('getUsers response', data.users);
          setUsers(data.users.filter(u => u !== username));
        }
      });
      setPollAttempts(a => a + 1);
    }, 1500);
    return () => clearTimeout(id);
  }, [socket, connected, users.length, pollAttempts, room, username]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats]);

  useEffect(() => {
    if(mode === 'room') {
      setChats(roomMessages);
    } else if (mode === 'private' && activeUser){
      setChats(privateMessages[activeUser] || []);
    }
  }, [mode, activeUser, roomMessages, privateMessages]);

  const startPrivate = useCallback((user) => {
    setMode('private');
    setActiveUser(user);
  }, []);
  const backToRoom = () => { setMode('room'); setActiveUser(null); };

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
      if(mode === 'room') {
        const payload = { sender: username, message, room };
        console.log('Emitting room chat', payload);
        socket.emit('chat', payload);
      } else if(mode === 'private' && activeUser) {
        const payload = { from: username, to: activeUser, message };
        console.log('Emitting private message', payload);
        socket.emit('privateMessage', payload);
      }
      setMessage('');
    }
  };

  return (
    <main>
      <Header />
      <Link to='/' className='logout-link'>LOGOUT</Link>
      <div style={{padding: '4px 12px', fontSize: '0.8rem', color: connected ? 'green' : 'red', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span>Status: {connected ? 'Connected' : 'Disconnected'} {socket && socket.id ? `(id: ${socket.id})` : ''}</span>
        <span style={{color:'#ccc'}}>Room: {room}</span>
      </div>
      <div className='chat-layout'>
        <aside className='sidebar'>
          <div className='sidebar-header'>
            <strong>{username}</strong>
            <div style={{marginTop:4, fontSize:'0.7rem'}}>Mode: {mode === 'room' ? 'Room' : `Private (${activeUser})`}</div>
          </div>
          <div className='sidebar-section'>
            <button type='button' className='sidebar-btn' onClick={backToRoom} disabled={mode==='room'}># {room}</button>
          </div>
          <div className='sidebar-section users'>
            <div className='section-title'>Users</div>
            {users.length === 0 && <div className='empty'>No others</div>}
            {users.map(u => (
              <button type='button' key={u} className={`user-btn ${activeUser===u && mode==='private' ? 'active' : ''}`} onClick={() => startPrivate(u)}>{u}</button>
            ))}
          </div>
        </aside>
        <div className='chat-container'>
          {chats.map((chat, index) => {
            if (chat.type === 'system') {
              return (
                <div key={index} className='system-chat'>
                  <p><em>{chat.message}</em></p>
                </div>
              );
            }
            const isMine = chat.sender === username || chat.from === username;
            const sender = chat.sender || chat.from;
            return (
              <div key={index} className={isMine ? 'my-chat' : 'notmy-chat'}>
                <p>
                  <span className='user'>{isMine ? `You: ${username}` : `User: ${sender}`}{chat.type==='private' && ' (private)'}</span>
                  <span className='msg'>{chat.message}</span>
                </p>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
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
