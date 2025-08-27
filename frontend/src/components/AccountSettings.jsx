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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center items-center pt-20 pb-12 px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h2>
            <p className="text-gray-600">Update your profile information</p>
          </div>

          <form onSubmit={handleSubmit} aria-label="Account settings form" className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                placeholder="Username"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                placeholder="Email"
                disabled={loading}
                required
              />
            </div>

            {message && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm">{message}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>

              <button
                type="button"
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={() => setShowConfirmDelete(true)}
                disabled={loading}
              >
                Delete Account
              </button>

              <button
                type="button"
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={handleLogout}
                disabled={loading}
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmDeleteTitle"
        >
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center">
            <h3 id="confirmDeleteTitle" className="text-2xl font-bold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete your account? This action cannot be undone.</p>
            <div className="space-y-3">
              <button
                onClick={handleDelete}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="w-full bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 text-gray-800 font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
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
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center">
            <h3 id="deletedTitle" className="text-2xl font-bold text-gray-900 mb-4">
              Account Deleted
            </h3>
            <p className="text-gray-600 mb-6">Your account has been successfully deleted.</p>
            <button
              ref={closeButtonRef}
              onClick={closeModal}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
