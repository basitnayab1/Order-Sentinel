import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/lib/authContext';
import { ProtectedRoute } from '@/components/protected-route';
import { Layout } from '@/components/layout';

import LoginPage from '@/pages/login';
import DashboardPage from '@/pages/dashboard';
import OrdersPage from '@/pages/orders';
import OrderNewPage from '@/pages/order-new';
import OrderDetailPage from '@/pages/order-detail';
import NotificationsPage from '@/pages/notifications';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <Layout>
            <DashboardPage />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/orders/new">
        <ProtectedRoute adminOnly>
          <Layout>
            <OrderNewPage />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/orders/:id">
        {(params) => (
          <ProtectedRoute>
            <Layout>
              <OrderDetailPage id={params.id} />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/orders">
        <ProtectedRoute>
          <Layout>
            <OrdersPage />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/notifications">
        <ProtectedRoute>
          <Layout>
            <NotificationsPage />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <DashboardPage />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
          <SonnerToaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
