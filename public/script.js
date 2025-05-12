// D:\Github Repo\AI_Todo_App\public\script.js (Version 7.2 - Flexible original_index)

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Script starting.");

    const taskInput = document.getElementById('taskInput');
    const addButton = document.getElementById('addButton');
    const taskList = document.getElementById('taskList');
    const clearButton = document.getElementById('clearButton');

    if (!addButton || !taskInput || !taskList || !clearButton) {
        const missing = [];
        if (!taskInput) missing.push("taskInput");
        if (!addButton) missing.push("addButton");
        if (!taskList) missing.push("taskList");
        if (!clearButton) missing.push("clearButton");
        console.error(`ERROR: Critical UI element(s) not found: ${missing.join(', ')}. App cannot function correctly.`);
        alert(`Critical Error: UI element(s) not found: ${missing.join(', ')}. Please check index.html.`);
        return;
    }

    const localStorageKey = 'aiTodoAppTasks';
    let tasks = [];

    function saveTasks() {
        localStorage.setItem(localStorageKey, JSON.stringify(tasks));
    }

    function loadTasks() {
        const storedTasks = localStorage.getItem(localStorageKey);
        if (storedTasks) {
            try {
                tasks = JSON.parse(storedTasks);
            } catch (e) {
                console.error("Error parsing tasks from localStorage:", e);
                tasks = []; 
                localStorage.removeItem(localStorageKey); 
            }
        } else {
            tasks = [];
        }
        renderTasks();
    }

    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const listItem = document.createElement('li');
            if (task.done) {
                listItem.style.textDecoration = 'line-through';
            }
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.done;
            checkbox.addEventListener('change', () => {
                tasks[index].done = checkbox.checked;
                saveTasks();
                renderTasks();
            });
            const textNode = document.createTextNode(" " + task.text); 
            listItem.appendChild(checkbox);
            listItem.appendChild(textNode);
            taskList.appendChild(listItem);
        });
    }
    
    addButton.addEventListener('click', async () => {
        console.log("Add button clicked!");
        const userInput = taskInput.value.trim();

        if (userInput === "") {
            alert("Please enter a task!");
            return;
        }

        addButton.textContent = 'Processing...';
        addButton.disabled = true;
        let serverResponseData = null; 

        try {
            console.log("SCRIPT.JS: Attempting to fetch /api/process-task");
            const response = await fetch('/api/process-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userInput: userInput, currentTasks: tasks }),
            });
            console.log("SCRIPT.JS: Fetch response received, status:", response.status);

            if (!response.ok) {
                let errorDetails = `Server responded with status: ${response.status}`;
                try {
                    const errorText = await response.text(); 
                    errorDetails = errorText || errorDetails; 
                    serverResponseData = errorText; 
                } catch (e) {
                    console.warn("SCRIPT.JS: Could not get text from error response body:", e);
                }
                console.error('SCRIPT.JS: Error from backend API:', errorDetails);
                alert(`Error from AI Service: ${errorDetails}\nTask added locally as fallback.`);
                tasks.push({ text: userInput + ` (API Error ${response.status} - added locally)`, done: false });
                saveTasks();
                renderTasks();
                return;
            }

            console.log("SCRIPT.JS: Response.ok is true. Attempting to parse JSON.");
            const data = await response.json(); 
            serverResponseData = data; 
            console.log('SCRIPT.JS: Successfully parsed JSON from server. AI Response from data.aiResponse is:', data.aiResponse);
            console.log("RAW AI RESPONSE STRING (before parsing in script.js): >>>" + data.aiResponse + "<<<");
            
            parseAndApplyAIResponse(data.aiResponse, userInput);

        } catch (error) {
            console.error('SCRIPT.JS: Error in addButton click handler (Network, fetch, or JSON parsing issue):', error);
            console.error('SCRIPT.JS: Server response data (if any) before error:', serverResponseData); 
            alert('Failed to connect to the AI service or process its response. Task added locally.');
            tasks.push({ text: userInput + " (connection/parse error - added locally)", done: false });
            saveTasks();
            renderTasks();
        } finally {
            console.log("SCRIPT.JS: Entering finally block for addButton.");
            taskInput.value = "";
            taskInput.focus();
            addButton.textContent = 'Add Task';
            addButton.disabled = false;
            console.log("SCRIPT.JS: addButton UI restored.");
        }
    });

    function parseAndApplyAIResponse(aiResponseText, originalUserInput) {
        aiResponseText = aiResponseText.trim();
        let actionTaken = false;
        console.log("PARSER: Attempting to parse AI response:", aiResponseText);

        if (aiResponseText.startsWith("NEW_TASK:")) {
            console.log("PARSER: Detected NEW_TASK");
            try {
                const jsonString = aiResponseText.substring("NEW_TASK:".length).trim();
                const newTaskData = JSON.parse(jsonString);
                if (newTaskData && typeof newTaskData.text === 'string' && typeof newTaskData.done === 'boolean') {
                    tasks.push({ text: newTaskData.text, done: newTaskData.done });
                    alert(`AI added new task: ${newTaskData.text}`);
                    actionTaken = true;
                } else { throw new Error("NEW_TASK data format incorrect."); }
            } catch (e) {
                console.error("Error parsing NEW_TASK data from AI:", e, "\nAI Response was:", aiResponseText);
                alert("AI response for new task was unclear. Task added literally.");
            }
        } else if (aiResponseText.startsWith("UPDATE_TASK:")) {
            console.log("PARSER: Detected UPDATE_TASK");
            try {
                const jsonString = aiResponseText.substring("UPDATE_TASK:".length).trim();
                const updateData = JSON.parse(jsonString);
                
                let originalIndexValue = -1;
                if (updateData && updateData.hasOwnProperty('original_index')) {
                    if (typeof updateData.original_index === 'number') {
                        originalIndexValue = updateData.original_index;
                    } else if (Array.isArray(updateData.original_index) && updateData.original_index.length === 1 && typeof updateData.original_index[0] === 'number') {
                        originalIndexValue = updateData.original_index[0];
                    }
                }

                if (originalIndexValue !== -1 && Array.isArray(updateData.replace_with)) {
                    const newSubTasks = updateData.replace_with;

                    if (originalIndexValue >= 0 && originalIndexValue < tasks.length) {
                        const validSubTasks = newSubTasks.every(
                            subTask => typeof subTask.text === 'string' && typeof subTask.done === 'boolean'
                        );

                        if (validSubTasks) {
                            tasks.splice(originalIndexValue, 1, ...newSubTasks.map(st => ({text: st.text, done: st.done})));
                            alert(`AI updated task at index ${originalIndexValue} with ${newSubTasks.length} new sub-task(s).`);
                            actionTaken = true;
                        } else {
                            throw new Error("UPDATE_TASK sub-tasks format incorrect.");
                        }
                    } else {
                        throw new Error("UPDATE_TASK original_index out of bounds. Index: " + originalIndexValue + ", Tasks length: " + tasks.length);
                    }
                } else {
                    throw new Error("UPDATE_TASK data format incorrect (original_index or replace_with).");
                }
            } catch (e) {
                console.error("Error parsing UPDATE_TASK data from AI:", e, "\nAI Response was:", aiResponseText);
                alert("AI response for updating task was unclear. Task added literally.");
            }
        } else if (aiResponseText.startsWith("MARK_TASK_STATUS:")) {
            console.log("PARSER: Detected MARK_TASK_STATUS (not implemented)"); // Placeholder for now
            // TODO: Implement MARK_TASK_STATUS parsing
            try {
                const jsonString = aiResponseText.substring("MARK_TASK_STATUS:".length).trim();
                console.log("PARSER: JSON string for MARK_TASK_STATUS:", jsonString);
                const statusData = JSON.parse(jsonString);

                let taskIndexValue = -1;
                if (statusData && statusData.hasOwnProperty('index')) {
                    if (typeof statusData.index === 'number') {
                        taskIndexValue = statusData.index;
                    } else if (Array.isArray(statusData.index) && statusData.index.length === 1 && typeof statusData.index[0] === 'number') {
                        taskIndexValue = statusData.index[0];
                    }
                }

                if (taskIndexValue !== -1 && typeof statusData.done === 'boolean') {
                    if (taskIndexValue >= 0 && taskIndexValue < tasks.length) {
                        tasks[taskIndexValue].done = statusData.done;
                        alert(`AI marked task '${tasks[taskIndexValue].text}' as ${statusData.done ? 'DONE' : 'PENDING'}.`);
                        actionTaken = true;
                    } else {
                        throw new Error("MARK_TASK_STATUS index out of bounds. Index: " + taskIndexValue + ", Tasks length: " + tasks.length);
                    }
                } else {
                    throw new Error("MARK_TASK_STATUS data format incorrect (index or done).");
                }
            } catch (e) {
                console.error("Error parsing MARK_TASK_STATUS data from AI:", e, "\nAI Response was:", aiResponseText);
                alert("AI response for marking task status was unclear. No change made.");
            }
        } else if (aiResponseText.startsWith("NO_CHANGE:")) {
            console.log("PARSER: Detected NO_CHANGE");
            try {
                const jsonString = aiResponseText.substring("NO_CHANGE:".length).trim();
                const noChangeData = JSON.parse(jsonString);
                alert(`AI indicated no change needed: ${noChangeData.reason || 'No specific reason given.'}`);
                actionTaken = true; 
            } catch (e) {
                console.error("Error parsing NO_CHANGE data from AI:", e, "\nAI Response was:", aiResponseText);
                alert(`AI response for no change was unclear: ${aiResponseText}`);
            }
        }
        
        if (!actionTaken) {
            const knownCommandAttempted = aiResponseText.startsWith("NEW_TASK:") ||
                                          aiResponseText.startsWith("UPDATE_TASK:") ||
                                          aiResponseText.startsWith("MARK_TASK_STATUS:") ||
                                          aiResponseText.startsWith("NO_CHANGE:");
            if (!knownCommandAttempted) {
                console.warn("PARSER: Unknown AI command or malformed response:", aiResponseText);
                alert(`AI response was not a recognized command: ${aiResponseText}\nTask added literally.`);
                tasks.push({ text: originalUserInput + " (AI unknown response, raw input added)", done: false });
            }
        }

        saveTasks();
        renderTasks();
        console.log("PARSER: Finished parsing and updated UI.");
    }

    clearButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all tasks?")) {
            tasks = []; 
            saveTasks();  
            renderTasks();
            console.log("Tasks cleared.");
        }
    });

    console.log("Event listeners for addButton and clearButton attached.");
    loadTasks();
});