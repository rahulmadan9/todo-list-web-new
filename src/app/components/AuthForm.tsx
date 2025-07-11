import { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

export default function AuthForm({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signin') {
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
    <div className="max-w-md w-full">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-text-100 mb-4">Welcome</h1>
        <p className="text-text-300 text-lg">Sign in to sync your tasks across devices</p>
      </div>
      
      <div className="bg-bg-800 rounded-xl shadow-2xl p-10">
        <div className="space-y-8">
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-200 mb-3">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-700 border border-border-600 rounded-lg text-text-100 placeholder-text-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-200"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-200 mb-3">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-700 border border-border-600 rounded-lg text-text-100 placeholder-text-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-200"
                  placeholder="Enter your password"
                />
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-state-error/10 border border-state-error/20 rounded-lg">
                <div className="text-state-error text-sm text-center">{error}</div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-brand-500 text-bg-900 rounded-lg font-semibold hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            >
              {loading ? 'Loading...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-text-300 hover:text-brand-500 active:text-brand-600 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm font-medium"
            >
              {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-8">
        <button 
          onClick={onClose}
          className="inline-flex items-center text-text-300 hover:text-brand-500 active:text-brand-600 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Continue without signing in
        </button>
      </div>
    </div>
  );
} 