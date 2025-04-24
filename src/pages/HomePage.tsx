import React from 'react';
import {Link} from 'react-router-dom';
import Layout from '../components/Layout';
import {useAuth} from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Layout>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Schema Manager
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          A powerful tool for managing and testing API schemas
        </p>

        {isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              You're logged in! Start managing your schemas.
            </p>
            <Link
              to="/projects"
              className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              View Your Projects
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Get started by creating an account or logging in.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                  to="/login"
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Project Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Create and organize your API projects in one place
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Schema Definition
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Define and validate your API schemas with ease
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              API Testing
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Test your APIs against defined schemas
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
