import type { Metadata } from "next";
import { LoginView } from "@/features/session/login-view";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return <LoginView />;
}
