import { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

export default function AuthForm({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onAuth();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-12 bg-bg-800 p-6 rounded-lg shadow-2 border border-border-600">
      <h2 className="text-2xl font-semibold mb-4 text-text-100 text-center">
        {isLogin ? "Login" : "Sign Up"}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="px-4 py-2 rounded border border-border-600 bg-bg-900 text-text-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="px-4 py-2 rounded border border-border-600 bg-bg-900 text-text-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {error && <div className="text-state-error text-sm text-center">{error}</div>}
        <button
          type="submit"
          className="bg-brand-500 text-bg-900 font-medium py-2 rounded hover:bg-brand-600 transition-colors disabled:opacity-60"
          disabled={loading}
        >
          {loading ? (isLogin ? "Logging in..." : "Signing up...") : (isLogin ? "Login" : "Sign Up")}
        </button>
      </form>
      <div className="mt-4 text-center">
        <button
          className="text-brand-500 hover:underline text-sm"
          onClick={() => setIsLogin(l => !l)}
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
} 