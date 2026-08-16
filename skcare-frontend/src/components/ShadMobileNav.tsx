import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Separator } from "./ui/separator";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "../../@/components/ui/sheet";
import Logo     from '../assets/svg/logo.svg';
import AuthModal from './AuthModal';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const MobileNav = () => {
  const { user, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <nav className="md:hidden">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <Sheet>
        <SheetTrigger aria-label="Open navigation menu">
          <Menu className="text-[#717171]" />
        </SheetTrigger>

        <SheetContent className="space-y-3 bg-white">
          <SheetTitle>
            <Link to="/" className="flex items-center gap-2">
              <img className="w-8" src={Logo} alt="SKCare logo" />
              <span className="text-base font-bold text-gray-800">SKCare</span>
            </Link>
          </SheetTitle>

          {/* Required by Radix Dialog for accessibility */}
          <DialogDescription className="sr-only">
            Site navigation menu
          </DialogDescription>

          <Separator className="bg-gray-200" />

          <ul className="space-y-1">
            {[
              { label: 'Home',       to: '/'            },
              { label: 'Shop',       to: '/all-products' },
              { label: 'Categories', to: '/'            },
              { label: 'Blog',       to: '/'            },
              { label: 'About',      to: '/'            },
              { label: 'Contact',    to: '/'            },
            ].map(({ label, to }) => (
              <li key={label}>
                <Link
                  to={to}
                  className="block py-3 px-2 text-sm font-medium text-gray-700
                             hover:text-[#4F705B] hover:bg-gray-50 rounded-lg transition"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <Separator className="bg-gray-200" />

          <div className="pt-2">
            {user ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 px-2 truncate">{user.email}</p>
                <Button
                  onClick={signOut}
                  variant="outline"
                  className="w-full text-sm border-gray-300 text-gray-700"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowAuth(true)}
                className="w-full text-sm bg-[#4F705B] hover:bg-[#3a5344] text-white"
              >
                Sign In
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

export default MobileNav;
