import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CarouselPlugin } from './Carousel';
import Img1 from '../../assets/svg/slide1.svg';
import Img2 from '../../assets/svg/slide2.svg';
import BlackStar from '../../assets/svg/star.svg';
import WhiteStar from '../../assets/svg/star-white.svg';
import Img3 from '../../assets/svg/slide3.svg';
import ProductList from './ProductList';
import { Button } from '../ui/button';

const items = [
  {
    id:1,
    image: `${Img1}`,
    title: '',
    price: "₦127,000 - ₦200,000",
    description: 'Night care set',
    blackstar: `${BlackStar}`,
    whitestar: `${WhiteStar}`,
  },
  {
    id:2,
    image: `${Img2}`,
    title: 'Card 2',
    price: "₦127,000 - ₦200,000",
    description: 'Night care set',
    blackstar: `${BlackStar}`,
    whitestar: `${WhiteStar}`,
  },
  {
    id:3,
    image: `${Img3}`,
    title: 'Card 3',
    price: "₦127,000 - ₦200,000",
    description: 'Night care set',
    blackstar: `${BlackStar}`,
    whitestar: `${WhiteStar}`,
  },
  {
    id:4,
    image: `${Img3}`,
    title: 'Card 4',
    price: "₦127,000 - ₦200,000",
    description: 'Night care set',
    blackstar: `${BlackStar}`,
    whitestar: `${WhiteStar}`,
  },
];

const FeatureProduct = () => {
  
  return (
    <section className='w-full flex flex-col justify-center items-center'>
       
      <h2>Featured products</h2>
      <p>Our best sellers for this week!</p>
      <div className="lg:w-4/5 mt-8 grid place-content-center">
        <CarouselPlugin cardData={items} />
      </div>
      <div className="p-0">
        <ProductList/> 
      </div>

      <div className="flex justify-center items-center px-3 md:px-[60px]">
        <div className="flex flex-col md:flex-row mt-[79px] mb-[104px] w-full gap-4">
          <div className="showcase-bg1 text-[#000000B2] w-1/2 p-8 md:min-h-[348px] rounded-sm">
            <h4 className='font-inter text-[24px] font-bold leading-[32px] tracking-[-0.02em]'>New Arrival - hand cream</h4>
            <Button className='text-black mt-4 bg-white py-3 px-[58px]'>Shop</Button>
          </div>
          <div className="showcase-bg2 text-[#000000B2] w-1/2 p-8 md:min-h-[348px] rounded-sm">
            <h4 className='font-inter text-[24px] font-bold leading-[32px] tracking-[-0.02em]'>25% off hair & makeup!</h4>
            <p className="font-satoshi mt-4 pr-60 lg:pr-72 text-sm font-normal leading-[26px]">We’re celebrating our 4th year in business! All products under hair and makeup categories are on sales at 25% off!</p>
            <Button className='text-black mt-4 bg-white py-3 px-[58px]'>Shop</Button>
          </div>
        </div>
      </div>
      
    </section>
  );
};

export default FeatureProduct;
