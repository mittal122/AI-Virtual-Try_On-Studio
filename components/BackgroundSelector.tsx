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
      <div className="w-full overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex space-x-3">
          {backgrounds.map((bg) => (
            <div key={bg.id} className="flex-shrink-0 text-center space-y-1.5 group">
              <img
                src={bg.url}
                alt={bg.name}
                onClick={() => onSelectBackground(bg)}
                className={`w-36 h-24 object-cover rounded-lg cursor-pointer transition-all duration-200 border ${
                  selectedBackground?.id === bg.id 
                  ? 'ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-indigo-500 border-indigo-500' 
                  : 'border-gray-200 dark:border-gray-700 group-hover:scale-105 group-hover:shadow-md'
                }`}
              />
              <p className={`text-xs font-medium transition-colors ${selectedBackground?.id === bg.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>{bg.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
