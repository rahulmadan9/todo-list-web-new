import { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

export default function AuthForm({ onClose }: { onClose: () => void }) {
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
      // Close the auth form on successful authentication
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-bg-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="max-w-sm mx-auto bg-bg-800 p-6 rounded-lg shadow-2 border border-border-600">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onClose}
            className="text-text-300 hover:text-text-100 active:text-brand-500 text-sm font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          >
            ← Back to Tasks
          </button>
          <h2 className="text-2xl font-semibold text-text-100">
            {isLogin ? "Login" : "Sign Up"}
          </h2>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
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
            className="bg-brand-500 text-bg-900 font-medium px-4 py-2 rounded-md hover:bg-brand-600 active:bg-brand-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-800 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (isLogin ? "Logging in..." : "Signing up...") : (isLogin ? "Login" : "Sign Up")}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            className="text-brand-500 hover:underline active:text-brand-700 text-sm transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            onClick={() => setIsLogin(l => !l)}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
} 