import React, {useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';
import Layout from '../components/Layout';
import {useAuth} from '../contexts/AuthContext';
import {User, userOperations} from '../utils/db';

const UserManagementPage: React.FC = () => {
  const { isAdmin, currentUser, inviteUser, updateUser, deleteUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState<'frontend' | 'backend'>('frontend');
  const [password, setPassword] = useState('');

  // Edit form state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPosition, setEditPosition] = useState<'frontend' | 'backend'>('frontend');

  // Delete confirmation state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/projects" replace />;
  }

  // Load all users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await userOperations.getAll();
        setUsers(allUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [success]);

  // Open edit form for a user
  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPosition(user.position);
    setError('');
  };

  // Close edit form
  const handleEditCancel = () => {
    setEditingUser(null);
    setError('');
  };

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!editingUser || !editingUser.id) {
        setError('Invalid user data');
        return;
      }

      const result = await updateUser(editingUser.id, {
        name: editName,
        email: editEmail,
        position: editPosition
      });

      if (result.success) {
        setSuccess(`User ${editName} has been updated successfully.`);
        setEditingUser(null);
      } else {
        setError(result.error || 'Failed to update user');
      }
    } catch (err) {
      setError('An error occurred while updating the user');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open delete confirmation for a user
  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
    setError('');
  };

  // Close delete confirmation
  const handleDeleteCancel = () => {
    setDeletingUser(null);
    setError('');
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      if (!deletingUser || !deletingUser.id) {
        setError('Invalid user data');
        return;
      }

      // Check if trying to delete current user
      if (currentUser && currentUser.id === deletingUser.id) {
        setError('You cannot delete your own account');
        setDeletingUser(null);
        setIsSubmitting(false);
        return;
      }

      const result = await deleteUser(deletingUser.id);

      if (result.success) {
        setSuccess(`User ${deletingUser.name} has been deleted successfully.`);
        setDeletingUser(null);
      } else {
        setError(result.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('An error occurred while deleting the user');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // Generate a random password if not provided
      const finalPassword = password || Math.random().toString(36).slice(-8);

      const result = await inviteUser(email, name, position, finalPassword);

      if (result.success) {
        setSuccess(`User ${name} (${email}) has been invited successfully.`);
        // Clear form and close modal
        setEmail('');
        setName('');
        setPosition('frontend');
        setPassword('');
        setIsInviteModalOpen(false);
      } else {
        setError(result.error || 'Failed to invite user');
      }
    } catch (err) {
      setError('An error occurred while inviting the user');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Management</h1>

        {/* User Management Header */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Management</h2>
            <button
                onClick={() => {
                  setError('');
                  setIsInviteModalOpen(true);
                }}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Invite New User
            </button>
          </div>

          {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
              {error}
            </div>
          )}

          {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mt-4">
              {success}
            </div>
          )}
        </div>

        {/* User List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">User List</h2>

          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Position
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Projects
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.numberOfProjects}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.isAdmin ? 'Admin' : 'User'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                        >
                          Edit
                        </button>
                        {!user.isAdmin && currentUser && user.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600/60  flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Edit User</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  id="editName"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="editPosition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Position
                </label>
                <select
                  id="editPosition"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value as 'frontend' | 'backend')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="frontend">Frontend</option>
                  <option value="backend">Backend</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleEditCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 bg-gray-600/60  flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Confirm Deletion</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the user <span className="font-semibold">{deletingUser.name}</span> ({deletingUser.email})? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {isInviteModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invite New User</h2>
                <button
                    onClick={() => {
                      setError('');
                      setIsInviteModalOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                    />
                  </div>

                  <div>
                    <label htmlFor="position"
                           className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Position
                    </label>
                    <select
                        id="position"
                        value={position}
                        onChange={(e) => setPosition(e.target.value as 'frontend' | 'backend')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                    >
                      <option value="frontend">Frontend</option>
                      <option value="backend">Backend</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="password"
                           className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Initial Password (optional)
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Leave empty to generate random password"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setIsInviteModalOpen(false);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Inviting User...' : 'Invite User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
      )}
    </Layout>
  );
};

export default UserManagementPage;
