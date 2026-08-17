// components/AuthModal.tsx
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';

type Tab = 'signin' | 'signup';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { signIn, signUp } = useAuth();

  const [tab,      setTab]      = useState<Tab>('signin');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const reset = () => { setError(''); setName(''); setEmail(''); setPassword(''); };
  const handleTabChange = (t: Tab) => { setTab(t); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>

        {/* Tabs */}
        <div className="flex border-b mb-5">
          {(['signin', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-[#4F705B] text-[#4F705B]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'signup' && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4F705B]"
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4F705B]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4F705B]"
          />
          {tab === 'signup' && (
            <p className="text-xs text-gray-400">
              Min 8 chars · one uppercase · one number · one special character
            </p>
          )}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4F705B] hover:bg-[#3a5344] text-white rounded-lg py-2 text-sm"
          >
            {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
