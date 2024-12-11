import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider } from '@/firebase/config';
import { Button } from './ui/button';
import { useAuth } from '@/context/AuthContext';
import G_SignIn from '../assets/svg/google-icon.svg'



  
  const AuthButton = () => {
const {user} = useAuth()
  
    const handleSignIn = async () => {
      try {
        await signInWithPopup(auth, provider);
        console.log('User signed in');
      } catch (error) {
        console.error('Sign-in error:', error);
      }
    };
  
    const handleSignOut = async () => {
      try {
        await signOut(auth);
        console.log('User signed out');
      } catch (error) {
        console.error('Sign-out error:', error);
      }
    };
  
  
    return (
      <div>
        <Button
          onClick={!user ? handleSignIn : handleSignOut}
          className='text-xs text-black' 
        >
          <img src={G_SignIn} alt="google sign in" />
          <span>{!user ? "Sign In With Google" : "Sign Out"}</span>
        </Button>
        {/* <button
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded-md ml-4"
        >
          Sign Out
        </button> */}
  
    </div>
    );
  };
  
  export default AuthButton;
  