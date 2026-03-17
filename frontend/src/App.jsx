import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import AuthPage from './AuthPage';
import Sidebar from './Sidebar';
import ClientsPage from './ClientsPage';
import ProductsPage from './ProductsPage';

import PartnersPage from './PartnersPage';
import ContractsPage from './ContractsPage';
import SalesPage from './SalesPage';
import InventoryPage from './InventoryPage';
import CommissionsPage from './CommissionsPage';
import ServiceOrdersPage from './ServiceOrdersPage';
import ReportsPage from './ReportsPage';
import AdminDashboardPage from './AdminDashboardPage';
import FinancePage from './FinancePage';
import DashboardPage from './DashboardPage';
import BillsPayablePage from './BillsPayablePage';
import InvoicesPage from './InvoicesPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>Carregando UniSis...</div>;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="app-container">
      <Sidebar />
      <main className="content">
        {children}
      </main>
    </div>
  );
};

const PermissionRoute = ({ permission, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>Carregando UniSis...</div>;
  if (!user) return <Navigate to="/auth" />;

  const isAdmin = user.role === 'Administrador';
  const hasPerm = user.permissions?.includes(permission);

  if (isAdmin || hasPerm) return children;

  // Find a default screen they DO have access to
  if (user.permissions && user.permissions.length > 0) {
    return <Navigate to={`/${user.permissions[0]}`} />;
  }

  // Last resort
  return <div style={{ padding: '2rem', textAlign: 'center' }}>Você não tem permissão para acessar esta tela. Contate o administrador. <br /><br /> <a href="/auth" onClick={() => localStorage.clear()}>Sair e tentar novamente</a></div>;
};

// Helper component for role-based commissions access
const CommissionsRoute = () => {
  const { user } = useAuth();
  // If seller, check permission too (handled by PermissionRoute wrapper)
  return <CommissionsPage />;
};

const SellerOSRoute = () => {
  return <ServiceOrdersPage />;
};

const AdminRoute = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrador';
  const hasAdminPerm = user?.permissions?.includes('admin');
  if (!isAdmin && !hasAdminPerm) return <Navigate to="/" />;
  return <AdminDashboardPage />;
};

const DashboardRoute = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrador';
  const hasAdminPerm = user?.permissions?.includes('admin');
  if (!isAdmin && !hasAdminPerm) return <Navigate to="/" />;
  return <DashboardPage />;
};

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  const isAdmin = user.role === 'Administrador';
  const hasAdminPerm = user.permissions?.includes('admin');
  if (isAdmin || hasAdminPerm) return <Navigate to="/dashboard" />;
  return <Navigate to="/clients" />;
};

import SyncStatus from './SyncStatus';
import { ToastProvider } from './ToastContext';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SyncStatus />
        <Router>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRoute /></ProtectedRoute>} />
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/clients" element={
              <ProtectedRoute>
                <PermissionRoute permission="clients">
                  <ClientsPage />
                </PermissionRoute>
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute>
                <PermissionRoute permission="products">
                  <ProductsPage />
                </PermissionRoute>
              </ProtectedRoute>
            } />
            <Route path="/partners" element={<ProtectedRoute><PermissionRoute permission="partners"><PartnersPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><PermissionRoute permission="contracts"><ContractsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><PermissionRoute permission="sales"><SalesPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><PermissionRoute permission="inventory"><InventoryPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="/commissions" element={
              <ProtectedRoute>
                <PermissionRoute permission="commissions">
                  <CommissionsRoute />
                </PermissionRoute>
              </ProtectedRoute>
            } />
            <Route path="/service-orders" element={
              <ProtectedRoute>
                <PermissionRoute permission="service-orders">
                  <SellerOSRoute />
                </PermissionRoute>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <PermissionRoute permission="reports">
                  <ReportsPage />
                </PermissionRoute>
              </ProtectedRoute>
            } />
            <Route path="/finance" element={<ProtectedRoute><PermissionRoute permission="finance"><FinancePage /></PermissionRoute></ProtectedRoute>} />
            <Route path="/bills" element={<ProtectedRoute><PermissionRoute permission="bills"><BillsPayablePage /></PermissionRoute></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><PermissionRoute permission="invoices"><InvoicesPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminRoute />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
