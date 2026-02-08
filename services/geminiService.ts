import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GenerateImageProps, ImageData } from '../types';

export const generateTryOnImage = async ({
  userFace,
  productImage,
  productType,
  modelPose,
  describedPose,
  backgroundImage,
  describedBackground,
  variationInfo,
}: GenerateImageProps): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let clothingInstruction: string;
    switch (productType) {
      case 'upper':
        clothingInstruction = `Dress the model in the upper-body clothing item from the second provided image. Pair it with simple, neutral-colored pants (e.g., dark jeans or black trousers) that do not distract from the main item.`;
        break;
      case 'lower':
        clothingInstruction = `Dress the model in the lower-body clothing item from the second provided image. Pair it with a simple, neutral-colored top (e.g., a plain white or black t-shirt) that is tucked in if appropriate for the style.`;
        break;
      case 'full':
        clothingInstruction = `Dress the model in the full-body clothing item from the second provided image.`;
        break;
      default:
        clothingInstruction = `Dress the model in the clothing item from the second provided image.`;
    }


    let prompt = `Create a single, photorealistic virtual try-on image. The final result must be a high-quality photograph with seamless integration of all elements.

**Instructions:**
1.  **Model's Face:** Use the face from the first provided image. Match skin tone and lighting perfectly with the body.
2.  **Clothing:** ${clothingInstruction} Ensure the fabric drapes and folds realistically.`;

    const parts: object[] = [
      { inlineData: { data: userFace.base64, mimeType: userFace.mimeType } },
      { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
    ];

    if (modelPose) {
      prompt += `\n3. **Pose:** The model must adopt the exact body pose from the third provided image.`;
      parts.push({ inlineData: { data: modelPose.base64, mimeType: modelPose.mimeType } });
    } else if (describedPose) {
      prompt += `\n3. **Pose:** The model's pose should be: "${describedPose}".`;
       if (variationInfo && variationInfo.total > 1) {
        prompt += ` This is variation ${variationInfo.current} of ${variationInfo.total}. Make this pose unique while matching the description.`;
      }
    }

    if (backgroundImage) {
      prompt += `\n4. **Background:** Use the fourth provided image as the background.`;
      parts.push({ inlineData: { data: backgroundImage.base64, mimeType: backgroundImage.mimeType } });
    } else if (describedBackground) {
      prompt += `\n4. **Background:** The background must be: "${describedBackground}".`;
    } else {
      prompt += `\n4. **Background:** Use a neutral, light gray studio background.`;
    }

    prompt += `

**Crucial Details:**
- The lighting and shadows must be consistent across the entire scene.
- The final image must look like a real photograph, avoiding any digital or "AI" look.`;
    
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error('No image data found in the API response.');
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error('Failed to generate image. Please try again.');
  }
};

export const generateCreativePose = async (
  productImage: ImageData
): Promise<{ poseDescription: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Based on the provided clothing item, describe a creative and compelling pose for a model. The pose should be suitable for a high-fashion magazine or a brand lookbook. The response must be a valid JSON object.`;
    const parts = [
      { text: prompt },
      { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            poseDescription: {
              type: Type.STRING,
              description: "A detailed description of the model's pose.",
            },
          },
          required: ['poseDescription'],
        },
      },
    });

    const jsonString = response.text.trim();
    const scene = JSON.parse(jsonString);

    if (!scene || typeof scene.poseDescription !== 'string') {
      throw new Error('Invalid JSON structure in API response.');
    }
    
    return scene;
  } catch (error) {
    console.error("Gemini API Error (generateCreativePose):", error);
    throw new Error('Failed to generate creative pose. Please try again.');
  }
};

export const generateCreativeBackground = async (
  productImage: ImageData
): Promise<{ backgroundDescription: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Based on the provided clothing item, describe a creative and compelling background scene for a photoshoot. The background should complement the clothing and be suitable for a high-fashion magazine or a brand lookbook. The response must be a valid JSON object.`;
    const parts = [
      { text: prompt },
      { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            backgroundDescription: {
              type: Type.STRING,
              description: "A detailed description of the scene's background.",
            },
          },
          required: ['backgroundDescription'],
        },
      },
    });

    const jsonString = response.text.trim();
    const scene = JSON.parse(jsonString);

    if (!scene || typeof scene.backgroundDescription !== 'string') {
      throw new Error('Invalid JSON structure in API response.');
    }
    
    return scene;
  } catch (error) {
    console.error("Gemini API Error (generateCreativeBackground):", error);
    throw new Error('Failed to generate creative background. Please try again.');
  }
};


export const describePoseFromImage = async (poseImage: ImageData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `You are an expert in human anatomy and body language. Analyze the provided image and generate a concise, detailed description of the person's pose. The description should be suitable for a text-to-image AI model to accurately recreate the pose. Focus on the position of the head, torso, arms, hands, legs, and feet. Describe the overall mood or attitude conveyed by the pose (e.g., confident, relaxed, dynamic, etc.).`;

    const parts = [
      { text: prompt },
      { inlineData: { data: poseImage.base64, mimeType: poseImage.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error (describePoseFromImage):", error);
    throw new Error('Failed to describe pose from image. Please try again.');
  }
};

export const describeBackgroundFromImage = async (backgroundImage: ImageData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `You are an expert in describing visual scenes for AI image generation. Analyze the provided image and generate a concise, detailed description of the background environment. The description should be suitable for a text-to-image AI model to accurately recreate the scene. Focus on the key elements of the location, lighting, time of day, weather, and overall mood or atmosphere. Do not describe any people or movable objects in the foreground.`;

    const parts = [
      { text: prompt },
      { inlineData: { data: backgroundImage.base64, mimeType: backgroundImage.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error (describeBackgroundFromImage):", error);
    throw new Error('Failed to describe background from image. Please try again.');
  }
};


export const renderProductForTryOn = async (productImage: ImageData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `From the provided image, isolate the clothing item. Render the item on a transparent background, making it look like it's worn on an invisible mannequin to show its natural shape. The final output must be a PNG with a transparent background.`;

    const parts = [
      { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
      { text: prompt },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data; // This is the base64 string of the PNG
      }
    }
    throw new Error('No image data found in the API response for product rendering.');
  } catch (error) {
    console.error("Gemini API Error (renderProductForTryOn):", error);
    throw new Error('Failed to render product. The image might be unclear or unsupported.');
  }
};