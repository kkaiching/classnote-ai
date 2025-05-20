import { RegisterForm } from "@/components/RegisterForm";

export default function Register() {
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">語音轉筆記系統</h1>
      <RegisterForm />
    </div>
  );
}