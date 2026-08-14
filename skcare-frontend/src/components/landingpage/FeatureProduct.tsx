// components/landingpage/FeatureProduct.tsx
import { CarouselPlugin } from './Carousel';
import Img1       from '../../assets/svg/slide1.svg';
import Img2       from '../../assets/svg/slide2.svg';
import BlackStar  from '../../assets/svg/star.svg';
import WhiteStar  from '../../assets/svg/star-white.svg';
import Img3       from '../../assets/svg/slide3.svg';
import ProductList from './ProductList';
import { Button }  from '../ui/button';

const items = [
  {
    id: 1,
    image:       Img1,
    title:       '',
    price:       '₦127,000 - ₦200,000',
    description: 'Night care set',
    blackstar:   BlackStar,
    whitestar:   WhiteStar,
  },
  {
    id: 2,
    image:       Img2,
    title:       'Card 2',
    price:       '₦127,000 - ₦200,000',
    description: 'Night care set',
    blackstar:   BlackStar,
    whitestar:   WhiteStar,
  },
  {
    id: 3,
    image:       Img3,
    title:       'Card 3',
    price:       '₦127,000 - ₦200,000',
    description: 'Night care set',
    blackstar:   BlackStar,
    whitestar:   WhiteStar,
  },
  {
    id: 4,
    image:       Img3,
    title:       'Card 4',
    price:       '₦127,000 - ₦200,000',
    description: 'Night care set',
    blackstar:   BlackStar,
    whitestar:   WhiteStar,
  },
];

const FeatureProduct = () => {
  return (
    <section className="w-full flex flex-col items-center overflow-hidden">

      {/* ── Section heading ─────────────────────────────────────────── */}
      <div className="text-center px-4 mt-10 mb-2">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
          Featured Products
        </h2>
        <p className="text-sm md:text-base text-gray-500 mt-1">
          Our best sellers for this week!
        </p>
      </div>

      {/* ── Carousel ────────────────────────────────────────────────── */}
      <div className="w-full max-w-5xl px-4 mt-6">
        <CarouselPlugin cardData={items} />
      </div>

      {/* ── Product grid ────────────────────────────────────────────── */}
      <div className="w-full mt-4">
        <ProductList />
      </div>

      {/* ── Showcase banners ────────────────────────────────────────── */}
      <div className="w-full px-4 md:px-10 lg:px-16 mt-16 mb-20">
        <div className="flex flex-col sm:flex-row gap-4">

          {/* Banner 1 — New arrival */}
          <div
            className="showcase-bg1 flex-1 min-h-[220px] sm:min-h-[280px] md:min-h-[348px]
                       rounded-xl p-6 md:p-8 flex flex-col justify-between"
          >
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-widest
                               text-[#4F705B] bg-white/70 px-2 py-0.5 rounded-full mb-3">
                New Arrival
              </span>
              <h4 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight max-w-[200px]">
                Hand Cream Collection
              </h4>
            </div>
            <Button className="mt-4 w-fit text-black bg-white hover:bg-gray-100
                               py-2.5 px-8 text-sm font-semibold rounded-lg shadow-sm">
              Shop Now
            </Button>
          </div>

          {/* Banner 2 — Sale */}
          <div
            className="showcase-bg2 flex-1 min-h-[220px] sm:min-h-[280px] md:min-h-[348px]
                       rounded-xl p-6 md:p-8 flex flex-col justify-between"
          >
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-widest
                               text-orange-600 bg-white/70 px-2 py-0.5 rounded-full mb-3">
                Limited Offer
              </span>
              <h4 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                25% off Hair &amp; Makeup!
              </h4>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed max-w-xs">
                We're celebrating our 4th year in business! All hair and makeup products
                are on sale at 25% off.
              </p>
            </div>
            <Button className="mt-4 w-fit text-black bg-white hover:bg-gray-100
                               py-2.5 px-8 text-sm font-semibold rounded-lg shadow-sm">
              Shop Now
            </Button>
          </div>

        </div>
      </div>

    </section>
  );
};

export default FeatureProduct;
