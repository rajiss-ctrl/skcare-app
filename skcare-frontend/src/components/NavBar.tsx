// components/NavBar.tsx
import Logo      from '../assets/svg/logo.svg';
import Search    from '../assets/svg/search-icon.svg';
import CartIcon  from '../assets/svg/cart.svg';
import CartGreen from '../assets/svg/cart-green.svg';
import UserIcon  from '../assets/svg/user.svg';
import { Link, useLocation } from 'react-router-dom';
import MobileNav  from './ShadMobileNav';
import AuthButton from './AuthButton';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const NavBar = () => {
  const { user }         = useAuth();
  const { cartItemCount } = useCart();
  const location          = useLocation();

  const navLink = (path: string, label: string) => (
    <li className="relative text-gray-700 hover:text-black">
      <Link to={path}>{label}</Link>
      {location.pathname === path && (
        <div className="absolute bottom-[-5px] left-0 w-full h-[2px] bg-black" />
      )}
    </li>
  );

  return (
    <div className="w-full border-b py-2 px-3 lg:px-16 border-[#BFC0C2]">
      <nav className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/">
          <img className="w-8 md:w-[40px]" src={Logo} alt="SKCare logo" />
        </Link>

        {/* Auth button */}
        <div className="text-center">
          <AuthButton />
        </div>

        {/* Desktop nav links */}
        <ul className="hidden lg:flex gap-10 text-xs">
          {navLink('/',             'Home')}
          {navLink('/all-products', 'Shop')}
          <li className="text-gray-700 hover:text-black cursor-pointer">Categories</li>
          <li className="text-gray-700 hover:text-black cursor-pointer">About</li>
          <li className="text-gray-700 hover:text-black cursor-pointer">Blog</li>
          <li className="text-gray-700 hover:text-black cursor-pointer">Contact</li>
        </ul>

        {/* Search */}
        <div className="hidden relative md:flex items-center gap-2 border text-black border-[#BFC0C2] rounded-[8px] py-[0.20rem] text-xs md:px-2">
          <img className="w-3 md:w-5" src={Search} alt="Search" />
          <input
            type="text"
            placeholder="Search"
            className="outline-none bg-transparent placeholder:text-gray-700"
          />
        </div>

        {/* Cart + user */}
        <div className="flex items-center gap-6">
          <Link to="/cartpreview" className="relative flex items-center" aria-label="Cart">
            {cartItemCount > 0 && (
              <div className="absolute top-[-8px] right-[-8px] bg-red-500 text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
                {cartItemCount}
              </div>
            )}
            <img
              src={location.pathname === '/cartpreview' ? CartGreen : CartIcon}
              alt="Cart"
              className="w-5"
            />
          </Link>

          {/* User avatar — show initials if no photoURL */}
          {user ? (
            user.photoURL ? (
              <img
                className="w-7 h-7 rounded-full object-cover"
                src={user.photoURL}
                alt={user.name || 'User'}
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#4F705B] text-white flex items-center justify-center text-xs font-semibold">
                {(user.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </div>
            )
          ) : (
            <img className="w-5" src={UserIcon} alt="User" />
          )}
        </div>

        {/* Mobile nav */}
        <MobileNav />
      </nav>

      {/* Mobile search */}
      <div className="relative md:hidden mt-3 flex items-center gap-2 border border-[#BFC0C2] rounded-[8px] py-[0.20rem] text-xs p-2">
        <img className="w-3 md:w-5" src={Search} alt="Search" />
        <input
          type="text"
          placeholder="Search"
          className="outline-none bg-transparent placeholder:text-gray-700"
        />
      </div>
    </div>
  );
};

export default NavBar;
