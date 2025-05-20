import { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { LoginUser } from '@shared/schema';
import { useLocation, Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

// 驗證規則
const LoginSchema = Yup.object().shape({
  username: Yup.string()
    .min(2, '使用者名稱太短')
    .max(50, '使用者名稱太長')
    .required('使用者名稱為必填欄位'),
  password: Yup.string()
    .min(6, '密碼至少需要6個字元')
    .required('密碼為必填欄位'),
});

interface LoginResponse {
  success: boolean;
  user: {
    id: number;
    username: string;
    name?: string;
  };
  token: string;
  message?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (token: string, userData: any) => void;
  logout: () => void;
}

// 這裡我們模擬一個 AuthContext 屬性，實際應用中應該在上層組件提供 AuthContext
const useAuth = (): AuthContextType => {
  // 檢查 localStorage 是否有 token
  const hasToken = localStorage.getItem('auth_token') !== null;
  
  // 從 localStorage 讀取 user 資料
  const userStr = localStorage.getItem('user_data');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const login = (token: string, userData: any) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    window.location.href = '/'; // 登入後重導向至首頁
  };
  
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/login'; // 登出後重導向至登入頁
  };
  
  return {
    isAuthenticated: hasToken,
    user,
    login,
    logout
  };
};

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const [, setLocation] = useLocation(); 

  // 使用 TanStack Query 的 useMutation 處理登入請求
  const loginMutation = useMutation({
    mutationFn: async (values: LoginUser) => {
      const response = await apiRequest(
        'POST',
        '/api/auth/login',
        values
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '登入失敗');
      }
      
      return response.json() as Promise<LoginResponse>;
    },
    onSuccess: (data) => {
      // 登入成功，儲存 token 與使用者資料
      auth.login(data.token, data.user);
      
      toast({
        title: '登入成功',
        description: '歡迎回來！',
      });
      
      // 導航至首頁
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: '登入失敗',
        description: error.message || '請檢查您的憑證並重試',
        variant: 'destructive',
      });
    }
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">會員登入</CardTitle>
        <CardDescription>
          請輸入您的帳號密碼進行登入
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Formik
          initialValues={{ username: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={(values) => {
            loginMutation.mutate(values);
          }}
        >
          {({ errors, touched }) => (
            <Form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">使用者名稱</Label>
                <Field
                  as={Input}
                  id="username"
                  name="username"
                  type="text"
                  placeholder="請輸入您的使用者名稱"
                  className={`w-full ${
                    errors.username && touched.username ? 'border-red-500' : ''
                  }`}
                />
                <ErrorMessage
                  name="username"
                  component="div"
                  className="text-sm text-red-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <div className="relative">
                  <Field
                    as={Input}
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="請輸入您的密碼"
                    className={`w-full ${
                      errors.password && touched.password ? 'border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                  >
                    {showPassword ? '隱藏' : '顯示'}
                  </button>
                </div>
                <ErrorMessage
                  name="password"
                  component="div"
                  className="text-sm text-red-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登入中...
                  </>
                ) : (
                  '登入'
                )}
              </Button>
            </Form>
          )}
        </Formik>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          還沒有帳號？{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            立即註冊
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}