import { useState } from "react";
import { useLocation } from "wouter";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { useToast } from "../hooks/use-toast";
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

  const handleLoginSubmit = async (values: LoginFormValues) => {
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
        // 針對不同錯誤類型提供特定訊息
        if (data.message === "此帳號尚未註冊") {
          throw new Error("此帳號尚未註冊");
        } else if (data.message === "密碼錯誤，請再試一次") {
          throw new Error("密碼錯誤，請再試一次");
        } else {
          throw new Error(data.message || "登入失敗");
        }
      }

      // 儲存使用者資訊於 localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      
      toast({
        title: "登入成功",
        description: data.message || "歡迎回來！",
      });

      // 導回首頁
      navigate("/");

    } catch (error) {
      console.error("Login failed:", error);
      const message = error instanceof Error ? error.message : "登入失敗，請稍後再試";
      
      // 針對特定錯誤提供註冊引導
      if (message === "此帳號尚未註冊") {
        toast({
          title: "帳號未註冊",
          description: (
            <div>
              此帳號尚未註冊
              <Button 
                variant="link" 
                className="p-0 ml-1 underline" 
                onClick={() => navigate("/register")}
              >
                立即註冊
              </Button>
            </div>
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: "登入失敗",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: LoginSchema,
    onSubmit: handleLoginSubmit
  });

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">登入</CardTitle>
        <CardDescription>登入您的帳號以繼續使用服務</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">電子郵件</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="輸入您的電子郵件"
              className={`w-full ${formik.touched.email && formik.errors.email ? "border-red-500" : ""}`}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.email}
            />
            {formik.touched.email && formik.errors.email && (
              <div className="text-sm text-red-500">{formik.errors.email}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="輸入您的密碼"
              className={`w-full ${formik.touched.password && formik.errors.password ? "border-red-500" : ""}`}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.password}
            />
            {formik.touched.password && formik.errors.password && (
              <div className="text-sm text-red-500">{formik.errors.password}</div>
            )}
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
        </form>
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