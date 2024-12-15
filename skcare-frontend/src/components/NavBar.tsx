import Logo from '../assets/svg/logo.svg';
import Search from '../assets/svg/search-icon.svg';
import Cart from '../assets/svg/cart.svg';
import CartGreen from '../assets/svg/cart-green.svg';
import User from '../assets/svg/user.svg';
import { Link, useLocation } from 'react-router-dom';
import { useProductContext } from '../context/ProductContext'; // Import the context
import MobileNav from './ShadMobileNav';
import AuthButton from './AuthButton';

const NavBar = () => {
  const { cart } = useProductContext(); // Access cart from context
  const location = useLocation();

  // Calculate the total cart items count
  const cartItemCount = cart.reduce(
    (count, item) => count + item.cartQuantity,
    0
  );

  return (
    <div className="w-full border-b py-2 px-3 lg:px-16 border-[#BFC0C2]">
      <nav className="flex items-center justify-between">
        {/* Logo */}
        <div>
          <Link to="/">
            <img className="w-8 md:w-[40px]" src={Logo} alt="Logo" />
          </Link>
        </div>

        {/* Authentication Button */}
        <div className="text-center">
          <AuthButton />
        </div>

        {/* Navigation Links */}
        <ul className="hidden lg:flex gap-10 text-xs">
          <li
            className={`relative ${
              location.pathname === '/' ? 'text-black' : 'text-gray-700'
            } hover:text-black`}
          >
            <Link to="/">Home</Link>
            {location.pathname === '/' && (
              <div className="absolute bottom-[-5px] left-0 w-full h-[2px] bg-black" />
            )}
          </li>
          <li
            className={`relative ${
              location.pathname === '/all-products' ? 'text-black' : 'text-gray-700'
            } hover:text-black`}
          >
            <Link to="/all-products">Shop</Link>
            {location.pathname === '/all-products' && (
              <div className="absolute bottom-[-5px] left-0 w-full h-[2px] bg-black" />
            )}
          </li>
          <li className="text-gray-700 hover:text-black">Categories</li>
          <li className="text-gray-700 hover:text-black">About</li>
          <li className="text-gray-700 hover:text-black">Blog</li>
          <li className="text-gray-700 hover:text-black">Contact</li>
        </ul>

        {/* Search Input */}
        <div className="hidden relative md:flex items-center gap-2 border text-black  border-[#BFC0C2] rounded-[8px] py-[0.20rem] text-xs md:px-2">
          <img className="w-3 md:w-5" src={Search} alt="Search Icon" />
          <input
            type="text"
            placeholder="Search"
            className="outline-none bg-transparent placeholder:text-gray-700"
          />
        </div>

        {/* Cart and User Icons */}
        <div className="flex items-center gap-6">
          <Link to="/cartpreview" className="relative flex items-center">
            {cartItemCount > 0 && (
              <div className="absolute top-[-8px] right-[-5px] bg-red-500 text-white text-xs font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                {cartItemCount}
              </div>
            )}
            <img
              src={location.pathname === '/cart-preview-page' ? CartGreen : Cart}
              alt="Cart"
              className="w-5"
            />
          </Link>
          <img className="w-5" src={User} alt="User" />
        </div>

        {/* Mobile Navigation */}
        <MobileNav />
      </nav>

      {/* Mobile Search Bar */}
      <div className="relative md:hidden mt-3 flex items-center gap-2 border border-[#BFC0C2] rounded-[8px] py-[0.20rem] text-xs p-2">
        <img className="w-3 md:w-5" src={Search} alt="Search Icon" />
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
