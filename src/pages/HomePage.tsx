import React from 'react';
import {Link} from 'react-router-dom';
import Layout from '../components/Layout';
import {useAuth} from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Layout>
      <div>
        {/* Hero Section */}
        <div
            className="py-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-xl mb-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]"></div>
          <div className="relative z-10 px-6 py-16 sm:px-12 sm:py-24">
            <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tight">
              Welcome to <span className="text-yellow-300">ZARV</span>
            </h1>
            <p className="text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              A powerful tool for managing, testing, and validating API schemas with advanced features
            </p>

            {isAuthenticated ? (
                <div className="space-y-6">
                  <p className="text-white/80 text-xl">
                    You're logged in! Start managing your schemas.
                  </p>
                  <Link
                      to="/projects"
                      className="inline-block px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-yellow-100 transition-colors shadow-lg transform hover:scale-105 duration-200"
                  >
                    View Your Projects
                  </Link>
                </div>
            ) : (
                <div className="space-y-6">
                  <p className="text-white/80 text-xl">
                    Experience the next generation of API schema validation
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Link
                        to="/login"
                        className="inline-block px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-yellow-100 transition-colors shadow-lg transform hover:scale-105 duration-200"
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
            )}

            {/* Abstract shapes for decoration */}
            <div
                className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
            <div
                className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12 inline-block border-b-4 border-indigo-500 pb-2">
            Powerful Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Core Features */}
            <div
                className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg transform transition-all hover:scale-105 duration-300 border border-gray-100 dark:border-gray-700">
              <div
                  className="flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full mb-6 mx-auto">
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor"
                     viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Project Management
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create and organize your API projects in one place with collaborative features
              </p>
            </div>

            <div
                className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg transform transition-all hover:scale-105 duration-300 border border-gray-100 dark:border-gray-700">
              <div
                  className="flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full mb-6 mx-auto">
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor"
                     viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Schema Definition
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Define and validate your API schemas with Zod, with syntax highlighting and auto-completion
              </p>
            </div>

            <div
                className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg transform transition-all hover:scale-105 duration-300 border border-gray-100 dark:border-gray-700">
              <div
                  className="flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full mb-6 mx-auto">
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor"
                     viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                API Testing
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Test your APIs against defined schemas with real-time validation feedback
              </p>
            </div>
          </div>
        </div>

        {/* New Features Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12 inline-block border-b-4 border-indigo-500 pb-2">
            New Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* AI Features */}
            <div
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-8 rounded-xl shadow-lg border border-blue-100 dark:border-blue-900">
              <div className="flex items-center mb-6">
                <div
                    className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI-Powered Features
                </h3>
              </div>
              <ul className="space-y-3 text-left">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">AI-generated schema validation suggestions</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span
                      className="text-gray-700 dark:text-gray-300">Intelligent sample data generation based on schemas</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span
                      className="text-gray-700 dark:text-gray-300">Error analysis and automated fix recommendations</span>
                </li>
              </ul>
              <div
                  className="mt-6 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                       xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Powered by advanced language models for accurate suggestions
                </div>
              </div>
            </div>

            {/* Diff View */}
            <div
                className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 p-8 rounded-xl shadow-lg border border-green-100 dark:border-green-900">
              <div className="flex items-center mb-6">
                <div
                    className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Advanced Diff View
                </h3>
              </div>
              <ul className="space-y-3 text-left">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Side-by-side and unified diff views</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span
                      className="text-gray-700 dark:text-gray-300">Support for all HTTP methods (GET, POST, PUT, etc.)</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span
                      className="text-gray-700 dark:text-gray-300">GitHub-style interface with syntax highlighting</span>
                </li>
              </ul>
              <div
                  className="mt-6 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                       xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Compare schema versions or API responses with precision
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Limitations Section */}
        <div
            className="mb-20 bg-yellow-50 dark:bg-gray-800/50 p-8 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Current Limitations
          </h2>
          <div className="flex items-start">
            <svg className="w-6 h-6 text-yellow-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div className="text-left">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                This application is currently a proof of concept and uses IndexedDB for local storage. While this allows
                for a seamless demo experience without requiring a backend server, it means:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4">
                <li>All data is stored in your browser</li>
                <li>Data will not persist across different browsers or devices</li>
                <li>Clearing browser data will erase your projects and schemas</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mt-3">
                Future versions will include server-side storage and multi-user collaboration features.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mb-12 bg-indigo-600 rounded-xl p-10 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to streamline your API validation?
            </h2>
            <p className="text-indigo-100 mb-8 max-w-2xl mx-auto">
              Start using ZARV today and experience the power of AI-assisted schema validation and testing.
            </p>
            <Link
                to={isAuthenticated ? "/projects" : "/login"}
                className="inline-block px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-yellow-100 transition-colors shadow-lg transform hover:scale-105 duration-200"
            >
              {isAuthenticated ? "Go to Dashboard" : "Get Started Now"}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
