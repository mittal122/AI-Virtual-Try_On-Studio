import React from 'react';
import type { BackgroundOption } from '../types';

interface BackgroundSelectorProps {
  backgrounds: BackgroundOption[];
  selectedBackground: BackgroundOption | null;
  onSelectBackground: (background: BackgroundOption) => void;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({ backgrounds, selectedBackground, onSelectBackground }) => {
  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex space-x-4">
          {backgrounds.map((bg) => (
            <div key={bg.id} className="flex-shrink-0 text-center space-y-1">
              <img
                src={bg.url}
                alt={bg.name}
                onClick={() => onSelectBackground(bg)}
                className={`w-36 h-24 object-cover rounded-md cursor-pointer transition-all duration-200 ${
                  selectedBackground?.id === bg.id ? 'ring-4 ring-blue-500 shadow-lg' : 'hover:scale-105'
                }`}
              />
              <p className="text-xs font-medium text-gray-600">{bg.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};