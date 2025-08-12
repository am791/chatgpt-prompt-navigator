let prompts = [];
let lastChatId = null;
let observer = null;
let activePromptIndex = -1;

function getCurrentChatId() {
  const match = window.location.pathname.match(/\/c\/([^/]+)/);
  return match ? match[1] : null;
}

function resetPrompts() {
  prompts = [];
  updateSidebar(true);
}

function createSidebar() {
  let sidebar = document.getElementById("prompt-sidebar");
  if (sidebar) return;

  sidebar = document.createElement("div");
  sidebar.id = "prompt-sidebar";

  const header = document.createElement("div");
  header.id = "prompt-sidebar-header";
  header.textContent = "Prompts";

  const list = document.createElement("ul");
  list.id = "prompt-list";

  sidebar.appendChild(header);
  sidebar.appendChild(list);
  document.body.appendChild(sidebar);

  document.body.style.marginRight = "280px";
}

function updateSidebar(isLoading = false) {
  const list = document.getElementById("prompt-list");
  if (!list) return;

  list.innerHTML = "";

  if (isLoading) {
    const loadingItem = document.createElement("li");
    loadingItem.textContent = "Loading...";
    loadingItem.style.opacity = "0.6";
    loadingItem.style.fontStyle = "italic";
    list.appendChild(loadingItem);
    return;
  }

// To-Do: Currenlt not working (Expected to show for a new chat by default)
//   if (prompts.length === 0) {
//     const emptyItem = document.createElement("li");
//     emptyItem.textContent = "No prompts found.";
//     emptyItem.style.opacity = "0.6";
//     list.appendChild(emptyItem);
//     return;
//   }

  prompts.forEach(({ text, element }, index) => {
    const item = document.createElement("li");
    item.textContent = text.length > 80 ? text.slice(0, 80) + "..." : text;
    item.title = text;

    if (index === activePromptIndex) {
      item.style.backgroundColor = "rgba(0, 200, 130, 0.25)";
      item.style.fontWeight = "600";
    }

    item.onclick = () => {
      setActivePrompt(index);
      element.scrollIntoView({ behavior: "smooth", block: "center" });

      const bubbleWrapper = element.querySelector("div[class*='rounded-']") || element;
      bubbleWrapper.style.transition = "background-color 0.3s ease";
      bubbleWrapper.style.borderRadius = "12px";
      bubbleWrapper.style.overflow = "hidden";
      bubbleWrapper.style.backgroundColor = "rgba(0, 200, 130, 0.25)"; //"rgba(255, 255, 150, 0.6)";

      setTimeout(() => {
        bubbleWrapper.style.backgroundColor = "";
      }, 2000);
    };

    list.appendChild(item);
  });
}

function setActivePrompt(index) {
  activePromptIndex = index;
  updateSidebar();
}

function extractVisibleUserPrompts() {
    const messages = document.querySelectorAll('div[data-message-author-role="user"]');
    const oldLength = prompts.length;
    const newPrompts = [];
  
    messages.forEach((msg) => {
      const textEl = msg.querySelector(".whitespace-pre-wrap");
      if (textEl) {
        const text = textEl.innerText.trim();
        if (text && !prompts.some(p => p.text === text && p.element === msg)) {
          prompts.push({ text, element: msg });
          newPrompts.push({ text, element: msg });
        }
      }
    });
  
    if (newPrompts.length > 0) {
      updateSidebar();
  
      // If prompts array grew, move active highlight to last
      if (prompts.length > oldLength) {
        setActivePrompt(prompts.length - 1);
  
        // Scroll sidebar list to bottom so last item is visible
        // setTimeout(() => {
        //   const list = document.getElementById("prompt-list");
        //   if (list) {
        //     list.scrollTop = list.scrollHeight;
        //   }
        // }, 50);
      }
    }
  }
  

function updateActivePromptOnScroll() {
  let closestIndex = -1;
  let closestDistance = Infinity;

  prompts.forEach((p, index) => {
    const rect = p.element.getBoundingClientRect();
    const distance = Math.abs(rect.top - window.innerHeight / 2);

    if (distance < closestDistance && rect.top >= 0 && rect.bottom <= window.innerHeight * 1.5) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  if (closestIndex !== -1 && closestIndex !== activePromptIndex) {
    setActivePrompt(closestIndex);
  }
}

function watchForChanges() {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    const currentId = getCurrentChatId();
    if (currentId && currentId !== lastChatId) {
      lastChatId = currentId;
      activePromptIndex = -1; // reset selection on new chat
      resetPrompts();
    }
    extractVisibleUserPrompts();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialization
createSidebar();
lastChatId = getCurrentChatId();
updateSidebar(true);
extractVisibleUserPrompts();
watchForChanges();
window.addEventListener("scroll", updateActivePromptOnScroll);
