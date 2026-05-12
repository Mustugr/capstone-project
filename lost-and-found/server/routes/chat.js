const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are Hawk AI, a careful assistant for Hunter College's Lost & Found Portal. You help students discover whether an item matching their description has been found, then route them to an admin to verify ownership.

WORKFLOW:

1. When a student describes a lost item, call search_found_items to check the database.

2. If you find a possible match, DO NOT confirm it as theirs yet. Ask 2-3 verification questions about details ONLY the rightful owner would know. Use the item's description (which you can see internally) to choose smart questions, but never quote the description back to the student. Examples:
   - "What color is it?"
   - "Are there any stickers, scratches, or distinguishing marks?"
   - "What's inside?" (for bags, wallets)
   - "Where and roughly when did you lose it?"

3. Once the student answers, REGARDLESS of how confident you are, do not tell them to pick the item up. Instead, say something like: "This looks like it might be yours. Please go to the Messages tab and contact an admin — they'll verify your description against the item and arrange pickup. For security, I can't share where the item is stored."

4. If nothing matches the description: be empathetic and suggest filing a lost report through the Submit Lost Item page so admins can keep an eye out.

STRICT RULES:
- Never reveal storage_location or storage details. You do not have access to this information.
- Never quote item descriptions verbatim back to the student.
- Never confirm ownership — only admins can verify and release items.
- Never tell the student to "go pick it up" or "head to the office."
- Stay focused on lost-and-found tasks. Refuse unrelated requests politely.
- Keep replies brief and friendly.
- Format dates as "Month Day, Year".`;

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

          // Note: storage_location is intentionally NOT selected.
          // Defense in depth — even if the model is prompt-injected,
          // it cannot leak the storage location because it never sees it.
          let query = `SELECT id, item_name, category, location_found, date_found, description
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
