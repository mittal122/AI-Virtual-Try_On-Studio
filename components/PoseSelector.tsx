import React from 'react';
import type { Pose } from '../types';

interface PoseSelectorProps {
  poses: Pose[];
  selectedPose: string | null;
  onSelectPose: (url: string) => void;
}

export const PoseSelector: React.FC<PoseSelectorProps> = ({ poses, selectedPose, onSelectPose }) => {
  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex space-x-4">
          {poses.map((pose) => (
            <img
              key={pose.id}
              src={pose.url}
              alt={`Model pose ${pose.id}`}
              onClick={() => onSelectPose(pose.url)}
              className={`flex-shrink-0 w-24 h-36 object-cover rounded-md cursor-pointer transition-all duration-200 ${
                selectedPose === pose.url ? 'ring-4 ring-blue-500 shadow-lg' : 'hover:scale-105'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
