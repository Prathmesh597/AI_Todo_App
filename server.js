// D:\Github Repo\AI_Todo_App\server.js (Version 5.1 - Prompt Refinement)

const express = require('express');
const path = require('path');

const app = express();
const port = 3000;
const ollamaApiUrl = 'http://127.0.0.1:11434/api/generate';
const llmModelName = 'gemma3:4b';

// Middleware to parse JSON bodies from requests
app.use(express.json());

// Middleware to log all incoming requests (for debugging)
app.use((req, res, next) => {
    console.log(`\n--- New Request ---`);
    console.log(`Incoming ${req.method} request to ${req.url} from ${req.ip}`);
    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
    } else if (req.method === 'POST') {
        console.log('Request Body: (empty or not parsed as JSON)');
    }
    next();
});

// Serve static files FIRST
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to interact with Ollama
app.post('/api/process-task', async (req, res) => {
    console.log('Route Handler: Reached POST /api/process-task endpoint');
    const { userInput, currentTasks } = req.body;

    if (!req.body || typeof userInput === 'undefined' || typeof currentTasks === 'undefined') {
        console.error('Validation Error: Missing or malformed req.body, userInput, or currentTasks.');
        console.error('Received req.body:', req.body);
        return res.status(400).json({ error: 'Bad Request: Missing or malformed userInput or currentTasks' });
    }

    // ***** REFINED PROMPT SECTION *****
    const prompt = `
You are an intelligent to-do list assistant. Your ONLY job is to output commands to update a task list based on user input and the current list.

Current tasks list (array of objects, pay attention to existing text and done status):
${JSON.stringify(currentTasks)}

User's new input: "${userInput}"

Analyze the user's input in relation to the current tasks.
Your output MUST be ONLY ONE of the following command formats, with no other text, no explanations, and no thought process:

1. If the user input is a completely new task, unrelated to existing ones:
   NEW_TASK: {"text": "[new task description]", "done": false}

2. If the user input indicates that an existing task should be split into multiple sub-tasks because part of it is done and/or other parts are now more specific:
   Identify the original task from the "Current tasks list".
   Create sub-tasks for EACH distinct part mentioned in the user's input, reflecting their completion status.
   Example: If current task at index 0 is "Plan weekend trip" and user says "Booked hotel for weekend, still need to plan activities", the output should be:
   UPDATE_TASK: {"original_index": [0], "replace_with": [{"text": "Booked hotel for weekend", "done": true}, {"text": "Plan activities for weekend", "done": false}]}
   Another example: If current task at index 1 is "Buy fruits and vegetables" and user says "Got the fruits, vegetables are pending", the output should be:
   UPDATE_TASK: {"original_index": [1], "replace_with": [{"text": "Buy fruits", "done": true}, {"text": "Buy vegetables", "done": false}]}
   Format:
   UPDATE_TASK: {"original_index": [index_of_task_to_replace_in_current_tasks_array], "replace_with": [{"text": "[sub-task 1 text]", "done": true/false}, {"text": "[sub-task 2 text]", "done": true/false}, ... (can be one or more sub-tasks)]}
   (The original_index is the 0-based index from the "Current tasks list" provided above. It should be an array containing a single number like [0], [1], etc.)

3. If the user input simply marks an entire existing task as DONE or PENDING without splitting it (e.g., user says "Finished 'Call John'" which is at index 2):
   MARK_TASK_STATUS: {"index": [2], "done": true/false}
   (The index should be an array containing a single number like [0], [1], etc.)

4. If the user input is just a comment, unclear, or doesn't require a change to the list:
   NO_CHANGE: {"reason": "[brief reason for no change]"}

Choose ONLY ONE format. Provide real values for placeholders in brackets.
The index for UPDATE_TASK and MARK_TASK_STATUS refers to the 0-based index in the "Current tasks list" you were given.
If current tasks list is empty, and user provides input, treat it as a NEW_TASK.
Do not output the <think> tags or any text outside these exact command formats.
Output the command:
    `;
    // ***** END OF REFINED PROMPT SECTION *****

    console.log(`Ollama Interaction: Sending prompt to Ollama (Model: ${llmModelName})...`);

    try {
        const ollamaResponse = await fetch(ollamaApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: llmModelName, prompt: prompt, stream: false }),
        });

        const responseBodyText = await ollamaResponse.text();
        if (!ollamaResponse.ok) {
            console.error(`Ollama API Error (Model: ${llmModelName}) - Status:`, ollamaResponse.status, 'Body:', responseBodyText);
            if (responseBodyText.includes("model") && responseBodyText.includes("not found")) {
                 return res.status(400).json({ error: `Ollama API: Model '${llmModelName}' not found. Please ensure it's pulled.`, details: responseBodyText });
            }
            return res.status(ollamaResponse.status).json({ error: 'Error from Ollama API', details: responseBodyText });
        }

        const ollamaData = JSON.parse(responseBodyText); 
        
        if (!ollamaData || typeof ollamaData.response === 'undefined') {
            console.error(`Ollama API Response (Model: ${llmModelName}) - Format Error. Parsed Data:`, ollamaData);
            console.error('Ollama API Response - Raw Text that caused format error:', responseBodyText);
            return res.status(500).json({ error: 'Ollama response JSON missing "response" field', details: ollamaData });
        }

        console.log(`Ollama Interaction (Model: ${llmModelName}): Successfully received and parsed response.`);
        res.json({ aiResponse: ollamaData.response.trim() });

    } catch (error) { 
        console.error(`Ollama Interaction (Model: ${llmModelName}): Error during API call, processing response, or non-JSON response:`, error);
        if (error.cause) {
            console.error('Cause of fetch error:', error.cause);
        }
        res.status(500).json({ error: `Failed to connect to Ollama, process its response, or received non-JSON reply for model ${llmModelName}`, details: error.message });
    }
});

// Catch-all for any other routes not handled
app.use((req, res) => {
    console.warn(`Route Not Found (Catch-All): ${req.method} ${req.originalUrl}`);
    res.status(404).send(`Content not found at ${req.method} ${req.originalUrl}`);
});

app.listen(port, () => {
  console.log(`Server (Version 5.1 using ${llmModelName}) running at http://localhost:${port}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
  console.log(`Ensure Ollama is running and model '${llmModelName}' is available.`);
  console.log(`Ollama API URL set to: ${ollamaApiUrl}`);
});