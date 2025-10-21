import { Pose, BackgroundOption } from './types';

export const MODEL_POSES: Pose[] = [
  { id: 1, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_1.png', name: 'Confident Stance', description: 'A model stands confidently with feet shoulder-width apart, one hand on their hip, and looking directly at the camera.' },
  { id: 2, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_2.png', name: 'Walking Forward', description: 'A model is captured mid-stride walking directly towards the camera, with natural arm movement, conveying a sense of purpose and motion.' },
  { id: 3, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_3.png', name: 'Leaning Back', description: 'A model leans back casually against an unseen surface, with a relaxed posture, one leg crossed over the other.' },
  { id: 4, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_4.png', name: 'Dynamic Action', description: 'A model in a dynamic action pose, possibly jumping or lunging, with arms and legs extended to create a sense of energy and movement.' },
  { id: 5, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_5.png', name: 'Casual Look', description: 'A model in a relaxed, casual stance, looking slightly away from the camera with a natural, unposed expression.' },
  { id: 6, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_6.png', name: 'Seated Elegant', description: 'A model is seated elegantly on a stool or chair, with a poised and graceful posture, hands resting gently on their lap.' },
  { id: 7, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_7.png', name: 'Side Profile', description: 'A model is shown in a side profile, looking away from the camera, highlighting the silhouette of the body and clothing.' },
  { id: 8, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_8.png', name: 'Hands in Pockets', description: 'A model stands casually with both hands in their pockets, exuding a cool and relaxed vibe.' },
  { id: 9, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_9.png', name: 'Fashion Lean', description: 'A model leans forward in a high-fashion pose, with angular limbs and an intense expression, often seen in editorial shoots.' },
  { id: 10, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/pose_10.png', name: 'Studio Pose', description: 'A classic, neutral studio pose. The model is standing straight, facing slightly to the side but looking at the camera, with a calm and professional demeanor.' },
];

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: 1, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/background_studio_gray.jpg', name: 'Studio Gray', description: 'A clean, seamless, light gray studio background.' },
  { id: 2, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/background_urban_street.jpg', name: 'Urban Street', description: 'A vibrant, gritty urban street scene with graffiti-covered walls, a wet pavement reflecting city lights, and a sense of bustling city life.' },
  { id: 3, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/background_nature_forest.jpg', name: 'Forest Path', description: 'A serene, winding path through a dense forest with sunlight filtering through the canopy of tall trees.' },
  { id: 4, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/background_modern_interior.jpg', name: 'Modern Interior', description: 'A minimalist, modern interior with clean lines, large windows, and simple, elegant furniture.' },
  { id: 5, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/background_beach_sunset.jpg', name: 'Beach Sunset', description: 'A breathtaking beach scene during sunset, with golden light, calm waves, and a wide expanse of sand.' },
  { id: 6, url: 'https://storage.googleapis.com/aistudio-hosting/prompts/background_abstract_gradient.jpg', name: 'Abstract', description: 'An abstract background with a soft gradient of pastel colors, creating a dreamy and artistic atmosphere.' },
];