# AI-Powered To-Do List

This is a smart to-do list application powered by a local Large Language Model (LLM) run via Ollama. It can understand natural language updates to manage your tasks.

This project was developed with the assistance of an AI coding partner.

## Features

*   Add new tasks.
*   Intelligently update tasks based on natural language:
    *   Splitting a general task into specific sub-tasks.
    *   Marking parts of a task as complete while others remain pending.
    *   (Future: Marking entire tasks as done/pending directly).
*   Tasks persist in the browser's local storage.
*   "Clear All Tasks" functionality.
*   Responsive design for a good user experience on different screen sizes.

## Demo

Watch the application in action:

![AI To-Do App Demo](./Data/Demo.gif)

## Screenshots

**Main Interface after adding tasks:**
![Screenshot of Main Interface](./Data/Screenshot%201.jpg)

**Example of AI understanding an update (task splitting):**
![Screenshot of Task Update](./Data/Screenshot%202.jpg)

## Tech Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript
*   **Backend:** Node.js with Express.js (for serving files and as an API proxy)
*   **LLM Orchestration:** Ollama
*   **LLM:** gemma3:4b (can be configured to other models supported by Ollama)
*   **Version Control:** Git & GitHub

## Setup & Run

1.  **Prerequisites:**
    *   Node.js (v18+ recommended) and npm installed.
    *   Ollama installed and running ([ollama.com](https://ollama.com/)).
    *   The specified LLM (e.g., `gemma3:4b`) pulled via Ollama:
        ```bash
        ollama pull gemma3:4b
        ```
2.  **Clone the repository (or download if you're just running it):**
    ```bash
    git clone https://github.com/Prathmesh597/AI_Todo_App.git
    cd AI_Todo_App
    ```
3.  **Install dependencies:**
    (This installs Express.js, which is used by `server.js`)
    ```bash
    npm install
    ```
4.  **Run the server:**
    Make sure Ollama is running in the background with the chosen model available.
    ```bash
    npm start
    ```
5.  Open your browser and navigate to `http://localhost:3000`.

## How It Works

The application uses a Node.js/Express backend primarily to serve the frontend static files and to act as a proxy for API calls to the local Ollama service.

When a user adds or updates a task:
1.  The frontend (`script.js`) sends the user's input and the current list of tasks to a backend API endpoint (`/api/process-task` in `server.js`).
2.  The backend server constructs a detailed prompt, including the current tasks and the user's new input, and sends it to the Ollama API, specifying the LLM to use (e.g., `gemma3:4b`).
3.  The LLM processes the prompt and generates a structured command (e.g., `NEW_TASK: {...}`, `UPDATE_TASK: {...}`) indicating how the task list should be modified.
4.  The backend server forwards this structured command back to the frontend.
5.  The frontend JavaScript parses this command and updates the task list in the UI and in `localStorage`.


