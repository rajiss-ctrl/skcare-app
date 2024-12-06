import FooterImg from '../assets/img/Rectangle 27.webp';

const Footer = () => {
  return (
    <footer className="bg-gray-50 py-10">
      {/* Footer Content */}
      <div className="footer-content flex flex-col md:flex-row items-center justify-between px-6 md:px-20">
        {/* Text Content */}
        <div className="content text-center md:text-left md:max-w-lg">
          <span className="text-lg font-semibold text-gray-800">Skincare System</span>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mt-4">
            Let your skin’s health speak for itself!
          </h1>
          <p className="text-gray-600 mt-4 md:pr-28">
            Taking care of you is a lifestyle. Our all-green products are safe for you and the
            environment. You are sure to enjoy your skincare journey with our products.
          </p>
          <button className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700">
            Shop
          </button>
        </div>
        {/* Image */}
        <div className="footer-img mt-6 md:mt-0">
          <img
            src={FooterImg}
            alt="Footer Illustration"
            className="rounded-lg"
          />
        </div>
      </div>

      {/* Footer Remark */}
      <div className="footer-remark text-center text-sm text-gray-400 mt-10">
        A product of Skincare System <span>© 2024</span>
      </div>
    </footer>
  );
};

export default Footer;
