// WebSocket connection
let ws = null;
let isConnected = false;

const messagesContainer = document.getElementById("messages");
const promptInput = document.getElementById("prompt-input");
const sendBtn = document.getElementById("send-btn");
const statusEl = document.getElementById("status");

// Connect to WebSocket
function connect() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    isConnected = true;
    updateStatus("Connected", "connected");
    sendBtn.disabled = false;
  };

  ws.onclose = () => {
    isConnected = false;
    updateStatus("Disconnected - Retrying...", "disconnected");
    sendBtn.disabled = true;
    setTimeout(connect, 2000);
  };

  ws.onerror = error => {
    console.error("WebSocket error:", error);
    updateStatus("Connection error", "disconnected");
  };

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };
}

// Update status indicator
function updateStatus(text, className = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${className}`;
}

// Handle incoming messages
function handleMessage(data) {
  switch (data.type) {
    case "user_message":
      addMessage(data.content, "user");
      break;
    case "assistant_message":
      addMessage(data.content, "assistant");
      break;
    case "tool_call":
      addMessage(`🔧 ${data.tool}: ${data.content}`, "tool");
      break;
    case "tool_result":
      addMessage(`✅ ${data.tool}: ${data.content}`, "tool");
      break;
    case "error":
      addMessage(`❌ Error: ${data.content}`, "error");
      break;
    case "done":
      sendBtn.disabled = false;
      promptInput.disabled = false;
      updateStatus("Connected", "connected");
      break;
  }
}

// Add message to chat
function addMessage(content, type) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${type}`;
  messageEl.textContent = content;
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
function sendMessage() {
  const prompt = promptInput.value.trim();
  if (!prompt || !isConnected) {
    return;
  }

  ws.send(
    JSON.stringify({
      type: "prompt",
      content: prompt,
    }),
  );

  promptInput.value = "";
  sendBtn.disabled = true;
  promptInput.disabled = true;
  updateStatus("Processing...", "");
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);

promptInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Initialize connection
connect();
