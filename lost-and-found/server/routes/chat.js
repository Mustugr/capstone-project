const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are Hawk AI, a friendly assistant for Hunter College's Lost & Found Portal. Your job is to help students find their lost items by searching the database before they contact an admin.

When a student describes a lost item, use the search_found_items tool to look in the database. Be concise and helpful. If you find matching items, list them with key details (item name, where found, date, where it's stored). If nothing matches, suggest the student file a lost report so admins can help.

Always be friendly but brief — students want quick answers, not long explanations. Format dates as "Month Day, Year".`;

const TOOLS = [{
  name: 'search_found_items',
  description: "Search Hunter College's Lost & Found database for unclaimed items matching the student's description.",
  input_schema: {
    type: 'object',
    properties: {
      keywords: {
        type: 'string',
        description: "Keywords from the student's description, matched against item name and description fields. E.g., 'black backpack', 'iphone', 'water bottle'.",
      },
      category: {
        type: 'string',
        description: "Optional category filter. Common categories: 'Backpack / Bag', 'Electronics', 'Clothing', 'Keys', 'Wallet / ID', 'Bottle / Drinkware', 'Books', 'Other'.",
      },
    },
    required: ['keywords'],
  },
}];

router.post('/', requireAuth, async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    let response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    const conversation = [...messages];
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (response.stop_reason === 'tool_use' && iterations < MAX_ITERATIONS) {
      iterations++;
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
      const toolResults = [];

      for (const tool of toolUseBlocks) {
        if (tool.name === 'search_found_items') {
          const { keywords, category } = tool.input;

          let query = `SELECT id, item_name, category, location_found, date_found, description, storage_location
                       FROM found_items WHERE status = 'Unclaimed'`;
          const params = [];

          if (keywords) {
            params.push(`%${keywords}%`);
            const idx = params.length;
            query += ` AND (item_name ILIKE $${idx} OR description ILIKE $${idx})`;
          }
          if (category) {
            params.push(`%${category}%`);
            query += ` AND category ILIKE $${params.length}`;
          }

          query += ' ORDER BY created_at DESC LIMIT 10';

          const dbResult = await pool.query(query, params);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: JSON.stringify(dbResult.rows),
          });
        }
      }

      conversation.push({ role: 'assistant', content: response.content });
      conversation.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: conversation,
      });
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    const reply = textBlock?.text || "Sorry, I couldn't generate a response. Please try again.";

    res.json({ message: reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
