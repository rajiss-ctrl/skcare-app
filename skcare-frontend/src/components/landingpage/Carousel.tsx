import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type CardData = {
  id: string | number;
  image: string;
  title: string;
  description: string;
};

export const CarouselPlugin: React.FC<{ cardData: CardData[] }> = ({ cardData }) => {
  const plugin = React.useRef(Autoplay({ delay: 2000, stopOnInteraction: true }));
  const [activeIndex, setActiveIndex] = useState(0);

  // Update active index at a fixed interval (autoplay simulation)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % cardData.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [cardData.length]);

  return (
    <Carousel
      plugins={[plugin.current]}
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      className="relative"
    >
      <CarouselContent className=" flex px-0 py-4">
        {cardData.map((data, index) => {
          const isActive = index === activeIndex;

          return (
            <CarouselItem
              key={data.id}
              className={`transition-transform duration-500 ease-in-out ${
                isActive ? "scale-110 z-50" : "scale-90 opacity-70"
              } p-0 md:basis-1/2 lg:basis-1/3`}
            >
              <div className="w-full">
                <Card className="p-0 shadow-lg">
                  <CardContent className="p-0">
                    <img src={data.image} alt={data.title} className="w-full object-contain" />
                    <div className="p-4">
                      <h1 className="text-xl font-bold">{data.title}</h1>
                      <p className="text-sm">{data.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};
