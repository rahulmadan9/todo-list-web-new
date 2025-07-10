"use client";
import AuthForm from "../components/AuthForm";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-bg-900 flex flex-col items-center justify-center py-16 px-4">
      <AuthForm onClose={() => router.push("/")} />
    </div>
  );
} 