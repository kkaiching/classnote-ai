import { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
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
const RegisterSchema = Yup.object().shape({
  username: Yup.string()
    .min(2, '使用者名稱太短')
    .max(50, '使用者名稱太長')
    .required('使用者名稱為必填欄位'),
  password: Yup.string()
    .min(6, '密碼至少需要6個字元')
    .required('密碼為必填欄位'),
  email: Yup.string()
    .email('請輸入有效的電子郵件')
    .notRequired(),
  name: Yup.string()
    .notRequired(),
});

interface RegisterResponse {
  success: boolean;
  user: {
    id: number;
    username: string;
    name?: string;
  };
  message?: string;
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // 使用 TanStack Query 的 useMutation 處理註冊請求
  const registerMutation = useMutation({
    mutationFn: async (values: any) => {
      const response = await apiRequest(
        'POST',
        '/api/auth/register',
        values
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '註冊失敗');
      }
      
      return response.json() as Promise<RegisterResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: '註冊成功',
        description: '請使用您的新帳號登入系統。',
      });
      
      // 導航至登入頁
      setLocation('/login');
    },
    onError: (error: Error) => {
      toast({
        title: '註冊失敗',
        description: error.message || '請檢查您的資訊並重試',
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
        <CardTitle className="text-2xl font-bold">註冊新帳號</CardTitle>
        <CardDescription>
          請填寫以下資訊完成註冊
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Formik
          initialValues={{ username: '', password: '', email: '', name: '' }}
          validationSchema={RegisterSchema}
          onSubmit={(values) => {
            registerMutation.mutate(values);
          }}
        >
          {({ errors, touched }) => (
            <Form className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="email">電子郵件 (選填)</Label>
                <Field
                  as={Input}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="請輸入您的電子郵件"
                  className={`w-full ${
                    errors.email && touched.email ? 'border-red-500' : ''
                  }`}
                />
                <ErrorMessage
                  name="email"
                  component="div"
                  className="text-sm text-red-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">姓名 (選填)</Label>
                <Field
                  as={Input}
                  id="name"
                  name="name"
                  type="text"
                  placeholder="請輸入您的姓名"
                  className={`w-full ${
                    errors.name && touched.name ? 'border-red-500' : ''
                  }`}
                />
                <ErrorMessage
                  name="name"
                  component="div"
                  className="text-sm text-red-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    註冊中...
                  </>
                ) : (
                  '建立帳號'
                )}
              </Button>
            </Form>
          )}
        </Formik>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          已經有帳號？{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            立即登入
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}