import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
// import { DialogDescription } from "@radix-ui/react-dialog"; // Ensure you import this

import { Separator } from "./ui/separator";
import { Sheet,SheetTrigger,SheetContent,SheetTitle } from "../../@/components/ui/sheet";
import Logo from '../assets/svg/logo.svg';

const MobileNav = () => {
  return (
    <nav className="md:hidden">
      <Sheet>
        <SheetTrigger>
          <Menu className="text-[#717171]" />
        </SheetTrigger>
        <SheetContent className="space-y-3 bg-white">
          <SheetTitle>
          <Link to="/" className="flex items-center">
            <img className="w-10 text-[#717171]" src={Logo} alt="Logo" />
            <span>SKCare</span>
          </Link>
          </SheetTitle>
          {/* <DialogDescription>
            Use the navigation links below to explore the site.
          </DialogDescription> */}
          <Separator className="bg-[#717171]" />
          <ul>
            <li className="text-md mt-5 py-4">
              <Link to="/all-products">Shop</Link>
            </li>
            <li className="text-md mt-5 py-4">
              <Link to="/">Category</Link>
            </li>
            <li className="text-md mt-5 py-4">
              <Link to="/">Blog</Link>
            </li>
            <li className="text-md mt-5 py-4">
              <Link to="/">About</Link>
            </li>
            <li className="text-md mt-5 py-4">
              <Link to="/">Contact</Link>
            </li>
            <li className="text-md mt-5 py-4">
              <Button>Login</Button>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

export default MobileNav;
