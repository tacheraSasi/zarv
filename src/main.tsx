import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom'
import './index.css'
import {AuthProvider, ProtectedRoute} from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import SchemaFormPage from './pages/SchemaFormPage'
import SchemaDetailPage from './pages/SchemaDetailPage'
import SchemaVersionsPage from './pages/SchemaVersionsPage'
import ResourceDetailPage from './pages/ResourceDetailPage'
import UserManagementPage from './pages/UserManagementPage'
import UserProfilePage from './pages/UserProfilePage'

// Initialize theme based on localStorage or system preference
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Run before rendering to prevent theme flash
initializeTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/schemas/new"
            element={
              <ProtectedRoute>
                <SchemaFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/schemas/:schemaId/edit"
            element={
              <ProtectedRoute>
                <SchemaFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/schemas/:schemaId"
            element={
              <ProtectedRoute>
                <SchemaDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/schemas/:schemaId/versions"
            element={
              <ProtectedRoute>
                <SchemaVersionsPage />
              </ProtectedRoute>
            }
          />
            <Route
                path="/projects/:projectId/resources/:resourceName"
                element={
                    <ProtectedRoute>
                        <ResourceDetailPage/>
                    </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
