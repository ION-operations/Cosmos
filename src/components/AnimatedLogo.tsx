import React from 'react';

const AnimatedLogo: React.FC = () => {
  return (
    <div className="fixed top-5 left-5 z-50 flex items-center gap-3">
      {/* Animated Earth Icon */}
      <div className="relative w-12 h-12 animate-pulse-glow">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Outer glow ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#glowGradient)"
            strokeWidth="2"
            className="animate-spin"
            style={{ animationDuration: '20s' }}
          />
          
          {/* Main planet circle */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="url(#earthGradient)"
          />
          
          {/* Cloud layer */}
          <ellipse
            cx="50"
            cy="50"
            rx="38"
            ry="20"
            fill="url(#cloudGradient)"
            className="animate-spin"
            style={{ animationDuration: '30s' }}
          />
          
          {/* Atmosphere rim */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="url(#atmosphereGradient)"
            strokeWidth="4"
          />
          
          {/* Gradients */}
          <defs>
            <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#00d4ff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0099ff" stopOpacity="0.8" />
            </linearGradient>
            
            <radialGradient id="earthGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#0a4d6e" />
              <stop offset="50%" stopColor="#0d2f3f" />
              <stop offset="100%" stopColor="#051520" />
            </radialGradient>
            
            <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="20%" stopColor="white" stopOpacity="0.3" />
              <stop offset="40%" stopColor="white" stopOpacity="0" />
              <stop offset="60%" stopColor="white" stopOpacity="0.2" />
              <stop offset="80%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0.3" />
            </linearGradient>
            
            <radialGradient id="atmosphereGradient" cx="50%" cy="50%">
              <stop offset="80%" stopColor="#00d4ff" stopOpacity="0" />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.4" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default AnimatedLogo;
