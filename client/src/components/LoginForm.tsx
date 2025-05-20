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
        // 處理不同的錯誤情況
        if (response.status === 401) {
          if (data.message.includes("檢查帳號密碼")) {
            // 檢查是否是「帳號不存在」的情況
            const checkAccountResponse = await fetch(`/api/user/check-email?email=${encodeURIComponent(values.email)}`, {
              method: "GET"
            });
            const checkAccountData = await checkAccountResponse.json();
            
            if (checkAccountResponse.ok && !checkAccountData.exists) {
              // 帳號不存在，建議註冊
              toast({
                title: "帳號尚未註冊",
                description: "您的帳號尚未註冊，請先註冊後再登入",
                variant: "destructive",
                action: (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigate("/register")}>
                      立即註冊
                    </Button>
                  </div>
                ),
              });
              return;
            }
          }
          
          // 密碼錯誤
          toast({
            title: "登入失敗",
            description: "請檢查帳號密碼是否正確",
            variant: "destructive",
          });
        } else {
          // 其他錯誤
          throw new Error(data.message || "登入失敗");
        }
        return;
      }

      // 儲存使用者資訊於 localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      
      toast({
        title: "登入成功",
        description: "歡迎回來！",
      });

      try {
        // 嘗試載入使用者的錄音資料
        const recordingsResponse = await fetch("/api/recordings");
        
        if (!recordingsResponse.ok) {
          throw new Error("載入資料失敗");
        }
        
        // 載入成功，導回首頁
        navigate("/");
      } catch (dataError) {
        console.error("Error loading user data:", dataError);
        toast({
          title: "警告",
          description: "載入資料失敗，請重新整理頁面",
          variant: "destructive",
        });
        
        // 即使載入資料失敗，還是導回首頁
        navigate("/");
      }
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