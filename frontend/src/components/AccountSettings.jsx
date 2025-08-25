import React, { useState, useRef, useEffect } from 'react';
import api from '../axios';
import { useNavigate } from 'react-router-dom';

const AccountSettings = ({ user, onLogout }) => {
  const [form, setForm] = useState({ username: user.username, email: user.email });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const closeButtonRef = useRef(null);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      await api.put(`/api/users/${user.id}/`, form);
      setMessage('User updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setLoading(true);
    try {
      await api.delete(`/api/users/${user.id}/`);
      setShowConfirmDelete(false);
      setShowDeleteModal(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowDeleteModal(false);
    onLogout();
    // If onLogout does not redirect, uncomment next line:
    // navigate('/login');
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login'); // Redirect to login page on logout
  };

  useEffect(() => {
    if (showDeleteModal && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [showDeleteModal]);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl mb-4">Account Settings</h2>

      <form onSubmit={handleSubmit} aria-label="Account settings form">
        <label htmlFor="username" className="sr-only">Username</label>
        <input
          id="username"
          type="text"
          name="username"
          value={form.username}
          onChange={handleChange}
          className="block w-full p-2 mb-2 border"
          placeholder="Username"
          disabled={loading}
          required
        />
        <label htmlFor="email" className="sr-only">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className="block w-full p-2 mb-2 border"
          placeholder="Email"
          disabled={loading}
          required
        />

        {message && <p className="text-green-600">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}

        <div className="flex gap-4 mt-4">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update'}
          </button>

          <button
            type="button"
            className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={() => setShowConfirmDelete(true)}
            disabled={loading}
          >
            Delete Account
          </button>

          {/* New Logout button */}
          <button
            type="button"
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
            onClick={handleLogout}
            disabled={loading}
          >
            Logout
          </button>
        </div>
      </form>

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmDeleteTitle"
        >
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
            <h3 id="confirmDeleteTitle" className="text-lg font-bold mb-4">
              Confirm Delete
            </h3>
            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="bg-gray-300 px-4 py-2 rounded"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deletedTitle"
        >
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
            <h3 id="deletedTitle" className="text-lg font-bold mb-4">
              Account Deleted
            </h3>
            <p>Your account has been successfully deleted.</p>
            <button
              ref={closeButtonRef}
              onClick={closeModal}
              className="mt-6 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
