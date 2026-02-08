import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Archive from './pages/Archive';
import CaseDetail from './pages/CaseDetail';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Contact from './pages/Contact';
import About from './pages/About';
import ModeratorDashboard from './pages/ModeratorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CaseForm from './components/moderator/CaseForm';
import CaseManagement from './pages/CaseManagement';
import SuggestionsManagement from './pages/SuggestionsManagement';
import FeedbackManagement from './pages/FeedbackManagement';
import './styles/index.css';

// Protected Route Component
const ProtectedRoute = ({ children, requireModerator, requireAdmin }) => {
  const { isAuthenticated, isModerator, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />;
  }

  if (requireModerator && !isModerator) {
    return <Navigate to="/" />;
  }

  return children;
};

const AppContent = () => {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />

          {/* Moderator Routes */}
          <Route
            path="/moderator"
            element={
              <ProtectedRoute requireModerator>
                <ModeratorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/moderator/cases"
            element={
              <ProtectedRoute requireModerator>
                <CaseManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/moderator/add-case"
            element={
              <ProtectedRoute requireModerator>
                <CaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/moderator/edit-case/:id"
            element={
              <ProtectedRoute requireModerator>
                <CaseForm isEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/moderator/suggestions"
            element={
              <ProtectedRoute requireModerator>
                <SuggestionsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/moderator/feedback"
            element={
              <ProtectedRoute requireModerator>
                <FeedbackManagement />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;

