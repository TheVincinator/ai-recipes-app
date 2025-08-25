import React, { useState } from 'react';
import axios from 'axios';

const LoginForm = ({ onLogin }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login/`, form);
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      onLogin(user);
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 max-w-sm mx-auto">
      <h2 className="text-xl mb-4">Login</h2>
      <input
        type="text"
        name="username"
        value={form.username}
        onChange={handleChange}
        placeholder="Username"
        className="block w-full p-2 mb-2 border"
      />
      <input
        type="password"
        name="password"
        value={form.password}
        onChange={handleChange}
        placeholder="Password"
        className="block w-full p-2 mb-2 border"
      />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Login
      </button>
    </form>
  );
};

export default LoginForm;
