import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            智能語音筆記
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            使用AI技術將您的錄音轉換為有組織的筆記
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  );
}