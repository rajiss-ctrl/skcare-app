// components/AuthButton.tsx
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import AuthModal from './AuthModal';

const AuthButton = () => {
  const { user, signOut } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (user) {
    return (
      <Button
        onClick={signOut}
        variant="outline"
        className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        Sign Out
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="text-xs bg-[#4F705B] hover:bg-[#3a5344] text-white"
      >
        Sign In
      </Button>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default AuthButton;
