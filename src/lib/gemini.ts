import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageSize } from "../types";

export async function generateImage(params: {
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  useSearch: boolean;
  base64Image?: string;
  mimeType?: string;
  apiKey: string;
}) {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const model = ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: {
      parts: [
        ...(params.base64Image ? [{
          inlineData: {
            data: params.base64Image,
            mimeType: params.mimeType || "image/png"
          }
        }] : []),
        { text: params.prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: params.aspectRatio,
        imageSize: params.imageSize
      },
      ...(params.useSearch ? { tools: [{ googleSearch: {} }] } : {})
    }
  });

  const response = await model;
  
  let imageUrl = "";
  let text = "";

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
    } else if (part.text) {
      text += part.text;
    }
  }

  if (!imageUrl) {
    throw new Error("No image was generated. " + text);
  }

  return { imageUrl, text };
}
