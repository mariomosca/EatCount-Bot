import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CreaCsvRow {
  name: string;
  energy_kcal: string;
  proteins: string;
  lipids: string;
  available_carbohydrates: string;
  total_fiber: string;
  soluble_sugars: string;
  Saturated_fatty_acids: string;
  sodium: string;
}

interface CreaFood {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
}

const CSV_PATH = path.join(__dirname, 'data', 'crea_food_composition_tables.csv');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'crea-foods.json');

function parseCSV(content: string): CreaCsvRow[] {
  const lines = content.split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim());

  const nameIndex = headers.indexOf('name');
  const energyIndex = headers.indexOf('energy_kcal');
  const proteinsIndex = headers.indexOf('proteins');
  const lipidsIndex = headers.indexOf('lipids');
  const carbsIndex = headers.indexOf('available_carbohydrates');
  const fiberIndex = headers.indexOf('total_fiber');
  const sugarsIndex = headers.indexOf('soluble_sugars');
  const saturatedFatIndex = headers.indexOf('Saturated_fatty_acids');
  const sodiumIndex = headers.indexOf('sodium');

  if (nameIndex === -1 || energyIndex === -1 || proteinsIndex === -1 ||
      lipidsIndex === -1 || carbsIndex === -1) {
    throw new Error('CSV missing required columns');
  }

  const results: CreaCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = splitCsvLine(line);

    if (values.length <= nameIndex) continue;

    const row: CreaCsvRow = {
      name: values[nameIndex] || '',
      energy_kcal: values[energyIndex] || '',
      proteins: values[proteinsIndex] || '',
      lipids: values[lipidsIndex] || '',
      available_carbohydrates: values[carbsIndex] || '',
      total_fiber: fiberIndex >= 0 ? (values[fiberIndex] || '') : '',
      soluble_sugars: sugarsIndex >= 0 ? (values[sugarsIndex] || '') : '',
      Saturated_fatty_acids: saturatedFatIndex >= 0 ? (values[saturatedFatIndex] || '') : '',
      sodium: sodiumIndex >= 0 ? (values[sodiumIndex] || '') : '',
    };

    results.push(row);
  }

  return results;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function parseNumber(value: string): number | null {
  if (!value || value.trim() === '' || value === '0' || value === 'tr') {
    return null;
  }
  const parsed = parseFloat(value.replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
}

function convertToCreaFood(row: CreaCsvRow): CreaFood | null {
  const calories = parseNumber(row.energy_kcal);
  const protein = parseNumber(row.proteins);
  const fat = parseNumber(row.lipids);
  const carbs = parseNumber(row.available_carbohydrates);

  if (!calories || !protein || !fat || !carbs) {
    return null;
  }

  const fiber = parseNumber(row.total_fiber) || 0;
  const sugar = parseNumber(row.soluble_sugars) || 0;
  const saturatedFat = parseNumber(row.Saturated_fatty_acids) || 0;
  const sodium = parseNumber(row.sodium) || 0;

  return {
    name: row.name.replace(/^"|"$/g, '').trim(),
    calories: Math.round(calories * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
    sugar: Math.round(sugar * 10) / 10,
    saturatedFat: Math.round(saturatedFat * 10) / 10,
    sodium: Math.round(sodium * 10) / 10,
  };
}

function main() {
  console.log('Reading CSV file:', CSV_PATH);

  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV file not found:', CSV_PATH);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const csvRows = parseCSV(csvContent);

  console.log(`Parsed ${csvRows.length} rows from CSV`);

  const creaFoods: CreaFood[] = [];

  for (const row of csvRows) {
    const food = convertToCreaFood(row);
    if (food) {
      creaFoods.push(food);
    }
  }

  console.log(`Converted ${creaFoods.length} valid foods`);

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(creaFoods, null, 2), 'utf-8');

  console.log('Output written to:', OUTPUT_PATH);
  console.log(`File size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(2)} KB`);
}

main();
