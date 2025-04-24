import React, {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import Layout from '../components/Layout';
import {useAuth} from '../contexts/AuthContext';
import {Project, projectOperations, projectUserOperations} from '../utils/db';
import Button from '../components/Button';
import ProjectModal from '../components/ProjectModal';
import emptyProjectsIllustration from '../assets/illustrations/empty-projects.svg';

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [ownedProjectIds, setOwnedProjectIds] = useState<number[]>([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | undefined>(undefined);
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

  const handleProjectSuccess = async (projectId: number) => {
    if (!currentUser?.id) return;

    try {
      // Reload projects
      const updatedProjects = await projectOperations.getByUserId(currentUser.id);
      setProjects(updatedProjects);

      // If it's a new project, add it to ownedProjectIds
      if (!currentProject) {
        setOwnedProjectIds(prevIds => [...prevIds, projectId]);
      }

      setError('');

      // Navigate to the project
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Error reloading projects:', err);
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
            <Button
                onClick={() => {
                  setCurrentProject(undefined); // Reset for create mode
                  setIsProjectModalOpen(true);
                }}
            variant="primary"
          >
              Create Project
            </Button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <img
                src={emptyProjectsIllustration}
                alt="No projects"
                className="mx-auto mb-4 w-40 h-40"
            />
            <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any projects yet.</p>
            <Button
                onClick={() => {
                  setCurrentProject(undefined); // Reset for create mode
                  setIsProjectModalOpen(true);
                }}
                variant="primary"
            >
              Create Your First Project
            </Button>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Modal for Create/Edit */}
      {currentUser && (
          <ProjectModal
              isOpen={isProjectModalOpen}
              onClose={() => setIsProjectModalOpen(false)}
              onSuccess={handleProjectSuccess}
              project={currentProject}
              userId={currentUser.id}
          />
      )}
    </Layout>
  );
};

export default ProjectsPage;
