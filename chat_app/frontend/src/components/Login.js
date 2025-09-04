import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import { Link } from 'react-router-dom';
import Header from './Header';

const Login = () => {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() === '') {
      alert('Please enter a username!');
      return;
    }
  localStorage.setItem('username', username.trim());
  localStorage.setItem('room', room.trim());
  navigate(`/chat/${room.trim()}/${username.trim()}`);
  };

  return (
    <main>
    <Header/>
      <div className='form-container'>
        <form onSubmit={handleLogin} className='login-form'>
          <input
            type='text'
            placeholder='Enter your username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            style={{ marginLeft: '10px' }}
            type='text'
            placeholder='Room (e.g. general)'
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            required
          />
          <button style={{ marginLeft: '10px' }} type='submit' className='login-link'>JOIN</button>
        </form>
      </div>
      </main>
  );
}

export default Login;
