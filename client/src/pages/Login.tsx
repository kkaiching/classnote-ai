import { LoginForm } from "@/components/LoginForm";

export default function Login() {
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">語音轉筆記系統</h1>
      <LoginForm />
    </div>
  );
}