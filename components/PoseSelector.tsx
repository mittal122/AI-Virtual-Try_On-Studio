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
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex space-x-4">
          {poses.map((pose) => (
            <div key={pose.id} className="flex-shrink-0 text-center space-y-1">
              <img
                src={pose.url}
                alt={pose.name}
                onClick={() => onSelectPose(pose)}
                className={`w-24 h-36 object-cover rounded-md cursor-pointer transition-all duration-200 ${
                  selectedPose?.id === pose.id ? 'ring-4 ring-blue-500 shadow-lg' : 'hover:scale-105'
                }`}
              />
              <p className="text-xs font-medium text-gray-600">{pose.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};