import React, {useEffect, useState} from 'react';
import {ApiHeader, apiHeaderOperations} from '../utils/db';
import Modal from './Modal';
import Button from './Button';

interface HeaderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number; // Project ID for project-specific headers
}

const HeaderConfigModal: React.FC<HeaderConfigModalProps> = ({ isOpen, onClose, projectId }) => {
  const [headers, setHeaders] = useState<ApiHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for adding/editing headers
  const [editingHeader, setEditingHeader] = useState<ApiHeader | null>(null);
  const [headerName, setHeaderName] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  // Load headers on component mount and when projectId changes
  useEffect(() => {
    if (!isOpen || !projectId) return;

    const loadHeaders = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load project-specific headers
        const loadedHeaders = await apiHeaderOperations.getProjectHeaders(projectId);
        setHeaders(loadedHeaders);
      } catch (err) {
        console.error('Error loading headers:', err);
        setError('Failed to load headers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadHeaders();
  }, [isOpen, projectId]);

  // Reset form state
  const resetForm = () => {
    setEditingHeader(null);
    setHeaderName('');
    setHeaderValue('');
  };

  // Set form state for editing a header
  const handleEditHeader = (header: ApiHeader) => {
    setEditingHeader(header);
    setHeaderName(header.name);
    setHeaderValue(header.value);
  };

  // Handle form submission for adding/editing a header
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!headerName.trim() || !headerValue.trim()) {
      setError('Header name and value are required.');
      return;
    }

    if (!projectId) {
      setError('Project ID is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (editingHeader) {
        // Update existing header
        await apiHeaderOperations.update(editingHeader.id!, {
          name: headerName,
          value: headerValue,
          enabled: true,
          scope: 'project',
          projectId: projectId
        });
      } else {
        // Create new header
        await apiHeaderOperations.create(
          headerName,
          headerValue,
          true, // Always enabled
          'project', // Always project-specific
          projectId
        );
      }

      // Reload headers
      const loadedHeaders = await apiHeaderOperations.getApplicableHeaders(projectId);

      setHeaders(loadedHeaders);
      resetForm();
    } catch (err) {
      console.error('Error saving header:', err);
      setError(`Failed to save header: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a header
  const handleDeleteHeader = async (header: ApiHeader) => {
    if (!confirm(`Are you sure you want to delete the header "${header.name}"?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiHeaderOperations.delete(header.id!);

      // Remove the header from the local state
      setHeaders(headers.filter(h => h.id !== header.id));
    } catch (err) {
      console.error('Error deleting header:', err);
      setError(`Failed to delete header: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <Modal
          isOpen={isOpen}
          onClose={onClose}
          title="Project Headers Configuration"
          maxWidth="2xl"
      >
          <div className="max-h-[70vh] overflow-auto">
              {error && (
                  <div
                      className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm animate-shake">
                      {error}
                  </div>
              )}

              <form onSubmit={handleSubmit} className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                          <label htmlFor="headerName"
                                 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Header Name
                          </label>
                          <input
                              type="text"
                              id="headerName"
                              value={headerName}
                              onChange={(e) => setHeaderName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                              placeholder="e.g. Authorization"
                              required
                          />
                      </div>

                      <div>
                          <label htmlFor="headerValue"
                                 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Header Value
                          </label>
                          <input
                              type="text"
                              id="headerValue"
                              value={headerValue}
                              onChange={(e) => setHeaderValue(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                              placeholder="e.g. Bearer token123"
                              required
                          />
                      </div>
                  </div>

                  <div className="flex justify-end">
                      {editingHeader && (
                          <Button
                              type="button"
                              variant="secondary"
                              onClick={resetForm}
                              disabled={isLoading}
                              className="mr-2"
                          >
                              Cancel
                          </Button>
                      )}

                      <Button
                          type="submit"
                          variant="primary"
                          isLoading={isLoading}
                          loadingText={editingHeader ? 'Updating...' : 'Adding...'}
                      >
                          {editingHeader ? 'Update Header' : 'Add Header'}
                      </Button>
                  </div>
              </form>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      {headers.length > 0 ? 'Configured Headers' : 'No headers configured'}
                  </h3>

                  {isLoading && headers.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400">Loading headers...</p>
                  ) : (
                      <div className="space-y-3">
                          {headers.map((header) => (
                              <div
                                  key={header.id}
                                  className="p-3 border rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                              >
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <div className="flex items-center">
                                              <span
                                                  className="font-medium text-gray-900 dark:text-white">{header.name}</span>
                                          </div>
                                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-all">
                                              {header.value}
                                          </div>
                                      </div>

                                      <div className="flex space-x-2">
                                          <button
                                              onClick={() => handleEditHeader(header)}
                                              className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md"
                                              title="Edit"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                                                   viewBox="0 0 20 20" fill="currentColor">
                                                  <path
                                                      d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                                              </svg>
                                          </button>

                                          <button
                                              onClick={() => handleDeleteHeader(header)}
                                              className="p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md"
                                              title="Delete"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                                                   viewBox="0 0 20 20" fill="currentColor">
                                                  <path fillRule="evenodd"
                                                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                        clipRule="evenodd"/>
                                              </svg>
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      </Modal>
  );
};

export default HeaderConfigModal;
