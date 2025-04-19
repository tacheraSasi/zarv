import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Project, Schema, projectOperations, projectUserOperations, schemaOperations, resetDatabase } from '../utils/db';
import SchemaEditor from '../components/SchemaEditor';
import SchemaActions from '../components/SchemaActions';

const SchemaFormPage: React.FC = () => {
  const { projectId, schemaId } = useParams<{ projectId: string; schemaId: string }>();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [schemaDefinition, setSchemaDefinition] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Check if we're in edit mode by looking at the URL path
  const isEditMode = location.pathname.includes('/edit');

  // Load project and schema (if editing) on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId || !currentUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Load project
        const projectData = await projectOperations.getById(parseInt(projectId));

        if (!projectData) {
          setError('Project not found');
          setIsLoading(false);
          return;
        }

        // Verify that the user has access to the project
        const hasAccess = await projectUserOperations.isUserInProject(parseInt(projectId), currentUser.id);
        if (!hasAccess) {
          setError('You do not have permission to access this project');
          setIsLoading(false);
          return;
        }

        setProject(projectData);

        // If editing an existing schema, load it
        if (isEditMode && schemaId) {
          const schemaData = await schemaOperations.getById(parseInt(schemaId));

          if (!schemaData) {
            setError('Schema not found');
            setIsLoading(false);
            return;
          }

          // Verify that the schema belongs to the current project
          if (schemaData.projectId !== parseInt(projectId)) {
            setError('Schema does not belong to this project');
            setIsLoading(false);
            return;
          }

          setSchema(schemaData);
          setName(schemaData.name);
          setDescription(schemaData.description || '');
          setEndpointUrl(schemaData.endpointUrl || '');
          setSchemaDefinition(schemaData.schemaDefinition);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId, schemaId, currentUser, isEditMode]);

  const handleResetDatabase = async () => {
    if (!confirm('This will delete all projects, schemas, and users except the admin. Are you sure you want to continue?')) {
      return;
    }

    setIsResetting(true);
    setError('');

    try {
      await resetDatabase();
      setError('Database reset successful. The admin user has been preserved. Please log in again.');
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Error resetting database:', err);
      setError('Failed to reset database: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      setError('Project ID is required');
      return;
    }

    if (!name.trim()) {
      setError('Schema name is required');
      return;
    }

    if (!schemaDefinition.trim()) {
      setError('Schema definition is required');
      return;
    }

    if (!currentUser?.id) {
      setError('You must be logged in to save a schema');
      return;
    }

    try {
      // Check if the SCHEMA_VERSIONS store exists in the database
      let needsDatabaseUpgrade = false;
      try {
        // Use a Promise to properly wait for the database check
        needsDatabaseUpgrade = await new Promise<boolean>((resolve, reject) => {
          const dbRequest = indexedDB.open('SchemaManagerDatabase');

          dbRequest.onerror = (event) => {
            console.error('Error opening database for version check:', dbRequest.error);
            // If we can't open the database, assume it needs an upgrade
            resolve(true);
          };

          dbRequest.onsuccess = (event) => {
            const database = dbRequest.result;
            const needsUpgrade = !database.objectStoreNames.contains('schemaVersions');
            console.log('Database version check - SCHEMA_VERSIONS exists:', !needsUpgrade);
            database.close();
            resolve(needsUpgrade);
          };
        });
      } catch (dbError) {
        console.error('Error checking database:', dbError);
        // If we can't check the database, assume it needs an upgrade
        needsDatabaseUpgrade = true;
      }

      if (isEditMode && schemaId) {
        // Update existing schema
         await schemaOperations.update(parseInt(schemaId), {
          name: name.trim(),
          description: description.trim() || undefined,
          endpointUrl: endpointUrl.trim() || undefined,
          schemaDefinition: schemaDefinition.trim()
        }, currentUser.id); // Pass the current user ID

        if (needsDatabaseUpgrade) {
          setError('Schema saved successfully, but version history could not be saved. Please reload the application to upgrade the database.');
        } else {
          navigate(`/projects/${projectId}/schemas/${schemaId}`);
        }
      } else {
        // Create new schema
        const newSchemaId = await schemaOperations.create(
          parseInt(projectId),
          name.trim(),
          schemaDefinition.trim(),
          description.trim() || undefined,
          endpointUrl.trim() || undefined,
          currentUser.id // Pass the current user ID
        );

        if (needsDatabaseUpgrade) {
          setError('Schema saved successfully, but version history could not be saved. Please reload the application to upgrade the database.');
        } else {
          navigate(`/projects/${projectId}/schemas/${newSchemaId}`);
        }
      }

    } catch (err) {
      console.error('Error saving schema:', err);

      // Handle specific error cases with more informative messages
      if (err instanceof Error) {
        if (err.message.includes('Failed to execute \'transaction\' on \'IDBDatabase\': One of the specified object stores was not found')) {
          setError('Schema could not be saved because the database needs to be upgraded. Please reload the application and try again.');
        } else if (err.message.includes('QUOTA_BYTES_PER_ITEM quota exceeded') ||
                  err.message.includes('QuotaExceededError') ||
                  err.message.toLowerCase().includes('quota')) {
          // The schema was likely saved, but version history couldn't be saved due to quota limits
          setError('Schema saved successfully, but version history could not be saved due to browser storage limits. ' +
                  'This typically happens with very large schemas. The schema functionality will work normally, ' +
                  'but version history may be limited or unavailable for this schema.');

          // Navigate to the schema detail page after a delay to show the message
          setTimeout(() => {
            if (isEditMode && schemaId) {
              navigate(`/projects/${projectId}/schemas/${schemaId}`);
            } else {
              // For new schemas, we don't have the ID, so navigate back to the project
              navigate(`/projects/${projectId}`);
            }
          }, 5000); // 5 second delay to allow user to read the message
        } else {
          setError('Failed to save schema: ' + err.message);
        }
      } else {
        setError('Failed to save schema: ' + String(err));
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <Link
            to={`/projects/${projectId}`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Project
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {isEditMode ? 'Edit Schema' : 'Create New Schema'}
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>

            {error.includes('database needs to be upgraded') || error.includes('version history could not be saved') ? (
              <div className="mt-3">
                <p className="text-sm mb-2">
                  To fix this issue, you can either:
                </p>
                <ul className="list-disc pl-5 text-sm mb-2">
                  <li>Reload the page to upgrade the database</li>
                  <li>Reset the database (this will delete all data except the admin user)</li>
                </ul>
                <div className="flex space-x-2 mt-3">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Reload Page
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDatabase}
                    disabled={isResetting}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {isResetting ? 'Resetting...' : 'Reset Database'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Schema Name
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

            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="endpointUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endpoint URL (optional)
              </label>
              <input
                id="endpointUrl"
                type="url"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="schemaDefinition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Schema Definition
              </label>
              <SchemaEditor
                value={schemaDefinition}
                onChange={setSchemaDefinition}
                height="400px"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter your schema definition in Zod format. Use auto-completion for Zod methods by typing 'z.' or pressing Ctrl+Space.
              </p>
              <SchemaActions
                schemaDefinition={schemaDefinition}
                schemaName={name || "new_schema"}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Link
                to={`/projects/${projectId}`}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isEditMode ? 'Update Schema' : 'Create Schema'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default SchemaFormPage;
