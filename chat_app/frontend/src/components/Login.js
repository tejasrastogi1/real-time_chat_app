import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import { Link } from 'react-router-dom';
import Header from './Header';

const Login = () => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() === '') {
      alert('Please enter a username!');
      return;
    }
    localStorage.setItem('username', username.trim());
    navigate(`/chat/${username.trim()}`);
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
          <button type='submit' className='login-link'>LOGIN</button>
        </form>
      </div>
      </main>
  );
}

export default Login;
