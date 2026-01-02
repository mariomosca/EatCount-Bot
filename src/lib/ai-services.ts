import { getOpenaiClient } from './openai-client.js';
import logger from './logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const openai = getOpenaiClient();

/**
 * Transcribe audio using OpenAI Whisper API
 */
export const transcribeAudio = async (
  audioBuffer: Buffer,
  filename: string = 'audio.ogg'
): Promise<string> => {
  try {
    // Write buffer to temp file (Whisper API requires a file)
    const tempPath = path.join(os.tmpdir(), `whisper_${Date.now()}_${filename}`);
    fs.writeFileSync(tempPath, audioBuffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language: 'it', // Italian - change as needed
    });

    // Cleanup temp file
    fs.unlinkSync(tempPath);

    logger.info(`[Whisper]: Transcribed audio: "${transcription.text}"`);
    return transcription.text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Whisper]: Failed to transcribe audio: ${errorMessage}`);
    throw new Error(`Failed to transcribe audio: ${errorMessage}`);
  }
};

/**
 * Analyze food image using GPT-4 Vision
 */
export const analyzeFoodImage = async (imageUrl: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a nutrition assistant. Analyze the food in the image and describe what you see in a format suitable for calorie tracking.

List each food item with estimated portion size in grams. Be specific about ingredients.

Example output format:
"pasta al pomodoro 200g, insalata mista 100g, pane 50g"

Keep the description concise and focused on the food items visible.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: 'What food do you see in this image? Describe each item with estimated weight in grams.',
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Vision API');
    }

    logger.info(`[Vision]: Analyzed image: "${content}"`);
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Vision]: Failed to analyze image: ${errorMessage}`);
    throw new Error(`Failed to analyze image: ${errorMessage}`);
  }
};

/**
 * Analyze food image from base64 data
 */
export const analyzeFoodImageBase64 = async (
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  const dataUrl = `data:${mimeType};base64,${base64Data}`;
  return analyzeFoodImage(dataUrl);
};
