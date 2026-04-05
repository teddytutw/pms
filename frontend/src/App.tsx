import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import EntityDetails from './pages/EntityDetails';
import TeamManagement from './pages/TeamManagement';

// 簡單的路由守衛組件
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const user = localStorage.getItem('currentUser');
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* 登入頁面 */}
        <Route path="/login" element={<Login />} />
        
        {/* 預設首頁 */}
        <Route path="/" element={<Landing />} />
        
        {/* 主要儀表板頁面 (受保護) */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
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
      </Routes>
    </Router>
  );
}

export default App;
