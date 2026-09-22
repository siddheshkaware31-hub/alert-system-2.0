'use client'

import { useState, useEffect } from 'react'

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1600&auto=format&fit=crop',
]

export default function AnimatedHeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative overflow-hidden pt-12 pb-24 px-6 shadow-inner select-none">
      {/* Background Automatic Image Crossfade */}
      {BACKGROUND_IMAGES.map((imgUrl, idx) => {
        const isActive = idx === currentIndex
        return (
          <div
            key={imgUrl}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10'
            }`}
          >
            {/* Bright, Vivid Background Image */}
            <div
              className={`w-full h-full bg-cover bg-center brightness-110 saturate-110 transition-transform duration-[6000ms] ease-out ${
                isActive ? 'scale-105' : 'scale-100'
              }`}
              style={{ backgroundImage: `url('${imgUrl}')` }}
            />
            {/* Soft corporate travel blue gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#050b17]/60 via-[#0a162b]/20 to-[#050b17]/70" />
            <div className="absolute inset-0 bg-blue-950/10 backdrop-brightness-105" />
          </div>
        )
      })}



      {/* Fixed Original Header Content with High-Contrast Text Shadows */}
      <div className="relative z-10 max-w-[1200px] mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)]">
          VeloTrav Corporate Alert Operations
        </h1>
        <p className="text-sky-100 font-bold text-sm md:text-base mt-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
          Real-time boarding pass delivery, flight tracking, and automated hotel reconfirmations
        </p>
      </div>
    </div>
  )
}
