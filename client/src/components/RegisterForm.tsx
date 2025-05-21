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

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
}

const RegisterSchema = Yup.object().shape({
  name: Yup.string()
    .required("必填欄位"),
  email: Yup.string()
    .email("請輸入有效的電子郵件")
    .required("必填欄位"),
  password: Yup.string()
    .min(6, "密碼不得少於6字元")
    .required("必填欄位"),
});

export function RegisterForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues: RegisterFormValues = {
    name: "",
    email: "",
    password: "",
  };

  const handleRegisterSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        // 明確區分電子郵件已註冊的錯誤
        if (data.message === "此電子郵件已被註冊") {
          throw new Error("此電子郵件已被註冊");
        } else {
          throw new Error(data.message || "註冊失敗");
        }
      }

      toast({
        title: "註冊成功",
        description: "請立即登入您的帳號",
      });

      // 註冊成功後導向登入頁
      navigate("/login");

    } catch (error) {
      console.error("Registration failed:", error);
      const message = error instanceof Error ? error.message : "註冊失敗，請稍後再試";
      
      // 針對已註冊的情況提供登入引導
      if (message === "此電子郵件已被註冊") {
        toast({
          title: "註冊失敗",
          description: (
            <div>
              此電子郵件已註冊
              <Button 
                variant="link" 
                className="p-0 ml-1 underline" 
                onClick={() => navigate("/login")}
              >
                立即登入
              </Button>
            </div>
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: "註冊失敗",
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
    validationSchema: RegisterSchema,
    onSubmit: handleRegisterSubmit
  });

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">註冊</CardTitle>
        <CardDescription>建立您的帳號以使用所有功能</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="輸入您的姓名"
              className={`w-full ${formik.touched.name && formik.errors.name ? "border-red-500" : ""}`}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.name}
            />
            {formik.touched.name && formik.errors.name && (
              <div className="text-sm text-red-500">{formik.errors.name}</div>
            )}
          </div>

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
                註冊中...
              </>
            ) : "註冊"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          已經有帳號？
          <Button 
            variant="link" 
            className="p-0 ml-1" 
            onClick={() => navigate("/login")}
          >
            立即登入
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}