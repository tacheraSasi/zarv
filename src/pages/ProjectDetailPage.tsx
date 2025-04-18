import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Project, Schema, ProjectUser, projectOperations, projectUserOperations, schemaOperations, userOperations } from '../utils/db';
import { testSchemas, SchemaTestResult } from '../utils/schemaTestService';

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [batchTestResults, setBatchTestResults] = useState<Array<{ schemaId?: number; schemaName: string; result: SchemaTestResult }> | null>(null);
  const [isTestingSchemas, setIsTestingSchemas] = useState(false);
  const [projectUsers, setProjectUsers] = useState<Array<{ projectUser: ProjectUser; user: { id: number; name: string; email: string } }>>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUserOwner, setIsUserOwner] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Load project and schemas on component mount
  useEffect(() => {
    const loadProjectAndSchemas = async () => {
      if (!projectId || !currentUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const projectData = await projectOperations.getById(parseInt(projectId));

        if (!projectData) {
          setError('Project not found');
          setIsLoading(false);
          return;
        }

        // Check if the user has access to the project
        const isInProject = await projectUserOperations.isUserInProject(parseInt(projectId), currentUser.id);
        if (!isInProject) {
          setError('You do not have permission to view this project');
          setIsLoading(false);
          return;
        }

        // Check if the user is the project owner
        const isOwner = await projectUserOperations.isProjectOwner(parseInt(projectId), currentUser.id);
        setIsUserOwner(isOwner);

        setProject(projectData);
        setEditedName(projectData.name);
        setEditedDescription(projectData.description || '');

        // Load schemas for this project
        const projectSchemas = await schemaOperations.getByProjectId(parseInt(projectId));
        setSchemas(projectSchemas);

        // Load project users
        const projectUsersList = await projectUserOperations.getProjectUsers(parseInt(projectId));

        // Get user details for each project user
        const projectUsersWithDetails = await Promise.all(
          projectUsersList.map(async (pu) => {
            const user = await userOperations.getById(pu.userId);
            return {
              projectUser: pu,
              user: user ? { id: user.id!, name: user.name, email: user.email } : { id: pu.userId, name: 'Unknown', email: 'unknown' }
            };
          })
        );
        setProjectUsers(projectUsersWithDetails);

        // If user is owner, load available users (users not already in the project)
        if (isOwner) {
          const allUsers = await userOperations.getAll();
          const projectUserIds = projectUsersList.map(pu => pu.userId);
          const availableUsersList = allUsers
            .filter(user => !projectUserIds.includes(user.id!))
            .map(user => ({ id: user.id!, name: user.name, email: user.email }));
          setAvailableUsers(availableUsersList);
        }
      } catch (err) {
        console.error('Error loading project:', err);
        setError('Failed to load project details');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectAndSchemas();
  }, [projectId, currentUser]);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!project?.id || !currentUser?.id) {
      setError('Project not found or user not logged in');
      return;
    }

    if (!editedName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      await projectOperations.update(project.id, currentUser.id, {
        name: editedName.trim(),
        description: editedDescription.trim() || undefined
      });

      // Update local state
      setProject({
        ...project,
        name: editedName.trim(),
        description: editedDescription.trim() || undefined,
        updatedAt: new Date()
      });

      setIsEditing(false);
      setError('');
    } catch (err) {
      console.error('Error updating project:', err);
      setError('Failed to update project: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddUser = async () => {
    if (!project?.id || !currentUser?.id || selectedUserId === '') {
      setError('Invalid project, user, or selection');
      return;
    }

    try {
      // Check if current user is the owner
      if (!isUserOwner) {
        setError('Only the project owner can add users');
        return;
      }

      // Add the user to the project
      await projectUserOperations.addUserToProject(project.id, selectedUserId as number, 'member');

      // Refresh project users
      const projectUsersList = await projectUserOperations.getProjectUsers(project.id);
      const projectUsersWithDetails = await Promise.all(
        projectUsersList.map(async (pu) => {
          const user = await userOperations.getById(pu.userId);
          return {
            projectUser: pu,
            user: user ? { id: user.id!, name: user.name, email: user.email } : { id: pu.userId, name: 'Unknown', email: 'unknown' }
          };
        })
      );
      setProjectUsers(projectUsersWithDetails);

      // Update available users
      const allUsers = await userOperations.getAll();
      const projectUserIds = projectUsersList.map(pu => pu.userId);
      const availableUsersList = allUsers
        .filter(user => !projectUserIds.includes(user.id!))
        .map(user => ({ id: user.id!, name: user.name, email: user.email }));
      setAvailableUsers(availableUsersList);

      // Reset form
      setSelectedUserId('');
      setIsAddingUser(false);
      setError('');
    } catch (err) {
      console.error('Error adding user to project:', err);
      setError('Failed to add user: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!project?.id || !currentUser?.id) {
      setError('Invalid project or user');
      return;
    }

    if (!confirm('Are you sure you want to remove this user from the project?')) {
      return;
    }

    try {
      // Check if current user is the owner
      if (!isUserOwner) {
        setError('Only the project owner can remove users');
        return;
      }

      // Remove the user from the project
      await projectUserOperations.removeUserFromProject(project.id, userId);

      // Refresh project users
      const projectUsersList = await projectUserOperations.getProjectUsers(project.id);
      const projectUsersWithDetails = await Promise.all(
        projectUsersList.map(async (pu) => {
          const user = await userOperations.getById(pu.userId);
          return {
            projectUser: pu,
            user: user ? { id: user.id!, name: user.name, email: user.email } : { id: pu.userId, name: 'Unknown', email: 'unknown' }
          };
        })
      );
      setProjectUsers(projectUsersWithDetails);

      // Update available users
      const allUsers = await userOperations.getAll();
      const projectUserIds = projectUsersList.map(pu => pu.userId);
      const availableUsersList = allUsers
        .filter(user => !projectUserIds.includes(user.id!))
        .map(user => ({ id: user.id!, name: user.name, email: user.email }));
      setAvailableUsers(availableUsersList);

      setError('');
    } catch (err) {
      console.error('Error removing user from project:', err);
      setError('Failed to remove user: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteSchema = async (schemaId: number) => {
    if (!confirm('Are you sure you want to delete this schema? This action cannot be undone.')) {
      return;
    }

    try {
      await schemaOperations.delete(schemaId);
      // Remove the deleted schema from the state
      setSchemas(schemas.filter(schema => schema.id !== schemaId));
    } catch (err) {
      console.error('Error deleting schema:', err);
      setError('Failed to delete schema');
    }
  };

  const handleBatchTest = async () => {
    if (schemas.length === 0) {
      return;
    }

    if (!confirm('Run tests for all schemas in this project?')) {
      return;
    }

    setIsTestingSchemas(true);
    setBatchTestResults(null);
    setError('');

    try {
      // Run tests for all schemas
      const results = await testSchemas(schemas);
      setBatchTestResults(results);
    } catch (err) {
      console.error('Error running batch tests:', err);
      setError('Failed to run batch tests');
    } finally {
      setIsTestingSchemas(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading project details...</p>
        </div>
      </Layout>
    );
  }

  if (error && !project) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <div className="mt-4">
          <Link
            to="/projects"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <Link
            to="/projects"
            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {project && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-8">
            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleUpdateProject}>
                  <div className="mb-4">
                    <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project Name
                    </label>
                    <input
                      id="projectName"
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      id="projectDescription"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedName(project.name);
                        setEditedDescription(project.description || '');
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {project.name}
                      </h1>
                      {project.description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {project.description}
                        </p>
                      )}
                      <div className="text-sm text-gray-500 dark:text-gray-500">
                        <p>Created: {formatDate(project.createdAt)}</p>
                        <p>Last updated: {formatDate(project.updatedAt)}</p>
                      </div>
                    </div>
                    {isUserOwner && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      >
                        Edit Project
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Project Users Section */}
        <div className="mb-8">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Project Members
            </h2>
            {isUserOwner && (
              <button
                onClick={() => setIsAddingUser(!isAddingUser)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isAddingUser ? 'Cancel' : 'Add User'}
              </button>
            )}
          </div>

          {isAddingUser && isUserOwner && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add User to Project</h3>
              <div className="flex space-x-4">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                  className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a user</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                  ))}
                </select>
                <button
                  onClick={handleAddUser}
                  disabled={selectedUserId === ''}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {availableUsers.length === 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  No more users available to add to this project.
                </p>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
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
                    Role
                  </th>
                  {isUserOwner && (
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {projectUsers.map((pu) => (
                  <tr key={pu.projectUser.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {pu.user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {pu.user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        pu.projectUser.role === 'owner' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {pu.projectUser.role === 'owner' ? 'Owner' : 'Member'}
                      </span>
                    </td>
                    {isUserOwner && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {pu.projectUser.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveUser(pu.user.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Schemas Section */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Schemas
          </h2>
          <Link
            to={`/projects/${projectId}/schemas/new`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Schema
          </Link>
        </div>

        {schemas.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">This project doesn't have any schemas yet.</p>
            <Link
              to={`/projects/${projectId}/schemas/new`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Your First Schema
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schemas.map((schema) => (
              <div key={schema.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {schema.name}
                  </h3>
                  {schema.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {schema.description}
                    </p>
                  )}
                  {schema.endpointUrl && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                      Endpoint: {schema.endpointUrl}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Last updated: {formatDate(schema.updatedAt)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-between">
                  <Link
                    to={`/projects/${projectId}/schemas/${schema.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => schema.id && handleDeleteSchema(schema.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleBatchTest}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            disabled={schemas.length === 0 || isTestingSchemas}
          >
            {isTestingSchemas ? 'Testing Schemas...' : 'Run Tests for All Schemas'}
          </button>
        </div>

        {batchTestResults && batchTestResults.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Batch Test Results
            </h3>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {batchTestResults.filter(r => r.result.success).length} Passed
                </span>
                <div className="w-4 h-4 rounded-full bg-red-500 mx-4 mr-2"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {batchTestResults.filter(r => !r.result.success).length} Failed
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {batchTestResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-md ${
                    result.result.success 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {result.result.success ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <h4 className="font-semibold text-gray-900 dark:text-white">{result.schemaName}</h4>
                    </div>
                    {result.schemaId && (
                      <Link
                        to={`/projects/${projectId}/schemas/${result.schemaId}`}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Schema
                      </Link>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {result.result.message}
                  </p>

                  {result.result.responseStatus && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Status: {result.result.responseStatus} {result.result.responseStatusText}
                    </p>
                  )}

                  {result.result.validationResult && !result.result.validationResult.isValid && result.result.validationResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                        Show Validation Errors ({result.result.validationResult.errors.length})
                      </summary>
                      <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {result.result.validationResult.errors.map((error, errorIndex) => (
                          <li key={errorIndex}>
                            <span className="font-medium">{error.path.length > 0 ? error.path.join('.') : 'root'}:</span> {error.message}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectDetailPage;
