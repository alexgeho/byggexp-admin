import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import CompanyLayout from './layouts/CompanyLayout';
import ProjectLayout from './layouts/ProjectLayout';
import WorkerLayout from './layouts/WorkerLayout';

// Pages
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import CompanyListPage from './pages/CompanyListPage';
import ProjectListPage from './pages/ProjectListPage';
import UserListPage from './pages/UserListPage';
import MyProjectsPage from './pages/MyProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';
import TaskListPage from './pages/TaskListPage';
import TimeReportPage from './pages/TimeReportPage';
import UploadPage from './pages/UploadPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные роуты */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* SuperAdmin роуты - /admin/* */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="companies" replace />} />
          <Route path="companies" element={<CompanyListPage />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="tasks" element={<TaskListPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* CompanyAdmin роуты - /company/* */}
        <Route
          path="/company/*"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'companyAdmin']}>
              <CompanyLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="projects" replace />} />
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="tasks" element={<TaskListPage />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* ProjectAdmin и Worker роуты - /projects/* */}
        <Route
          path="/projects/*"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin', 'worker']}>
              <ProjectLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="my" replace />} />
          <Route path="my" element={<MyProjectsPage />} />
          <Route path=":id" element={<ProjectDetailPage />} />
        </Route>

        {/* Worker роуты - /worker/* */}
        <Route
          path="/worker/*"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin', 'worker']}>
              <WorkerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="my" replace />} />
          <Route path="my" element={<MyProjectsPage />} />
          <Route path="time-report" element={<TimeReportPage />} />
          <Route path="upload" element={<UploadPage />} />
        </Route>

        {/* Редирект по умолчанию */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
