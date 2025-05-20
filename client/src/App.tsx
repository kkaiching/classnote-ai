import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import RecordingDetail from "@/pages/RecordingDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/not-found";

// Auth route wrapper to handle redirection if not logged in
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, path?: string }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user");
    const isLoggedIn = !!user;
    
    setIsAuthenticated(isLoggedIn);
    setLoading(false);
    
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">載入中...</div>;
  }

  return isAuthenticated ? <Component {...rest} /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">
        {(params) => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/recording/:id">
        {(params) => <ProtectedRoute component={RecordingDetail} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="min-h-screen bg-gray-50">
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
