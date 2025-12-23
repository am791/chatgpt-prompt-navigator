let prompts = [];
let lastChatId = null;
let observer = null;
let activePromptIndex = -1;
let sidebarCollapsed = true;
let themeObserver = null;

function getCurrentChatId() {
  const match = window.location.pathname.match(/\/c\/([^/]+)/);
  return match ? match[1] : null;
}

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function updateSidebarTheme() {
  const isDark = isDarkMode();
  const elements = [
    document.getElementById("prompt-sidebar"),
    document.getElementById("sidebar-toggle-btn")
  ];

  elements.forEach(el => {
    if (el) el.classList.toggle("dark-theme", isDark);
  });
}

function watchThemeChanges() {
  if (themeObserver) themeObserver.disconnect();

  themeObserver = new MutationObserver(() => {
    updateSidebarTheme();
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"]
  });
}

function resetPrompts() {
  prompts = [];
  updateSidebar(true);
}

function isLargeScreen() {
  return window.innerWidth >= 1536;
}

function createToggleButton() {
  let toggleBtn = document.getElementById("sidebar-toggle-btn");
  if (toggleBtn) return;

  toggleBtn = document.createElement("button");
  toggleBtn.id = "sidebar-toggle-btn";
  toggleBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  `;

  toggleBtn.title = "Toggle prompt history";

  toggleBtn.onclick = () => {
    toggleSidebar();
  };

  document.body.appendChild(toggleBtn);
}

function toggleSidebar() {
  const sidebar = document.getElementById("prompt-sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle-btn");

  if (!sidebar || !toggleBtn) return;

  sidebarCollapsed = !sidebarCollapsed;

  if (sidebarCollapsed) {
    sidebar.classList.add("collapsed");
    toggleBtn.classList.remove("sidebar-open");
    toggleBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    `;
  } else {
    sidebar.classList.remove("collapsed");
    toggleBtn.classList.add("sidebar-open");
    toggleBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    `;
  }
}

function createSidebar() {
  let sidebar = document.getElementById("prompt-sidebar");
  if (sidebar) return;

  sidebar = document.createElement("div");
  sidebar.id = "prompt-sidebar";

  if (!isLargeScreen()) {
    sidebar.classList.add("collapsed");
    sidebarCollapsed = true;
  } else {
    sidebarCollapsed = false;
  }

  const header = document.createElement("div");
  header.id = "prompt-sidebar-header";
  header.textContent = "Prompts";

  const list = document.createElement("ul");
  list.id = "prompt-list";

  sidebar.appendChild(header);
  sidebar.appendChild(list);
  document.body.appendChild(sidebar);

  if (isLargeScreen()) {
    document.body.style.marginRight = "280px";
  }

  createToggleButton();
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

  // To-Do: Currenlt not working as expected (Expected to show for a new chat by default)
  // if (prompts.length === 0) {
  //   const emptyItem = document.createElement("li");
  //   emptyItem.textContent = "No prompts yet. Start chatting!";
  //   emptyItem.style.opacity = "0.6";
  //   emptyItem.style.fontStyle = "italic";
  //   list.appendChild(emptyItem);
  //   return;
  // }

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
      bubbleWrapper.style.backgroundColor = "rgba(0, 200, 130, 0.25)";

      setTimeout(() => {
        bubbleWrapper.style.backgroundColor = "";
      }, 2000);

      if (!isLargeScreen() && !sidebarCollapsed) {
        setTimeout(() => {
          toggleSidebar();
        }, 300);
      }
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

    if (prompts.length > oldLength) {
      setActivePrompt(prompts.length - 1);
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
      activePromptIndex = -1;
      resetPrompts();
    }
    extractVisibleUserPrompts();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function handleResize() {
  if (isLargeScreen()) {
    document.body.style.marginRight = "280px";
    const sidebar = document.getElementById("prompt-sidebar");
    if (sidebar) {
      sidebar.classList.remove("collapsed");
      sidebarCollapsed = false;
    }
  } else {
    document.body.style.marginRight = "0";
  }
}

createSidebar();
lastChatId = getCurrentChatId();
updateSidebar(true);
extractVisibleUserPrompts();
watchForChanges();
watchThemeChanges();
updateSidebarTheme();
window.addEventListener("scroll", updateActivePromptOnScroll);
window.addEventListener("resize", handleResize);
