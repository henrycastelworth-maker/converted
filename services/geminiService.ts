/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse, GenerateContentParameters, Part } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const imageEditModel = 'gemini-2.5-flash-image-preview';

// --- Helper Functions ---

/**
 * Converts a data URL string to a Gemini-compatible Part object.
 * @param imageDataUrl The data URL of the image.
 * @returns A Gemini Part object.
 */
function fileToGenerativePart(imageDataUrl: string): Part {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
    }
    const [, mimeType, data] = match;
    return {
        inlineData: {
            mimeType,
            data,
        },
    };
}

/**
 * Processes the Gemini API response, extracting the image part or throwing an error.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
function processGeminiResponse(response: GenerateContentResponse): string {
    // For gemini-2.5-flash-image-preview, we must find the image part in the response.
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            const { mimeType, data } = part.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }
    
    // If no image part is found, throw an error with any available text.
    const textResponse = response.text;
    console.error("API did not return an image. Response:", textResponse);
    throw new Error(`The AI model responded with text instead of an image: "${textResponse || 'No text response received.'}"`);
}

/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors.
 * @param request The complete request payload for the generateContent call.
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(request: GenerateContentParameters): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent(request);
        } catch (error) {
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            // Check for common retriable error codes/messages
            const isInternalError = errorMessage.includes('500') || errorMessage.includes('503') || errorMessage.includes('INTERNAL');

            if (isInternalError && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Internal error detected. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error; // Re-throw if not a retriable error or if max retries are reached.
        }
    }
    // This should be unreachable due to the loop and throw logic above.
    throw new Error("Gemini API call failed after all retries.");
}

// --- API Functions ---

/**
 * STEP 1: Removes accessories from a person's photo.
 * @param imageDataUrl Data URL of the model's image.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export async function removeAccessories(imageDataUrl: string): Promise<string> {
    console.log("Attempting to remove accessories...");
    const imagePart = fileToGenerativePart(imageDataUrl);
    const textPart = {
        text: "You are an expert photo editor. The user has provided a photo of themselves, likely framed from the knees up. Edit this image to carefully remove any accessories like glasses, hats, or jewelry. It is extremely important that you **do not change the person's facial features, proportions, body shape, skin texture, or expression**. The output must be a photorealistic edited version of the original image, just without the specified accessories.",
    };

    const response = await callGeminiWithRetry({
        model: imageEditModel,
        contents: { parts: [imagePart, textPart] },
    });
    
    return processGeminiResponse(response);
}

/**
 * STEP 2: Isolates an outfit from its background and model.
 * @param imageDataUrl Data URL of the outfit image.
 * @returns A promise that resolves to the data URL of the isolated outfit image.
 */
export async function isolateOutfit(imageDataUrl: string): Promise<string> {
    console.log("Attempting to isolate outfit...");
    const imagePart = fileToGenerativePart(imageDataUrl);
    const textPart = {
        text: "Analyze the provided image and extract only the clothing items (e.g., shirt, pants, dress, etc.). Remove the person wearing the clothes and any background elements. The output should be an image of just the outfit on a neutral, transparent, or white background, ready to be placed on another model. Do not change the style, color, or shape of the clothing itself.",
    };

    const response = await callGeminiWithRetry({
        model: imageEditModel,
        contents: { parts: [imagePart, textPart] },
    });

    return processGeminiResponse(response);
}

/**
 * STEP 3: Dresses a model with an isolated outfit.
 * @param modelImageUrl Data URL of the prepared model image.
 * @param outfitImageUrl Data URL of the isolated outfit image.
 * @returns A promise that resolves to the data URL of the final fused image.
 */
export async function dressModel(modelImageUrl: string, outfitImageUrl: string): Promise<string> {
    console.log("Attempting to dress model...");
    const modelImagePart = fileToGenerativePart(modelImageUrl);
    const outfitImagePart = fileToGenerativePart(outfitImageUrl);
    const textPart = {
        text: "You are a virtual stylist. The first image is a person (the model) framed from the knees up. The second image is an isolated outfit. Your task is to realistically dress the person from the first image in the outfit from the second image. The final image should show the original person, with their face and body proportions completely unchanged, wearing the new clothes. Ensure the clothing drapes naturally on the person's body and that lighting and shadows are consistent with the original model's photo.",
    };

    const response = await callGeminiWithRetry({
        model: imageEditModel,
        contents: { parts: [modelImagePart, outfitImagePart, textPart] },
    });

    return processGeminiResponse(response);
}
