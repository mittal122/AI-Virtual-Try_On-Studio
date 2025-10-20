import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateImageProps } from '../types';

export const generateTryOnImage = async ({
  userFace,
  productImage,
  modelPose,
  describedPose,
  backgroundImage,
  describedBackground,
  variationInfo,
}: GenerateImageProps): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let prompt = `You are a master digital artist specializing in creating hyper-realistic virtual try-on photographs. Your task is to create an image that is indistinguishable from a real professional photograph.

**Core Task:**
Generate a single, seamless, high-quality photograph by combining the provided elements. The final output must look completely real, with natural posing and physically accurate details.

**Input Breakdown:**
- **Image 1 (User's Face):** Seamlessly integrate this face onto the model. Match the skin tone, texture, and lighting perfectly with the model's body. The expression should be natural and relaxed.
- **Image 2 (Clothing):** Dress the model in this garment. Pay close attention to the fabric's physics—how it drapes, folds, and wrinkles on the body. The texture and material should look tangible.`;

    const parts: object[] = [
      { inlineData: { data: userFace.base64, mimeType: userFace.mimeType } },
      { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
    ];

    if (modelPose) {
      prompt += `\n- **Image 3 (Pose):** The model must adopt this exact body pose.`;
      parts.push({ inlineData: { data: modelPose.base64, mimeType: modelPose.mimeType } });
    } else if (describedPose) {
      prompt += `\n- **Pose Description:** The model's pose should be: "${describedPose}". Ensure it is a natural, physically plausible pose.`;
       if (variationInfo && variationInfo.total > 1) {
        prompt += ` This is variation ${variationInfo.current} of ${variationInfo.total}. Ensure this pose is unique and distinct from the other variations while still matching the core description.`;
      }
    }

    if (backgroundImage) {
      prompt += `\n- **Image 4 (Background):** Use this image as the background for the scene.`;
      parts.push({ inlineData: { data: backgroundImage.base64, mimeType: backgroundImage.mimeType } });
    } else if (describedBackground) {
      prompt += `\n- **Background Description:** The background of the scene should be: "${describedBackground}".`;
    } else {
      prompt += `\n- **Background:** The background should be a neutral, light gray studio setting.`;
    }

    prompt += `

**Key Directives for Realism:**
1.  **Photography Style:** The final image should look like it was shot on a high-end DSLR camera with a 50mm lens, featuring soft, natural lighting.
2.  **Physical Accuracy:** Ensure all shadows and highlights are consistent across the face, body, clothing, and background. 
3.  **Avoid AI Artifacts:** Do not create an image that looks overly smooth, airbrushed, or digitally manipulated. The goal is pure realism, avoiding the "uncanny valley." Maintain natural skin pores and fabric textures. The final result must be a believable photograph.`;
    
    parts.unshift({ text: prompt });

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