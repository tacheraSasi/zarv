import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Project, projectOperations, projectUserOperations } from '../utils/db';

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [ownedProjectIds, setOwnedProjectIds] = useState<number[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Load projects on component mount
  useEffect(() => {
    const loadProjects = async () => {
      if (!currentUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const userProjects = await projectOperations.getByUserId(currentUser.id);
        setProjects(userProjects);

        // Check which projects the user is the owner of
        const ownedIds: number[] = [];
        for (const project of userProjects) {
          if (project.id) {
            const isOwner = await projectUserOperations.isProjectOwner(project.id, currentUser.id);
            if (isOwner) {
              ownedIds.push(project.id);
            }
          }
        }
        setOwnedProjectIds(ownedIds);
      } catch (err) {
        console.error('Error loading projects:', err);
        setError('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [currentUser]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser?.id) {
      setError('You must be logged in to create a project');
      return;
    }

    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      const projectId = await projectOperations.create(
        currentUser.id,
        newProjectName.trim(),
        newProjectDescription.trim() || undefined
      );

      // Reload projects
      const updatedProjects = await projectOperations.getByUserId(currentUser.id);
      setProjects(updatedProjects);

      // Add the new project to ownedProjectIds since the creator is always the owner
      setOwnedProjectIds(prevIds => [...prevIds, projectId]);

      // Reset form
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateForm(false);
      setError('');

      // Navigate to the new project
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    if (!currentUser?.id) {
      setError('You must be logged in to delete a project');
      return;
    }

    try {
      await projectOperations.delete(projectId, currentUser.id);
      // Remove the deleted project from the state
      setProjects(projects.filter(project => project.id !== projectId));

      // Remove the project from ownedProjectIds
      setOwnedProjectIds(prevIds => prevIds.filter(id => id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Projects
          </h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {showCreateForm ? 'Cancel' : 'Create Project'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
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
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any projects yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {project.name}
                  </h2>
                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {project.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Created: {formatDate(project.createdAt)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-between">
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                  >
                    View Details
                  </Link>
                  {project.id && ownedProjectIds.includes(project.id) && (
                    <button
                      onClick={() => project.id && handleDeleteProject(project.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectsPage;
