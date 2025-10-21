import React from 'react';
import type { Pose } from '../types';

interface PoseSelectorProps {
  poses: Pose[];
  selectedPose: Pose | null;
  onSelectPose: (pose: Pose) => void;
}

export const PoseSelector: React.FC<PoseSelectorProps> = ({ poses, selectedPose, onSelectPose }) => {
  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex space-x-3">
          {poses.map((pose) => (
            <div key={pose.id} className="flex-shrink-0 text-center space-y-1.5 group">
              <img
                src={pose.url}
                alt={pose.name}
                onClick={() => onSelectPose(pose)}
                className={`w-24 h-36 object-cover rounded-lg cursor-pointer transition-all duration-200 border ${
                  selectedPose?.id === pose.id 
                  ? 'ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-indigo-500 border-indigo-500' 
                  : 'border-gray-200 dark:border-gray-700 group-hover:scale-105 group-hover:shadow-md'
                }`}
              />
              <p className={`text-xs font-medium transition-colors ${selectedPose?.id === pose.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>{pose.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
