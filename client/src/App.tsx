import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
import RecordingDetail from "@/pages/RecordingDetail";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import { useEffect } from "react";

// 受保護的路由元件，需要登入才能訪問
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, path?: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // 只有完成載入身份驗證狀態且用戶未登入時，才重定向到登入頁面
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);
  
  // 如果仍在載入或已經登入，則顯示元件
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/recording/:id">
        {(params) => {
          const Component = () => <RecordingDetail recordingId={parseInt(params.id, 10)} />;
          return <ProtectedRoute component={Component} />;
        }}
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
