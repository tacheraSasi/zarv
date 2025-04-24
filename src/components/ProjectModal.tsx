import React, {useEffect, useState} from 'react';
import {Project, projectOperations} from '../utils/db';
import Modal from './Modal';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (projectId: number) => void;
    project?: Project; // For editing mode
    userId: number;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
                                                       isOpen,
                                                       onClose,
                                                       onSuccess,
                                                       project,
                                                       userId
                                                   }) => {
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditMode = !!project;

    // Reset form when modal opens/closes or project changes
    useEffect(() => {
        if (isOpen) {
            setProjectName(project ? project.name : '');
            setProjectDescription(project?.description || '');
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen, project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate input
        if (!projectName.trim()) {
            setError('Project name is required');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            let projectId: number;

            if (isEditMode && project && project.id) {
                // Update the project
                await projectOperations.update(project.id, userId, {
                    name: projectName.trim(),
                    description: projectDescription.trim() || undefined
                });
                projectId = project.id;
            } else {
                // Create the project
                projectId = await projectOperations.create(
                    userId,
                    projectName.trim(),
                    projectDescription.trim() || undefined
                );
            }

            // Call success callback if provided
            if (onSuccess) {
                onSuccess(projectId);
            }

            // Close the modal
            onClose();
        } catch (err) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} project:`, err);
            setError(`Failed to ${isEditMode ? 'update' : 'create'} project: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Project' : 'Create New Project'}
            maxWidth="md"
        >
            {error && (
                <div
                    className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 animate-shake">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"/>
                        </svg>
                        {error}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="projectName"
                           className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Project Name
                    </label>
                    <input
                        id="projectName"
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter project name"
                        autoFocus
                        required
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="projectDescription"
                           className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description (optional)
                    </label>
                    <textarea
                        id="projectDescription"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter project description"
                    />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                     xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                          strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                                {isEditMode ? 'Updating...' : 'Creating...'}
              </span>
                        ) : (
                            isEditMode ? 'Update Project' : 'Create Project'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ProjectModal;
