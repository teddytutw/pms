import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import EntityDetails from './pages/EntityDetails';
import TeamManagement from './pages/TeamManagement';
import ProjectHub from './pages/ProjectHub';
import RoleManagement from './pages/RoleManagement';
import Settings from './pages/Settings';
import WorkflowManagement from './pages/WorkflowManagement';
import DeliverableTypeManagement from './pages/DeliverableTypeManagement';
import DeliverableManagement from './pages/DeliverableManagement';

// 簡單的路由守衛組件
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const user = localStorage.getItem('currentUser');
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router basename={(import.meta as any).env.BASE_URL}>
      <Routes>
        {/* 登入頁面 */}
        <Route path="/login" element={<Login />} />
        
        {/* 預設首頁 - 直接導向登入 */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* 主要儀表板頁面 (受保護) */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        
        {/* 專案中心 (受保護) */}
        <Route 
          path="/projects" 
          element={
            <PrivateRoute>
              <ProjectHub />
            </PrivateRoute>
          } 
        />

        {/* 詳細維護頁面 (受保護) */}
        <Route 
          path="/details/:targetType/:targetId" 
          element={
            <PrivateRoute>
              <EntityDetails />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/team" 
          element={
            <PrivateRoute>
              <TeamManagement />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/roles" 
          element={
            <PrivateRoute>
              <RoleManagement />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/settings"  
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } 
        />
        <Route
          path="/workflows"
          element={
            <PrivateRoute>
              <WorkflowManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/deliverable-types"
          element={
            <PrivateRoute>
              <DeliverableTypeManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/deliverables"
          element={
            <PrivateRoute>
              <DeliverableManagement />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
