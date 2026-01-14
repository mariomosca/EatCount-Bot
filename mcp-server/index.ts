#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from parent directory
dotenv.config({ path: path.join(import.meta.dirname, '..', '.env') });

// API configuration
const API_BASE_URL = process.env.DIET_API_URL || 'http://localhost:3000';
const API_KEY = process.env.DIET_API_KEY || '';

// Helper for API calls
async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

const server = new Server(
  {
    name: 'diet-logger-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_meals',
        description:
          'Get meals for a specific date or date range. Returns meal details with nutritional info.',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format. Defaults to today.',
            },
            startDate: {
              type: 'string',
              description: 'Start date for range query (YYYY-MM-DD)',
            },
            endDate: {
              type: 'string',
              description: 'End date for range query (YYYY-MM-DD)',
            },
            mealType: {
              type: 'string',
              enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
              description: 'Filter by meal type',
            },
          },
        },
      },
      {
        name: 'get_daily_summary',
        description:
          'Get daily nutritional summary with totals for calories, protein, fat, carbs and progress towards target.',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format. Defaults to today.',
            },
          },
        },
      },
      {
        name: 'get_weekly_summary',
        description:
          'Get weekly nutritional summary with daily breakdown and averages.',
        inputSchema: {
          type: 'object',
          properties: {
            weekOffset: {
              type: 'number',
              description:
                'Week offset from current week. 0 = this week, -1 = last week. Defaults to 0.',
            },
          },
        },
      },
      {
        name: 'get_target',
        description: 'Get the current daily calorie target.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'set_target',
        description: 'Set a new daily calorie target.',
        inputSchema: {
          type: 'object',
          properties: {
            calories: {
              type: 'number',
              description: 'New calorie target (e.g., 2000)',
            },
          },
          required: ['calories'],
        },
      },
      {
        name: 'add_meal',
        description:
          'Add a new meal entry with nutritional data. Use this to log food.',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description:
                'Description of the meal (e.g., "pasta al pomodoro 200g, insalata 100g")',
            },
            mealType: {
              type: 'string',
              enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
              description: 'Type of meal',
            },
            calories: {
              type: 'number',
              description: 'Total calories',
            },
            protein: {
              type: 'number',
              description: 'Protein in grams',
            },
            fat: {
              type: 'number',
              description: 'Fat in grams',
            },
            carbs: {
              type: 'number',
              description: 'Carbohydrates in grams',
            },
          },
          required: ['description', 'mealType', 'calories'],
        },
      },
      {
        name: 'delete_meal',
        description: 'Delete a meal by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            mealId: {
              type: 'string',
              description: 'ID of the meal to delete',
            },
          },
          required: ['mealId'],
        },
      },
      {
        name: 'update_meal',
        description:
          'Update an existing meal. You can modify description, meal type, nutritional values, or move it to a different date/time.',
        inputSchema: {
          type: 'object',
          properties: {
            mealId: {
              type: 'string',
              description: 'ID of the meal to update',
            },
            description: {
              type: 'string',
              description: 'New description of the meal',
            },
            mealType: {
              type: 'string',
              enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
              description: 'New meal type',
            },
            calories: {
              type: 'number',
              description: 'New total calories',
            },
            protein: {
              type: 'number',
              description: 'New protein in grams',
            },
            fat: {
              type: 'number',
              description: 'New fat in grams',
            },
            carbs: {
              type: 'number',
              description: 'New carbohydrates in grams',
            },
            timestamp: {
              type: 'string',
              description:
                'New date/time for the meal in ISO format (e.g., 2024-01-15T12:30:00)',
            },
          },
          required: ['mealId'],
        },
      },
      {
        name: 'get_nutrition_plan',
        description:
          'Get the active nutrition plan with all days and meals. Returns the complete weekly plan.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_today_plan',
        description:
          "Get today's nutrition plan. Shows what meals are planned for today with target calories.",
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_plan_for_day',
        description:
          'Get nutrition plan for a specific day of the week (1=Monday, 7=Sunday).',
        inputSchema: {
          type: 'object',
          properties: {
            dayOfWeek: {
              type: 'number',
              description: 'Day of week (1=Monday, 2=Tuesday, ..., 7=Sunday)',
              minimum: 1,
              maximum: 7,
            },
          },
          required: ['dayOfWeek'],
        },
      },
      {
        name: 'get_plan_meal',
        description:
          "Get planned meal for today by meal type. Shows what was planned for breakfast/lunch/dinner/snack today.",
        inputSchema: {
          type: 'object',
          properties: {
            mealType: {
              type: 'string',
              enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
              description: 'Type of meal to get from plan',
            },
          },
          required: ['mealType'],
        },
      },
      {
        name: 'update_meal_plan_meal',
        description:
          'Update a single meal in the nutrition plan. Allows modifying target calories, description, or details.',
        inputSchema: {
          type: 'object',
          properties: {
            mealId: {
              type: 'string',
              description: 'ID of the planned meal to update',
            },
            targetKcal: {
              type: 'number',
              description: 'New target calories for this meal',
            },
            description: {
              type: 'string',
              description: 'New description for this meal',
            },
            details: {
              type: 'string',
              description: 'New details/ingredients for this meal',
            },
          },
          required: ['mealId'],
        },
      },
      {
        name: 'update_meal_plan_day',
        description:
          'Update all meals for a specific day in the nutrition plan. Replaces all meals for that day.',
        inputSchema: {
          type: 'object',
          properties: {
            dayOfWeek: {
              type: 'number',
              description: 'Day of week to update (1=Monday, 7=Sunday)',
              minimum: 1,
              maximum: 7,
            },
            meals: {
              type: 'array',
              description: 'Array of meals for this day',
              items: {
                type: 'object',
                properties: {
                  mealType: {
                    type: 'string',
                    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
                  },
                  targetKcal: { type: 'number' },
                  description: { type: 'string' },
                  details: { type: 'string' },
                },
                required: ['mealType', 'targetKcal', 'description'],
              },
            },
          },
          required: ['dayOfWeek', 'meals'],
        },
      },
      {
        name: 'upload_meal_plan_pdf',
        description:
          'Upload and parse a nutrition plan PDF from a local file path. The PDF will be analyzed using AI to extract meals and calories.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Absolute path to the PDF file on the local filesystem',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'upload_meal_plan_json',
        description:
          'Upload a nutrition plan from structured JSON data. Bypasses PDF parsing.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the nutrition plan',
            },
            days: {
              type: 'array',
              description: 'Array of days with meals',
              items: {
                type: 'object',
                properties: {
                  dayOfWeek: {
                    type: 'number',
                    description: '1=Monday, 7=Sunday',
                  },
                  meals: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        mealType: {
                          type: 'string',
                          enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
                        },
                        targetKcal: { type: 'number' },
                        description: { type: 'string' },
                        details: { type: 'string' },
                      },
                      required: ['mealType', 'targetKcal', 'description'],
                    },
                  },
                },
                required: ['dayOfWeek', 'meals'],
              },
            },
          },
          required: ['name', 'days'],
        },
      },
      {
        name: 'delete_meal_plan',
        description:
          'Delete the active nutrition plan completely. This cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Tool implementations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_meals': {
        const { date, startDate, endDate, mealType } = args as {
          date?: string;
          startDate?: string;
          endDate?: string;
          mealType?: string;
        };

        const params = new URLSearchParams();
        if (date) params.set('date', date);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (mealType) params.set('mealType', mealType);

        const data = await apiCall(`/meals?${params.toString()}`);

        if (data.meals.length === 0) {
          return {
            content: [
              { type: 'text', text: 'No meals found for the specified date/range.' },
            ],
          };
        }

        const mealsText = data.meals
          .map((meal: any) => {
            const itemsList = meal.items
              .map((item: any) => `  - ${item.name}: ${item.calories} kcal`)
              .join('\n');
            return `[ID: ${meal.id}] ${meal.type} (${new Date(meal.timestamp).toLocaleString('it-IT')}):
${meal.description}
${itemsList}
Total: ${meal.totalCalories} kcal | P: ${meal.totalProtein}g | F: ${meal.totalFat}g | C: ${meal.totalCarbs}g`;
          })
          .join('\n\n');

        return {
          content: [{ type: 'text', text: mealsText }],
        };
      }

      case 'get_daily_summary': {
        const { date } = args as { date?: string };
        const params = date ? `?date=${date}` : '';
        const data = await apiCall(`/summary/daily${params}`);

        const summary = `Daily Summary for ${data.date}:

Meals logged: ${data.mealsCount}
Total Calories: ${data.totals.calories} kcal
Protein: ${data.totals.protein.toFixed(1)}g
Fat: ${data.totals.fat.toFixed(1)}g
Carbs: ${data.totals.carbs.toFixed(1)}g

Target: ${data.target} kcal
Progress: ${data.percentage}%
Remaining: ${data.remaining} kcal`;

        return {
          content: [{ type: 'text', text: summary }],
        };
      }

      case 'get_weekly_summary': {
        const { weekOffset = 0 } = args as { weekOffset?: number };
        const data = await apiCall(`/summary/weekly?weekOffset=${weekOffset}`);

        let summary = `Weekly Summary (${data.weekStart} - ${data.weekEnd}):\n\n`;

        const days = Object.keys(data.dailyTotals).sort();
        days.forEach((day) => {
          const d = data.dailyTotals[day];
          const pct = Math.round((d.calories / data.target) * 100);
          summary += `${day}: ${d.calories} kcal (${pct}%) | P: ${d.protein.toFixed(0)}g | F: ${d.fat.toFixed(0)}g | C: ${d.carbs.toFixed(0)}g\n`;
        });

        if (data.daysLogged > 0) {
          summary += `\nAverage: ${data.averageCalories} kcal/day`;
        }

        return {
          content: [{ type: 'text', text: summary }],
        };
      }

      case 'get_target': {
        const data = await apiCall('/target');
        return {
          content: [
            {
              type: 'text',
              text: data.target
                ? `Current calorie target: ${data.target} kcal/day`
                : 'No calorie target set.',
            },
          ],
        };
      }

      case 'set_target': {
        const { calories } = args as { calories: number };
        await apiCall('/target', {
          method: 'PUT',
          body: JSON.stringify({ calories }),
        });

        return {
          content: [
            { type: 'text', text: `Calorie target set to ${calories} kcal/day.` },
          ],
        };
      }

      case 'add_meal': {
        const { description, mealType, calories, protein, fat, carbs } = args as {
          description: string;
          mealType: string;
          calories: number;
          protein?: number;
          fat?: number;
          carbs?: number;
        };

        await apiCall('/meals', {
          method: 'POST',
          body: JSON.stringify({ description, mealType, calories, protein, fat, carbs }),
        });

        return {
          content: [
            {
              type: 'text',
              text: `Meal added: ${mealType} - ${description} (${calories} kcal)`,
            },
          ],
        };
      }

      case 'delete_meal': {
        const { mealId } = args as { mealId: string };
        await apiCall(`/meals/${mealId}`, { method: 'DELETE' });

        return {
          content: [{ type: 'text', text: `Meal ${mealId} deleted.` }],
        };
      }

      case 'update_meal': {
        const { mealId, description, mealType, calories, protein, fat, carbs, timestamp } =
          args as {
            mealId: string;
            description?: string;
            mealType?: string;
            calories?: number;
            protein?: number;
            fat?: number;
            carbs?: number;
            timestamp?: string;
          };

        const updateData: Record<string, any> = {};
        if (description !== undefined) updateData.description = description;
        if (mealType !== undefined) updateData.mealType = mealType;
        if (calories !== undefined) updateData.calories = calories;
        if (protein !== undefined) updateData.protein = protein;
        if (fat !== undefined) updateData.fat = fat;
        if (carbs !== undefined) updateData.carbs = carbs;
        if (timestamp !== undefined) updateData.timestamp = timestamp;

        const data = await apiCall(`/meals/${mealId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });

        const updatedFields = Object.keys(updateData).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Meal ${mealId} updated. Changed: ${updatedFields}. New values: ${data.meal.description} (${data.meal.totalCalories} kcal)`,
            },
          ],
        };
      }

      case 'get_nutrition_plan': {
        const data = await apiCall('/plans');

        if (!data.plan) {
          return {
            content: [{ type: 'text', text: 'No nutrition plan found. Upload a PDF via Telegram bot to create one.' }],
          };
        }

        const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const mealTypeNames: Record<string, string> = {
          BREAKFAST: 'Breakfast',
          LUNCH: 'Lunch',
          SNACK: 'Snack',
          DINNER: 'Dinner',
        };

        let planText = `📋 ${data.plan.name}\n\n`;

        for (const day of data.plan.days) {
          planText += `**${dayNames[day.dayOfWeek]}**\n`;
          const totalKcal = day.meals.reduce((sum: number, m: any) => sum + m.targetKcal, 0);

          for (const meal of day.meals) {
            planText += `  ${mealTypeNames[meal.mealType]}: ${meal.description} (${meal.targetKcal} kcal)\n`;
          }
          planText += `  Total: ${totalKcal} kcal\n\n`;
        }

        return {
          content: [{ type: 'text', text: planText }],
        };
      }

      case 'get_today_plan': {
        const data = await apiCall('/plans/today');

        if (!data.day) {
          return {
            content: [{ type: 'text', text: data.message || 'No plan for today.' }],
          };
        }

        const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const mealTypeNames: Record<string, string> = {
          BREAKFAST: 'Breakfast',
          LUNCH: 'Lunch',
          SNACK: 'Snack',
          DINNER: 'Dinner',
        };

        let planText = `📋 Today's Plan (${dayNames[data.day.dayOfWeek]})\n\n`;
        const totalKcal = data.day.meals.reduce((sum: number, m: any) => sum + m.targetKcal, 0);

        for (const meal of data.day.meals) {
          planText += `${mealTypeNames[meal.mealType]}: ${meal.description}\n`;
          planText += `  Target: ${meal.targetKcal} kcal\n`;
          if (meal.details) {
            planText += `  Details: ${meal.details}\n`;
          }
          planText += '\n';
        }

        planText += `Total Target: ${totalKcal} kcal`;

        return {
          content: [{ type: 'text', text: planText }],
        };
      }

      case 'get_plan_for_day': {
        const { dayOfWeek } = args as { dayOfWeek: number };
        const data = await apiCall(`/plans/day/${dayOfWeek}`);

        if (!data.day) {
          return {
            content: [{ type: 'text', text: data.message || 'No plan for this day.' }],
          };
        }

        const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const mealTypeNames: Record<string, string> = {
          BREAKFAST: 'Breakfast',
          LUNCH: 'Lunch',
          SNACK: 'Snack',
          DINNER: 'Dinner',
        };

        let planText = `📋 Plan for ${dayNames[dayOfWeek]}\n\n`;
        const totalKcal = data.day.meals.reduce((sum: number, m: any) => sum + m.targetKcal, 0);

        for (const meal of data.day.meals) {
          planText += `${mealTypeNames[meal.mealType]}: ${meal.description}\n`;
          planText += `  Target: ${meal.targetKcal} kcal\n`;
          if (meal.details) {
            planText += `  Details: ${meal.details}\n`;
          }
          planText += '\n';
        }

        planText += `Total Target: ${totalKcal} kcal`;

        return {
          content: [{ type: 'text', text: planText }],
        };
      }

      case 'get_plan_meal': {
        const { mealType } = args as { mealType: string };
        const data = await apiCall(`/plans/meal/${mealType}`);

        if (!data.meal) {
          return {
            content: [{ type: 'text', text: data.message || 'No meal found for this type in today\'s plan.' }],
          };
        }

        const mealTypeNames: Record<string, string> = {
          BREAKFAST: 'Breakfast',
          LUNCH: 'Lunch',
          SNACK: 'Snack',
          DINNER: 'Dinner',
        };

        let mealText = `📋 Planned ${mealTypeNames[mealType]} for Today\n\n`;
        mealText += `${data.meal.description}\n`;
        mealText += `Target: ${data.meal.targetKcal} kcal\n`;
        if (data.meal.details) {
          mealText += `Details: ${data.meal.details}`;
        }

        return {
          content: [{ type: 'text', text: mealText }],
        };
      }

      case 'update_meal_plan_meal': {
        const { mealId, targetKcal, description, details } = args as {
          mealId: string;
          targetKcal?: number;
          description?: string;
          details?: string;
        };

        const updateData: Record<string, any> = {};
        if (targetKcal !== undefined) updateData.targetKcal = targetKcal;
        if (description !== undefined) updateData.description = description;
        if (details !== undefined) updateData.details = details;

        const data = await apiCall(`/plans/meal/${mealId}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        });

        return {
          content: [
            {
              type: 'text',
              text: `Meal updated successfully: ${data.meal.description} (${data.meal.targetKcal} kcal)`,
            },
          ],
        };
      }

      case 'update_meal_plan_day': {
        const { dayOfWeek, meals } = args as {
          dayOfWeek: number;
          meals: Array<{
            mealType: string;
            targetKcal: number;
            description: string;
            details?: string;
          }>;
        };

        const data = await apiCall(`/plans/day/${dayOfWeek}`, {
          method: 'PATCH',
          body: JSON.stringify({ meals }),
        });

        const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const totalKcal = meals.reduce((sum, m) => sum + m.targetKcal, 0);

        return {
          content: [
            {
              type: 'text',
              text: `Day updated successfully: ${dayNames[dayOfWeek]} with ${meals.length} meals (${totalKcal} kcal total)`,
            },
          ],
        };
      }

      case 'upload_meal_plan_pdf': {
        const { filePath } = args as { filePath: string };

        // Read file from filesystem
        if (!fs.existsSync(filePath)) {
          return {
            content: [{ type: 'text', text: `File not found: ${filePath}` }],
            isError: true,
          };
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);

        // Create FormData and upload
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        formData.append('file', blob, fileName);

        const headers: Record<string, string> = {};
        if (API_KEY) {
          headers['X-API-Key'] = API_KEY;
        }

        const response = await fetch(`${API_BASE_URL}/api/plans/upload`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: response.statusText }));
          return {
            content: [{ type: 'text', text: `Upload failed: ${error.error}` }],
            isError: true,
          };
        }

        const data = await response.json();
        const totalMeals = data.plan.days.reduce((sum: number, d: any) => sum + d.meals.length, 0);

        return {
          content: [
            {
              type: 'text',
              text: `Plan "${data.plan.name}" uploaded successfully! ${data.plan.days.length} days, ${totalMeals} meals.`,
            },
          ],
        };
      }

      case 'upload_meal_plan_json': {
        const { name, days } = args as {
          name: string;
          days: Array<{
            dayOfWeek: number;
            meals: Array<{
              mealType: string;
              targetKcal: number;
              description: string;
              details?: string;
            }>;
          }>;
        };

        const data = await apiCall('/plans', {
          method: 'POST',
          body: JSON.stringify({ name, days }),
        });

        const totalMeals = days.reduce((sum, d) => sum + d.meals.length, 0);

        return {
          content: [
            {
              type: 'text',
              text: `Plan "${name}" created successfully! ${days.length} days, ${totalMeals} meals.`,
            },
          ],
        };
      }

      case 'delete_meal_plan': {
        const data = await apiCall('/plans', { method: 'DELETE' });

        return {
          content: [{ type: 'text', text: 'Nutrition plan deleted successfully.' }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Diet Logger MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
