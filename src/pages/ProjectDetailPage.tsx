import React, {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import Layout from '../components/Layout';
import {useAuth} from '../contexts/AuthContext';
import {
    Project,
    projectOperations,
    ProjectUser,
    projectUserOperations,
    resourceOperations,
    Schema,
    schemaOperations,
    userOperations
} from '../utils/db';
import {SchemaTestResult, testSchemas} from '../utils/schemaTestService';
import HeaderConfigModal from '../components/HeaderConfigModal';
import ResourceModal from '../components/ResourceModal';
import ProjectModal from '../components/ProjectModal';
import Button from "../components/Button.tsx";
import emptyResourcesIllustration from '../assets/illustrations/empty-resources.svg';
import emptyMembersIllustration from '../assets/illustrations/empty-members.svg';

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [schemas, setSchemas] = useState<Schema[]>([]);
    const [groupedSchemas, setGroupedSchemas] = useState<Record<string, Schema[]>>({});
    const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [batchTestResults, setBatchTestResults] = useState<Array<{ schemaId?: number; schemaName: string; result: SchemaTestResult }> | null>(null);
  const [isTestingSchemas, setIsTestingSchemas] = useState(false);
  const [projectUsers, setProjectUsers] = useState<Array<{ projectUser: ProjectUser; user: { id: number; name: string; email: string } }>>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUserOwner, setIsUserOwner] = useState(false);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'resources' | 'members'>('resources');
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

        // Load schemas for this project
        const projectSchemas = await schemaOperations.getByProjectId(parseInt(projectId));
        setSchemas(projectSchemas);

          // Group schemas by resource
          const grouped: Record<string, Schema[]> = {};

          projectSchemas.forEach(schema => {
              const resource = schema.resource || 'Uncategorized';
              if (!grouped[resource]) {
                  grouped[resource] = [];
              }
              grouped[resource].push(schema);
          });

          setGroupedSchemas(grouped);

          // Load resources for this project
          try {
              const projectResources = await resourceOperations.getByProjectId(parseInt(projectId));
              setResources(projectResources);
          } catch (resourceErr) {
              console.error('Error loading resources:', resourceErr);
              // Don't fail the whole operation if resources can't be loaded
          }

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

        // Reset form and close modal
      setSelectedUserId('');
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

        // Find the schema to be deleted
        const schemaToDelete = schemas.find(schema => schema.id === schemaId);

      // Remove the deleted schema from the state
        const updatedSchemas = schemas.filter(schema => schema.id !== schemaId);
        setSchemas(updatedSchemas);

        // Update grouped schemas
        if (schemaToDelete) {
            const resource = schemaToDelete.resource || 'Uncategorized';
            const updatedGrouped = {...groupedSchemas};

            if (updatedGrouped[resource]) {
                updatedGrouped[resource] = updatedGrouped[resource].filter(schema => schema.id !== schemaId);

                // If this was the last schema in the resource, remove the resource
                if (updatedGrouped[resource].length === 0) {
                    delete updatedGrouped[resource];
                }

                setGroupedSchemas(updatedGrouped);
            }
        }
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

    const handleProjectSuccess = async (projectId: number) => {
        if (!currentUser?.id) return;

        try {
            // Reload project data
            const projectData = await projectOperations.getById(parseInt(projectId.toString()));
            if (projectData) {
                setProject(projectData);
            }
        } catch (err) {
            console.error('Error reloading project:', err);
            setError('Failed to reload project details');
        }
    };

    const handleDeleteProject = async () => {
        if (!project?.id || !currentUser?.id) {
            setError('Project not found or user not logged in');
            return;
        }

        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            return;
        }

        try {
            await projectOperations.delete(project.id, currentUser.id);
            // Navigate back to projects page
            navigate('/projects');
        } catch (err) {
            console.error('Error deleting project:', err);
            setError('Failed to delete project: ' + (err instanceof Error ? err.message : String(err)));
        }
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
                    <div className="flex space-x-2">
                        {isUserOwner && (
                            <>
                                <button
                                    onClick={() => setIsProjectModalOpen(true)}
                                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                    Edit Project
                                </button>
                                <button
                                    onClick={handleDeleteProject}
                                    className="px-3 py-1 border border-red-300 dark:border-red-600 rounded-md text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 text-sm"
                                >
                                    Delete Project
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setIsHeaderModalOpen(true)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center"
                            title="Configure API Headers"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20"
                                 fill="currentColor">
                                <path fillRule="evenodd"
                                      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                      clipRule="evenodd"/>
                            </svg>
                            API Headers
                        </button>
                    </div>
                </div>
            </div>
          </div>
        )}

          {/* Tab Navigation */}
          {project && (
              <div className="mb-6">
                  <div className="border-b border-gray-200 dark:border-gray-700">
                      <nav className="-mb-px flex">
                          <button
                              onClick={() => setActiveTab('resources')}
                              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                                  activeTab === 'resources'
                                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                              }`}
                          >
                              Resources
                          </button>
                          <button
                              onClick={() => setActiveTab('members')}
                              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                                  activeTab === 'members'
                                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                              }`}
                          >
                              Members
                          </button>
                      </nav>
                  </div>
              </div>
          )}

          {/* Tab Content */}
          {activeTab === 'members' && (
              <div className="mb-8">
                  <div className="mb-6 flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Project Members
                      </h2>
                      {isUserOwner && (
                          <button
                              onClick={() => {
                                  setError('');
                                  setIsMemberModalOpen(true);
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                              Add Member
                          </button>
                      )}
                  </div>

                  {/* Check if there are only 1 member (just the owner) or no members */}
                  {projectUsers.length <= 1 ? (
                      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                          <img
                              src={emptyMembersIllustration}
                              alt="No members"
                              className="mx-auto mb-4 w-40 h-40"
                          />
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                              This project doesn't have any additional members yet.
                          </p>
                          {isUserOwner && (
                              <button
                                  onClick={() => {
                                      setError('');
                                      setIsMemberModalOpen(true);
                                  }}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                  Add Your First Member
                              </button>
                          )}
                      </div>
                  ) : (
                      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                  <th scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Name
                                  </th>
                                  <th scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Email
                                  </th>
                                  <th scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Role
                                  </th>
                                  {isUserOwner && (
                                      <th scope="col"
                                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                          Actions
                                      </th>
                                  )}
                              </tr>
                              </thead>
                              <tbody
                                  className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
                  )}
              </div>
          )}

          {activeTab === 'resources' && (
              <>
                  {/* Resources Section */}
                  <div className="mb-6 flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Resources
                      </h2>
                      <div className="flex space-x-2">
                          <Button
                              variant={"primary"}
                              onClick={() => setIsResourceModalOpen(true)}

                          >
                              Add Resource
                          </Button>
                      </div>
                  </div>

                  {/* Resources Grid or Empty State */}
                  {resources.length === 0 && !groupedSchemas['Uncategorized'] ? (
                      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center mb-8">
                          <img
                              src={emptyResourcesIllustration}
                              alt="No resources"
                              className="mx-auto mb-4 w-40 h-40"
                          />
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                              You don't have any resources yet.
                          </p>
                          <Button
                              variant="primary"
                              onClick={() => setIsResourceModalOpen(true)}
                          >
                              Add Your First Resource
                          </Button>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                          {resources.map((resource) => (
                              <Link
                                  key={resource.id}
                                  to={`/projects/${projectId}/resources/${encodeURIComponent(resource.name)}`}
                                  className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
                              >
                                  <div className="p-6">
                                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                          {resource.name}
                                      </h3>
                                      <div className="flex items-center justify-between">
                                          <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {groupedSchemas[resource.name] ? groupedSchemas[resource.name].length : 0} {groupedSchemas[resource.name] && groupedSchemas[resource.name].length === 1 ? 'schema' : 'schemas'}
                                          </span>
                                          <svg xmlns="http://www.w3.org/2000/svg"
                                               className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none"
                                               viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M9 5l7 7-7 7"/>
                                          </svg>
                                      </div>
                                  </div>
                              </Link>
                          ))}

                          {/* Add Uncategorized if there are any */}
                          {groupedSchemas['Uncategorized'] && groupedSchemas['Uncategorized'].length > 0 && (
                              <Link
                                  key="Uncategorized"
                                  to={`/projects/${projectId}/resources/Uncategorized`}
                                  className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
                              >
                                  <div className="p-6">
                                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                          Uncategorized
                                      </h3>
                                      <div className="flex items-center justify-between">
                                          <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {groupedSchemas['Uncategorized'].length} {groupedSchemas['Uncategorized'].length === 1 ? 'schema' : 'schemas'}
                                          </span>
                                          <svg xmlns="http://www.w3.org/2000/svg"
                                               className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none"
                                               viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M9 5l7 7-7 7"/>
                                          </svg>
                                      </div>
                                  </div>
                              </Link>
                          )}
                      </div>
                  )}

              </>
        )}

      </div>

      {/* Header Configuration Modal */}
        <HeaderConfigModal
            isOpen={isHeaderModalOpen}
            onClose={() => setIsHeaderModalOpen(false)}
        projectId={project?.id ? parseInt(project.id.toString()) : undefined}
      />

        {/* Resource Creation Modal */}
        <ResourceModal
            isOpen={isResourceModalOpen}
            onClose={() => setIsResourceModalOpen(false)}
            projectId={project?.id ? parseInt(project.id.toString()) : 0}
            existingResources={resources.map(r => r.name)}
            onSuccess={async (resourceId, resourceName) => {
                // Refresh the resources list
                if (project?.id) {
                    try {
                        // Fetch the updated list of resources
                        const projectResources = await resourceOperations.getByProjectId(parseInt(projectId!));
                        setResources(projectResources);

                        // Also refresh schemas to keep everything in sync
                        const projectSchemas = await schemaOperations.getByProjectId(parseInt(projectId!));
                        setSchemas(projectSchemas);

                        // Update grouped schemas
                        const grouped: Record<string, Schema[]> = {};
                        projectSchemas.forEach(schema => {
                            const resource = schema.resource || 'Uncategorized';
                            if (!grouped[resource]) {
                                grouped[resource] = [];
                            }
                            grouped[resource].push(schema);
                        });

                        setGroupedSchemas(grouped);
                    } catch (err) {
                        console.error('Error refreshing data after resource creation:', err);
                    }
                }
            }}
        />

        {/* Member Selection Modal */}
        {isMemberModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Member to Project</h2>
                        <button
                            onClick={() => {
                                setError('');
                                setIsMemberModalOpen(false);
                            }}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            aria-label="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                 stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <div className="mb-4">
                        <label htmlFor="memberSelect"
                               className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Select User
                        </label>
                        <select
                            id="memberSelect"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">Select a user</option>
                            {availableUsers.map(user => (
                                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                            ))}
                        </select>
                        {availableUsers.length === 0 && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                No more users available to add to this project.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                setIsMemberModalOpen(false);
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                handleAddUser();
                                setIsMemberModalOpen(false);
                            }}
                            disabled={selectedUserId === ''}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            Add Member
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Project Modal for Edit */}
        {project && currentUser && (
            <ProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                onSuccess={handleProjectSuccess}
                project={project}
                userId={currentUser.id}
            />
        )}
    </Layout>
  );
};

export default ProjectDetailPage;
