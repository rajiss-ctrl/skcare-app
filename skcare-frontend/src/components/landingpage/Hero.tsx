import HeroImg from '../../assets/img/Frame 23.webp';
import NavBar from '../NavBar';
import { Button } from '../ui/button';
// import NavBar from '../NavBar2';

const Hero = () => {
  return (
    <section className="bg-[#EFF0F2] text-white font-sans">
      {/* CTA Remark for Mobile */}
      <div className="  flex items-center pt-10 md:pt-0 justify-center">
        <p className='bg-[#4F705B] w-full text-center text-white text-xm md:text-sm py-2 leading-[21.6px] font-medium font-[Satoshi]'>
          Free deliveries on all orders within Nigeria
        </p>
      </div>
      {/* Public key=FLWPUBK_TEST-6cbe1fbc89c44ff6f9e9a61a16b599e3-X
      
      Secret key=FLWSECK_TEST-bc281ef453bd5b1e8bca0f9b3f0276de-X
      
      Encryption key=FLWSECK_TEST0e869f37ae54 */}
      {/* Navbar */}  
        <NavBar/>
    
      {/* Hero Content */}
      <div className="flex flex-col-reverse lg:flex-row items-center justify-between px-6 lg:pr-0 lg:pl-16">
        {/* Left Content */}
        <div className="text-center lg:text-left max-w-lg">
          <span className="text-black/15 text-[16px] font-bold leading-[28px] text-left">Skincare System</span>
          <h1 className="text-black font-[Satoshi] text-[52px] font-bold leading-[60px]">Healthy products that age you backwards</h1>
          <p className="text-black/70 font-[Satoshi] text-[16px] font-normal leading-[26px]">
            At skincare system, we do not just make promises. There’s a very long list of satisfied customers over the years, and we are glad to share the goodness of natural and healthy skin with you.
          </p>
          <Button className="bg-[#4F705B] hover:bg-[#4F705B] px-[58px] py-[15px] outline-none border-none gap-[10px] rounded-[8px] text-[#F4F6F4] mt-[32px]">
            Shop
          </Button>
        </div>

        {/* Right Content */}
        <div className="flex-shrink-0">
          <img src={HeroImg} alt="Hero" className="w-full" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
