import React, {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import Layout from '../components/Layout';
import {useAuth} from '../contexts/AuthContext';
import {Project, projectOperations, projectUserOperations, resourceOperations, schemaOperations} from '../utils/db';

const ResourcesPage: React.FC = () => {
    const {projectId} = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [resources, setResources] = useState<{ name: string; count: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const {currentUser} = useAuth();
    const navigate = useNavigate();

    // Load project and resources on component mount
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

                // Load resources directly from the resources table
                const dbResources = await resourceOperations.getByProjectId(parseInt(projectId));

                // Load schemas for this project to count them
                const projectSchemas = await schemaOperations.getByProjectId(parseInt(projectId));

                // Create a map of resource counts
                const resourceCountMap = new Map<number, number>();
                let uncategorizedCount = 0;

                // Count schemas for each resource
                projectSchemas.forEach(schema => {
                    if (schema.resourceId) {
                        const currentCount = resourceCountMap.get(schema.resourceId) || 0;
                        resourceCountMap.set(schema.resourceId, currentCount + 1);
                    } else if (schema.resource) {
                        // Handle legacy resources (string-based)
                        // Try to find a matching resource by name
                        const matchingResource = dbResources.find(r => r.name === schema.resource);
                        if (matchingResource && matchingResource.id) {
                            const currentCount = resourceCountMap.get(matchingResource.id) || 0;
                            resourceCountMap.set(matchingResource.id, currentCount + 1);
                        } else {
                            // If no matching resource found, count as uncategorized
                            uncategorizedCount++;
                        }
                    } else {
                        // No resource or resourceId
                        uncategorizedCount++;
                    }
                });

                // Convert resources to the format expected by the UI
                const resourcesArray = dbResources.map(resource => ({
                    name: resource.name,
                    count: resourceCountMap.get(resource.id!) || 0
                }));

                // Add uncategorized if there are any
                if (uncategorizedCount > 0) {
                    resourcesArray.push({
                        name: 'Uncategorized',
                        count: uncategorizedCount
                    });
                }

                // Sort alphabetically
                resourcesArray.sort((a, b) => a.name.localeCompare(b.name));

                setResources(resourcesArray);
            } catch (err) {
                console.error('Error loading project:', err);
                setError('Failed to load project details');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [projectId, currentUser]);

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString();
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">Loading resources...</p>
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
                        to={`/projects/${projectId}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                        </svg>
                        Back to Project
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {project && (
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Resources for {project.name}
                        </h1>
                        {project.description && (
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {project.description}
                            </p>
                        )}
                    </div>
                )}

                {/* Resources Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {resources.map((resource) => (
                        <Link
                            key={resource.name}
                            to={`/projects/${projectId}/resources/${encodeURIComponent(resource.name)}`}
                            className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
                        >
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {resource.name}
                                </h3>
                                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {resource.count} {resource.count === 1 ? 'schema' : 'schemas'}
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
                </div>

                {resources.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">No resources found for this project.</p>
                        <Link
                            to={`/projects/${projectId}/schemas/new`}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Create Your First Schema
                        </Link>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ResourcesPage;
