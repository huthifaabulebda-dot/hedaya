const BACKEND_API_URL = (() => {
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api/ask-ai';
  }
  return '/api/ask-ai';
})();

const aiQuestion = document.getElementById("aiQuestion");
const askAiBtn = document.getElementById("askAiBtn");
const clearBtn = document.getElementById("clearBtn");
const loadingSpinner = document.getElementById("loadingSpinner");
const messagesList = document.getElementById("messagesList");
const chatMessages = document.getElementById("chatMessages");
const themeToggles = Array.from(document.querySelectorAll(".js-theme-toggle"));
const navToggle = document.getElementById("navToggle");
const mainNavLinks = document.getElementById("mainNavLinks");

// Conversation history stored in memory
let conversationHistory = [];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function addMessageToUI(text, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message-bubble';

  if (sender === 'user') {
    messageDiv.classList.add('user-message');
  } else if (sender === 'assistant') {
    messageDiv.classList.add('assistant-message');
  } else {
    messageDiv.classList.add('system-message');
  }

  messageDiv.innerHTML = `<p style="margin: 0;">${escapeHtml(text)}</p>`;
  messagesList.appendChild(messageDiv);

  // Auto scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function syncThemeToggleUI() {
  const isDark = document.body.classList.contains("dark");
  themeToggles.forEach((btn) => {
    btn.setAttribute("aria-pressed", isDark ? "true" : "false");
    const textEl = btn.querySelector(".toggle-text");
    if (textEl) textEl.textContent = isDark ? "الوضع النهاري" : "الوضع الليلي";
  });
}

function initTheme() {
  const mode = localStorage.getItem("darkMode");
  if (mode === "enabled") {
    document.body.classList.add("dark");
  }
  syncThemeToggleUI();
}

themeToggles.forEach((btn) => {
  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
    syncThemeToggleUI();
  });
});

if (navToggle && mainNavLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNavLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
  mainNavLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNavLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// مسح المحادثة
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    aiQuestion.value = "";
    messagesList.innerHTML = "";
    conversationHistory = [];
    loadingSpinner.style.display = "none";
    aiQuestion.focus();
  });
}

// إرسال السؤال
if (askAiBtn && aiQuestion && chatMessages) {
  askAiBtn.addEventListener("click", async () => {
    const question = aiQuestion.value.trim();
    if (!question) {
      alert("يرجى كتابة سؤال أولاً.");
      return;
    }

    // Add user message to UI
    addMessageToUI(question, 'user');
    conversationHistory.push({ role: 'user', content: question });
    
    aiQuestion.value = "";
    loadingSpinner.style.display = "block";
    askAiBtn.disabled = true;
    clearBtn.disabled = true;

    try {
      const response = await fetch(BACKEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          question: question,
          conversationHistory: conversationHistory
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const backendError = data?.error || response.statusText || `HTTP ${response.status}`;
        throw new Error(backendError);
      }

      const answer = data?.answer || data?.text;
      if (!answer) {
        throw new Error(data?.error || "لم تعد الخدمة بإجابة صحيحة");
      }

      loadingSpinner.style.display = "none";
      addMessageToUI(answer, 'assistant');
      conversationHistory.push({ role: 'assistant', content: answer });
      
      aiQuestion.focus();
    } catch (error) {
      console.error("خطأ في الاتصال:", error);
      loadingSpinner.style.display = "none";
      const errorMessage = error.message || 'حدث خطأ غير متوقع.';
      addMessageToUI(`❌ خطأ: ${errorMessage}`, 'system');
      // Remove the user message from history if we got an error
      conversationHistory.pop();
    } finally {
      askAiBtn.disabled = false;
      clearBtn.disabled = false;
    }
  });

  // Allow Enter key to send message
  aiQuestion.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAiBtn.click();
    }
  });
}

initTheme();
