import { useState } from "react";
import { useLocation } from "wouter";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface LoginFormValues {
  email: string;
  password: string;
}

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email("請輸入有效的電子郵件")
    .required("必填欄位"),
  password: Yup.string()
    .min(6, "密碼不得少於6字元")
    .required("必填欄位"),
});

export function LoginForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues: LoginFormValues = {
    email: "",
    password: "",
  };

  const handleSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "登入失敗");
      }

      // 儲存使用者資訊於 localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      
      toast({
        title: "登入成功",
        description: "歡迎回來！",
      });

      // 導回首頁
      navigate("/");

    } catch (error) {
      console.error("Login failed:", error);
      const message = error instanceof Error ? error.message : "登入失敗，請稍後再試";
      
      toast({
        title: "登入失敗",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">登入</CardTitle>
        <CardDescription>登入您的帳號以繼續使用服務</CardDescription>
      </CardHeader>
      <CardContent>
        <Formik
          initialValues={initialValues}
          validationSchema={LoginSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched }) => (
            <Form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">電子郵件</Label>
                <Field 
                  as={Input}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="輸入您的電子郵件"
                  className={`w-full ${errors.email && touched.email ? "border-red-500" : ""}`}
                />
                <ErrorMessage 
                  name="email" 
                  component="div" 
                  className="text-sm text-red-500" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <Field 
                  as={Input}
                  id="password"
                  name="password"
                  type="password"
                  placeholder="輸入您的密碼"
                  className={`w-full ${errors.password && touched.password ? "border-red-500" : ""}`}
                />
                <ErrorMessage 
                  name="password" 
                  component="div" 
                  className="text-sm text-red-500" 
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登入中...
                  </>
                ) : "登入"}
              </Button>
            </Form>
          )}
        </Formik>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          還沒有帳號？
          <Button 
            variant="link" 
            className="p-0 ml-1" 
            onClick={() => navigate("/register")}
          >
            立即註冊
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}