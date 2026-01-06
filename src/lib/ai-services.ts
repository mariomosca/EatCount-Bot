import { getOpenaiClient } from './openai-client.js';
import logger from './logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pdf } from 'pdf-to-img';

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
export const analyzeFoodImage = async (
  imageUrl: string,
  userHint?: string
): Promise<string> => {
  try {
    // Build user prompt with optional hint from caption
    let userPrompt =
      'What food do you see in this image? Describe each item with estimated weight in grams.';
    if (userHint) {
      userPrompt += `\n\nThe user provided this additional context: "${userHint}". Use this to improve your analysis (e.g., exact portion sizes, specific ingredients, or dish name).`;
    }

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
              text: userPrompt,
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

/**
 * Types for nutrition plan parsing
 */
export interface ParsedMeal {
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  targetKcal: number;
  description: string;
  details: string | null;
}

export interface ParsedDay {
  dayOfWeek: number; // 1=Monday, 7=Sunday
  meals: ParsedMeal[];
}

export interface ParsedNutritionPlan {
  name: string;
  days: ParsedDay[];
}

/**
 * Parse nutrition plan from PDF using GPT-4o Vision
 */
export const parseNutritionPlanPDF = async (
  pdfBuffer: Buffer,
  filename: string = 'plan.pdf'
): Promise<ParsedNutritionPlan> => {
  try {
    logger.info(`[NutritionPlan]: Starting PDF parsing for ${filename}`);

    // Convert PDF pages to images
    const tempPath = path.join(os.tmpdir(), `plan_${Date.now()}_${filename}`);
    fs.writeFileSync(tempPath, pdfBuffer);

    const images: string[] = [];
    const document = await pdf(tempPath, { scale: 2.0 });

    for await (const page of document) {
      const base64 = page.toString('base64');
      images.push(`data:image/png;base64,${base64}`);
    }

    // Cleanup temp file
    fs.unlinkSync(tempPath);

    logger.info(`[NutritionPlan]: Converted ${images.length} pages to images`);

    // Send all pages to GPT-4o Vision
    const imageContent = images.map((img) => ({
      type: 'image_url' as const,
      image_url: { url: img, detail: 'high' as const },
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Sei un assistente che analizza piani nutrizionali. Estrai le informazioni dal piano e restituisci SOLO un JSON valido senza markdown.

Il JSON deve avere questa struttura esatta:
{
  "name": "Nome del piano (es: Piano Alimentare Dr. Capasso)",
  "days": [
    {
      "dayOfWeek": 1,
      "meals": [
        {
          "mealType": "BREAKFAST",
          "targetKcal": 400,
          "description": "Nome del pasto (es: Yogurt greco con mandorle e miele)",
          "details": "Dettagli ingredienti (es: 200g yogurt greco, 20g mandorle, 10g miele)"
        }
      ]
    }
  ]
}

Regole:
- dayOfWeek: 1=Lunedì, 2=Martedì, 3=Mercoledì, 4=Giovedì, 5=Venerdì, 6=Sabato, 7=Domenica
- mealType: solo BREAKFAST, LUNCH, SNACK, DINNER
- Se "Spuntino" mappalo a SNACK
- Estrai le kcal dal testo (es: "Colazione (400 kcal)" -> targetKcal: 400)
- description: nome breve del pasto
- details: ingredienti con quantità

Restituisci SOLO il JSON, niente altro testo.`,
        },
        {
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text' as const,
              text: 'Analizza questo piano nutrizionale settimanale ed estrai tutti i dati in formato JSON.',
            },
          ],
        },
      ],
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Vision API');
    }

    // Parse JSON response (handle potential markdown wrapping)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed: ParsedNutritionPlan = JSON.parse(jsonStr);

    logger.info(
      `[NutritionPlan]: Successfully parsed plan "${parsed.name}" with ${parsed.days.length} days`
    );

    return parsed;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[NutritionPlan]: Failed to parse PDF: ${errorMessage}`);
    throw new Error(`Failed to parse nutrition plan PDF: ${errorMessage}`);
  }
};
