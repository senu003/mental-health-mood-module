// components/QuickActionCard.jsx
import React from 'react';

const QuickActionCard = ({ icon: Icon, title, description, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 group w-full text-left"
    >
      <div className="flex items-start gap-4">
        {/* Icon Container */}
        <div className="p-3 rounded-xl bg-[#0C5BD5]/10 group-hover:bg-[#0C5BD5]/20 transition-all duration-300">
          <Icon className="w-6 h-6 text-[#0C5BD5]" />
        </div>
        
        {/* Text Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 group-hover:text-[#0C5BD5] transition-colors duration-300">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        
        
        
      </div>
    </button>
  );
};

export default QuickActionCard;