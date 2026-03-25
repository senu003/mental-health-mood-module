// components/StatsCard.jsx
import React from 'react';

const StatsCard = ({ icon: Icon, title, value }) => {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
      <div className="flex items-center gap-3">
        {/* Circle with background color - #0C5BD5 at 14% opacity */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: 'rgba(12, 91, 213, 0.14)' }}
        >
          {/* Inner gradient for depth effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
          {/* Icon - mono color vector image */}
          <Icon className="w-6 h-6 text-[#0C5BD5] relative z-10" />
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-medium">{title}</p>
          <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;