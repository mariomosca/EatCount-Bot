#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import path from 'path';

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
            return `${meal.type} (${new Date(meal.timestamp).toLocaleString('it-IT')}):
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
