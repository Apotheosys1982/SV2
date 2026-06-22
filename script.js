/* AGENT_MODE_CAPSULE: SURFACE_RUNTIME_V1_MODE + MOBILE_VIEWPORT_UX_MODE + STRUCTURAL_ROUTING_ONTOLOGY_MODE
   Contract: Keep the assistant bounded to imported SV2 source material and use shared motion-token chrome behavior. */
(function () {
  "use strict";

  const body = document.body;
  const menu = document.querySelector("[data-site-menu]");
  const menuOpen = document.querySelector("[data-menu-open]");
  const menuClose = document.querySelector("[data-menu-close]");
  const menuScrim = document.querySelector("[data-menu-scrim]");
  const assistantModal = document.querySelector("[data-assistant-modal]");
  const assistantPanel = assistantModal ? assistantModal.querySelector(".assistant-panel") : null;
  const assistantBody = document.querySelector("[data-assistant-body]");
  const conversation = document.querySelector("[data-conversation]");
  const focusModal = document.querySelector("[data-focus-modal]");
  const focusScroll = document.querySelector("[data-focus-scroll]");
  const focusContent = document.querySelector("[data-focus-content]");
  const focusCloseButtons = document.querySelectorAll("[data-focus-close]");
  const launcherButtons = document.querySelectorAll("[data-open-assistant]");
  const closeButtons = document.querySelectorAll("[data-close-assistant]");
  const askForm = document.querySelector("[data-ask-form]");
  const askInput = askForm ? askForm.querySelector("[name='question']") : null;
  const suggestionButtons = document.querySelectorAll("[data-suggest]");
  const modalLocks = new Set();
  const streamTimers = new Set();
  const ASSISTANT_GESTURE_EPSILON = 1;
  const ASSISTANT_TOUCH_GESTURE_EPSILON = 1;
  let answerPack = null;
  let savedScrollY = 0;
  let assistantTouchY = null;
  let overlayTouchY = null;
  let assistantChromeHidden = false;
  let assistantScrollIntent = 0;
  let lastAssistantChromeGestureAt = 0;
  let followStream = false;

  document.documentElement.classList.add("wm-motion-ready");

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9+\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(value) {
    return new Set(normalize(value).split(" ").filter((token) => token.length > 1));
  }

  function hasAny(input, phrases) {
    const q = normalize(input);
    return phrases.some((phrase) => q.includes(normalize(phrase)));
  }

  function findAnswer(id) {
    return (answerPack && answerPack.answers || []).find((answer) => answer.id === id);
  }

  function lessonRecords() {
    return (answerPack && answerPack.source_snapshot && answerPack.source_snapshot.imported_lessons) || [];
  }

  function slugId(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function lessonAnswerId(record, kind) {
    return `${kind}-${slugId(record && record.id)}`;
  }

  function currentLessonId() {
    return document.body.getAttribute("data-lesson") || "";
  }

  function lessonMatches(record, input) {
    const q = normalize(input);
    const values = [
      record && record.id,
      record && record.title,
      record && record.label,
      record && record.subject,
      record && record.subject_label
    ].filter(Boolean).map(normalize);
    return values.some((value) => value && (q.includes(value) || value.includes(q)));
  }

  function findLessonRecord(input) {
    return lessonRecords().find((record) => lessonMatches(record, input));
  }

  function answerForCurrentLesson(kind) {
    const current = currentLessonId();
    const record = lessonRecords().find((lesson) => lesson.id === current);
    const id = record ? lessonAnswerId(record, kind) : "";
    return id && findAnswer(id) ? id : "";
  }

  function protectedAnswerId(input) {
    const q = normalize(input);
    const greeting = new Set(["hi", "hello", "hey", "hey there", "good morning", "good afternoon"]);
    if (greeting.has(q)) return "greeting-orientation";
    if (hasAny(q, ["medical advice", "allergy", "sick", "medicine", "dangerous experiment", "chemical experiment", "fire experiment"])) return "unsafe-medical-boundary";
    if (hasAny(q, ["live data", "live ai", "using chatgpt", "browse", "classroom data", "student account", "private data"])) return "live-data-boundary";
    if (hasAny(q, ["okf", "open knowledge format", "agent readable", "llms txt", "llms.txt", "sitemap", "another ai", "external agent", "inspect every lesson", "whole artifact", "full artifact"])) return "agent-readable-artifact";
    if (hasAny(q, ["where do answers come from", "what source", "source material", "source backed", "data powers"])) return "source-layer-overview";
    if (hasAny(q, ["how current", "what commit", "which version", "latest sv2", "when was this updated"])) return "build-snapshot-boundary";
    if (hasAny(q, ["what can this not answer", "what are the limits", "what do you not know", "limitations"])) return "source-limitation";
    if (hasAny(q, ["what is sv2", "define sv2", "what does sv2 mean"])) return "foundation-sv2";
    if (hasAny(q, ["what is biosphere kids", "what is this", "what does this page do"])) return "identity-overview";
    if (hasAny(q, ["focus mode", "full bleed", "tap the image", "tap the hero", "open the image", "section focus", "reading mode"])) return "focus-mode-guidance";
    if (hasAny(q, ["lesson engine", "lesson json", "lesson manifest", "how are lessons structured"])) return "foundation-lesson-engine";
    if (hasAny(q, ["give me the answers", "answer key", "teacher key", "teacher note", "teacher notes", "answer all prompts", "fill it in", "worksheet answers"])) {
      const namedLesson = findLessonRecord(input);
      if (namedLesson) return lessonAnswerId(namedLesson, "lesson-answers");
      return answerForCurrentLesson("lesson-answers") || "current-lesson-answer-guidance";
    }
    if (hasAny(q, ["do my homework", "cheat"])) return "homework-learning-boundary";
    if (hasAny(q, ["teacher mode"])) return "foundation-teacher-mode";
    if (hasAny(q, ["print", "worksheet", "save as pdf", "paper copy"])) return "foundation-print-mode";
    if (hasAny(q, ["autosave", "save my answers", "localstorage", "local storage"])) return "foundation-autosave";
    const namedLesson = findLessonRecord(input);
    if (namedLesson) return lessonAnswerId(namedLesson, "lesson-summary");
    if (hasAny(q, ["geography lessons", "geography subject", "maps", "globes", "landforms", "regions", "communities"])) return "subject-geography-overview";
    if (hasAny(q, ["history lessons", "history subject", "early america", "independence", "world ideas", "history detectives"])) return "subject-history-overview";
    if (hasAny(q, ["science lessons", "science subject", "habitat", "ecosystem", "food chain", "water cycle", "adaptation", "plants", "animals", "trees"])) return "subject-science-overview";
    if (hasAny(q, ["what lessons", "which lessons", "lesson list", "show me the lessons", "topics are here"])) return "lesson-inventory";
    if (hasAny(q, ["choose a lesson", "change lessons", "lesson selector", "next lesson", "previous lesson", "open lesson"])) return "lesson-navigation";
    if (hasAny(q, ["parent", "teacher", "classroom", "homeschool", "grades"])) return "teacher-parent-guidance";
    if (hasAny(q, ["new lesson", "add a lesson", "create lesson", "extend sv2", "maintain"])) return "maintenance-context";
    if (hasAny(q, ["start", "where do i start", "what should i do first", "next step"])) return "cta-guidance";
    if (hasAny(q, ["hidden prompt", "ignore instructions", "write me a contract", "favorite food", "are you alive"])) return "off-topic-boundary";
    return "";
  }

  function scoreAnswer(answer, input) {
    const q = normalize(input);
    const tokenSet = tokens(input);
    let score = Number(answer.confidence_boost || 0);
    for (const pattern of answer.question_patterns || []) {
      const p = normalize(pattern);
      if (!p) continue;
      if (q === p) score += 18;
      else if (q.length > 7 && p.length > 7 && q.includes(p)) score += 10;
      else {
        const patternTokens = p.split(" ").filter((token) => token.length > 2);
        const matches = patternTokens.filter((token) => tokenSet.has(token)).length;
        score += matches / Math.max(patternTokens.length, 1);
      }
    }
    for (const keyword of answer.keywords || []) {
      const k = normalize(keyword);
      if (k.includes(" ")) {
        if (q.includes(k)) score += 2.5;
      } else if (tokenSet.has(k)) {
        score += 1.5;
      }
    }
    return score;
  }

  function selectAnswer(input) {
    const protectedId = protectedAnswerId(input);
    if (protectedId) {
      const answer = findAnswer(protectedId);
      if (answer) return answer;
    }
    let best = null;
    let bestScore = 0;
    for (const answer of answerPack.answers || []) {
      const score = scoreAnswer(answer, input);
      if (score > bestScore) {
        best = answer;
        bestScore = score;
      }
    }
    if (!best || bestScore < Number(answerPack.min_confidence || 0.34) + 1.4) {
      return findAnswer("clarification-needed") || findAnswer("off-topic-boundary") || best;
    }
    return best;
  }

  function lockPage(lockName, className) {
    if (!modalLocks.size) {
      savedScrollY = window.scrollY || 0;
      body.style.position = "fixed";
      body.style.top = `-${savedScrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }
    if (className) body.classList.add(className);
    modalLocks.add(lockName);
  }

  function unlockPage(lockName, className) {
    if (className) body.classList.remove(className);
    modalLocks.delete(lockName);
    if (modalLocks.size) return;
    body.classList.remove("assistant-chrome-hidden");
    if (assistantPanel) assistantPanel.classList.remove("is-reading");
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    window.scrollTo(0, savedScrollY);
    assistantChromeHidden = false;
  }

  function openAssistant(seed) {
    lockPage("assistant", "assistant-open");
    if (assistantModal) {
      assistantModal.setAttribute("aria-hidden", "false");
      assistantModal.classList.add("is-open");
    }
    requestAnimationFrame(() => {
      if (askInput) askInput.focus({ preventScroll: true });
    });
    if (seed) submitQuestion(seed);
  }

  function closeAssistant() {
    if (assistantModal) {
      assistantModal.setAttribute("aria-hidden", "true");
      assistantModal.classList.remove("is-open");
    }
    setAssistantChromeHidden(false);
    unlockPage("assistant", "assistant-open");
  }

  function resizeAskInput() {
    if (!askInput || askInput.tagName !== "TEXTAREA") return;
    askInput.style.height = "auto";
    askInput.style.height = `${Math.min(askInput.scrollHeight, 112)}px`;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function runFocusTransition(callback) {
    if (document.startViewTransition && !prefersReducedMotion()) {
      document.documentElement.classList.add("wm-transition-focus");
      const transition = document.startViewTransition(callback);
      transition.finished.finally(() => document.documentElement.classList.remove("wm-transition-focus"));
      return;
    }
    callback();
  }

  function mirrorFocusTextareas(clone, originalRoot) {
    Array.from(clone.querySelectorAll("textarea.answer")).forEach((cloned) => {
      const key = cloned.getAttribute("data-answer");
      const original = key && originalRoot
        ? originalRoot.querySelector(`textarea.answer[data-answer="${CSS.escape(key)}"]`)
        : null;
      if (!original) return;
      cloned.value = original.value;
      cloned.style.height = original.style.height || "";
      cloned.addEventListener("input", () => {
        original.value = cloned.value;
        original.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  }

  function cloneLessonNodes(nodes, originalRoot) {
    const shell = document.createElement("div");
    shell.className = "focus-mode__section-shell";
    nodes.filter(Boolean).forEach((node) => {
      const clone = node.cloneNode(true);
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((item) => item.removeAttribute("id"));
      clone.querySelectorAll(".focus-cue, .media-print-button").forEach((item) => item.remove());
      clone.querySelectorAll("[tabindex]").forEach((item) => item.removeAttribute("tabindex"));
      mirrorFocusTextareas(clone, originalRoot || node);
      shell.appendChild(clone);
    });
    return shell;
  }

  function setFocusContent(node) {
    if (!focusModal || !focusContent) return;
    focusContent.innerHTML = "";
    if (node) focusContent.appendChild(node);
    if (focusScroll) focusScroll.scrollTop = 0;
  }

  function buildHeroFocus(source) {
    setFocusContent(cloneLessonNodes([source.closest(".hero"), document.querySelector(".hero-copy")], document));
  }

  function buildSectionFocus(source) {
    const section = source.closest(".section");
    if (!section) return;
    setFocusContent(cloneLessonNodes([section], section));
  }

  function openFocusMode(source) {
    if (!focusModal || !source) return;
    runFocusTransition(() => {
      if (source.matches("[data-hero-media]")) buildHeroFocus(source);
      else buildSectionFocus(source);
      lockPage("focus", "focus-mode-open");
      focusModal.setAttribute("aria-hidden", "false");
      focusModal.classList.add("is-open");
    });
  }

  function closeFocusMode() {
    if (!focusModal || !focusModal.classList.contains("is-open")) return;
    runFocusTransition(() => {
      focusModal.setAttribute("aria-hidden", "true");
      focusModal.classList.remove("is-open");
      unlockPage("focus", "focus-mode-open");
    });
  }

  function closeFocusModeForPrint() {
    if (!focusModal) return;
    focusModal.setAttribute("aria-hidden", "true");
    focusModal.classList.remove("is-open");
    setFocusContent(null);
    unlockPage("focus", "focus-mode-open");
  }

  function prepareFullLessonPrint() {
    closeMenu();
    closeAssistant();
    closeFocusModeForPrint();
    body.classList.remove("focus-mode-open", "assistant-open", "menu-open", "assistant-chrome-hidden");
    if (assistantPanel) assistantPanel.classList.remove("is-reading");
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    modalLocks.clear();
    body.classList.add("printing-lesson");
  }

  function printLesson() {
    prepareFullLessonPrint();
    requestAnimationFrame(() => window.print());
  }

  function createPrinterIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "22");
    svg.setAttribute("height", "22");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-3a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v3a2 2 0 0 1-2 2h-2M7 14h10v6H7v-6Z");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }

  function ensureMediaPrintButton(target) {
    if (!target || target.querySelector(".media-print-button")) return;
    const button = document.createElement("button");
    button.className = "media-print-button no-print";
    button.type = "button";
    button.setAttribute("aria-label", "Print this lesson");
    button.appendChild(createPrinterIcon());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      printLesson();
    });
    target.appendChild(button);
  }

  function ensureSectionMetaRow(section) {
    const content = section && section.querySelector(".content");
    const title = content && content.querySelector(".h2");
    if (!content || !title) return;
    const media = section.querySelector("[data-media]");
    const chip = section.querySelector("[data-chip]");
    const sectionLabel = chip ? chip.textContent.trim() : (section.getAttribute("data-section") || "").toUpperCase();
    const actionLabel = media ? media.getAttribute("data-observation") || "" : "";
    let row = content.querySelector(".section-meta-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "section-meta-row no-print";
      title.before(row);
    }
    row.replaceChildren();
    [sectionLabel, actionLabel, "Tap image for focus"].filter(Boolean).forEach((text) => {
      const item = document.createElement("span");
      item.textContent = text;
      row.appendChild(item);
    });
  }

  function ensureFocusCue(target) {
    if (!target || target.querySelector(".focus-cue")) return;
    target.classList.add("wm-motion-focusable", "wm-shared-hero");
    target.setAttribute("tabindex", "0");
    target.setAttribute("aria-label", `${target.getAttribute("aria-label") || "Lesson image"}. Open Focus Mode.`);
    const cue = document.createElement("span");
    cue.className = "focus-cue";
    cue.textContent = "Focus mode";
    target.appendChild(cue);
  }

  function initFocusMode() {
    const targets = document.querySelectorAll("[data-hero-media], [data-media]");
    targets.forEach((target) => {
      ensureFocusCue(target);
      ensureMediaPrintButton(target);
      const section = target.closest(".section");
      if (section) ensureSectionMetaRow(section);
      target.addEventListener("click", () => openFocusMode(target));
      target.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openFocusMode(target);
      });
    });
    focusCloseButtons.forEach((button) => button.addEventListener("click", closeFocusMode));
  }

  function setAssistantChromeHidden(hidden) {
    const next = Boolean(hidden);
    if (assistantChromeHidden === next) return;
    assistantChromeHidden = next;
    body.classList.toggle("assistant-chrome-hidden", next);
    if (assistantPanel) assistantPanel.classList.toggle("is-reading", next);
  }

  function canScrollAssistant() {
    if (!assistantBody) return false;
    return assistantBody.scrollHeight > assistantBody.clientHeight + 2;
  }

  function applyAssistantChromeGesture(direction) {
    if (!assistantBody || !direction) return;
    lastAssistantChromeGestureAt = window.performance ? window.performance.now() : Date.now();
    assistantScrollIntent = 0;
    followStream = false;
    if (direction === "down") setAssistantChromeHidden(true);
    if (direction === "up") setAssistantChromeHidden(false);
  }

  function handleAssistantGesture(deltaY, event) {
    if (!assistantModal || !body.classList.contains("assistant-open")) return;
    if (!canScrollAssistant()) {
      if (event && event.cancelable) event.preventDefault();
      setAssistantChromeHidden(false);
      return;
    }
    if (deltaY > ASSISTANT_GESTURE_EPSILON) applyAssistantChromeGesture("down");
    if (deltaY < -ASSISTANT_GESTURE_EPSILON) applyAssistantChromeGesture("up");
  }

  function handleAssistantWheel(event) {
    handleAssistantGesture(event.deltaY, event);
  }

  function handleAssistantTouchStart(event) {
    assistantTouchY = event.touches && event.touches[0] ? event.touches[0].clientY : null;
    assistantScrollIntent = 0;
  }

  function handleAssistantTouchMove(event) {
    if (assistantTouchY === null || !(event.touches && event.touches[0])) return;
    const nextY = event.touches[0].clientY;
    const deltaY = assistantTouchY - nextY;
    assistantTouchY = nextY;
    if (Math.abs(deltaY) < ASSISTANT_TOUCH_GESTURE_EPSILON) return;
    if (deltaY > ASSISTANT_TOUCH_GESTURE_EPSILON) applyAssistantChromeGesture("down");
    if (deltaY < -ASSISTANT_TOUCH_GESTURE_EPSILON) applyAssistantChromeGesture("up");
    handleAssistantGesture(deltaY, event);
    followStream = false;
  }

  function handleAssistantTouchEnd() {
    assistantTouchY = null;
  }

  function closestElement(target, selector) {
    return target && target.closest ? target.closest(selector) : null;
  }

  function getOverlayScrollHost(target) {
    return closestElement(target, ".assistant-body,.site-menu__panel,.focus-mode__scroll");
  }

  function canScrollElementInDirection(el, direction) {
    if (!el || el.scrollHeight <= el.clientHeight + 1) return false;
    if (direction === "up") return el.scrollTop > 0;
    if (direction === "down") return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    return false;
  }

  function canOverlayHandleTouchMove(e) {
    const host = getOverlayScrollHost(e.target);
    if (!host) return false;
    const y = e.touches && e.touches[0] ? e.touches[0].clientY : overlayTouchY;
    if (y === null || overlayTouchY === null) return host.scrollHeight > host.clientHeight + 1;
    const delta = y - overlayTouchY;
    if (Math.abs(delta) < 1) return false;
    return canScrollElementInDirection(host, delta > 0 ? "up" : "down");
  }

  function canOverlayHandleWheel(e) {
    const host = getOverlayScrollHost(e.target);
    if (!host || Math.abs(e.deltaY) < 1) return false;
    return canScrollElementInDirection(host, e.deltaY < 0 ? "up" : "down");
  }

  function handleDocumentTouchStart(e) {
    overlayTouchY = e.touches && e.touches[0] ? e.touches[0].clientY : null;
  }

  function handleDocumentTouchMove(e) {
    if (!modalLocks.size) return;
    if(!canOverlayHandleTouchMove(e))e.preventDefault();
    overlayTouchY = e.touches && e.touches[0] ? e.touches[0].clientY : overlayTouchY;
  }

  function handleDocumentTouchEnd() {
    overlayTouchY = null;
  }

  function handleDocumentWheel(e) {
    if (modalLocks.size && !canOverlayHandleWheel(e)) e.preventDefault();
  }

  function scrollToBottom() {
    if (!assistantBody || !followStream) return;
    assistantBody.scrollTop = assistantBody.scrollHeight;
  }

  function clearStreams() {
    for (const timer of streamTimers) clearTimeout(timer);
    streamTimers.clear();
  }

  function anchorAssistantMessage(message) {
    if (!assistantBody || !message) return;
    requestAnimationFrame(() => {
      assistantBody.scrollTop = Math.max(0, message.offsetTop - 14);
    });
  }

  function appendMessage(kind, text, followups) {
    const node = document.createElement("article");
    node.className = `message ${kind}`;
    conversation.appendChild(node);
    if (kind === "user") {
      node.textContent = text;
      return node;
    }
    const paragraphs = String(text || "").split(/\\n\\s*\\n/).filter(Boolean);
    followStream = true;
    let paragraphIndex = 0;
    let charIndex = 0;
    let current = document.createElement("p");
    node.appendChild(current);
    function tick() {
      const paragraph = paragraphs[paragraphIndex] || "";
      current.textContent = paragraph.slice(0, charIndex);
      scrollToBottom();
      if (charIndex < paragraph.length) {
        charIndex += 4;
        const timer = setTimeout(tick, 17);
        streamTimers.add(timer);
        return;
      }
      paragraphIndex += 1;
      charIndex = 0;
      if (paragraphIndex < paragraphs.length) {
        current = document.createElement("p");
        node.appendChild(current);
        const timer = setTimeout(tick, 52);
        streamTimers.add(timer);
        return;
      }
      if (followups && followups.length) {
        const wrap = document.createElement("div");
        wrap.className = "quick-prompts";
        for (const item of followups) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = item;
          button.addEventListener("click", () => submitQuestion(item));
          wrap.appendChild(button);
        }
        node.appendChild(wrap);
      }
      followStream = false;
      scrollToBottom();
    }
    tick();
    return node;
  }

  function submitQuestion(value) {
    const question = String(value || (askInput && askInput.value) || "").trim();
    if (!question || !answerPack) return;
    clearStreams();
    if (askInput) {
      askInput.value = "";
      askInput.blur();
    }
    appendMessage("user", question);
    const selected = selectAnswer(question);
    appendMessage("assistant", selected ? selected.answer : answerPack.fallback_answer, selected ? selected.suggested_followups : answerPack.suggested_questions);
    setAssistantChromeHidden(true);
  }

  function openMenu() {
    body.classList.add("menu-open");
    if (menu) menu.setAttribute("aria-hidden", "false");
  }

  function closeMenu() {
    body.classList.remove("menu-open");
    if (menu) menu.setAttribute("aria-hidden", "true");
  }

  async function init() {
    try {
      const response = await fetch("answer-pack.json");
      answerPack = await response.json();
    } catch (error) {
      answerPack = {
        min_confidence: 0.34,
        fallback_answer: "I can help with BioSphere Kids lessons, print mode, teacher mode, source limits, and safe science learning questions.",
        suggested_questions: ["What is BioSphere Kids?", "Can I print this?", "What source does this use?"],
        answers: []
      };
    }

    if (conversation && !conversation.children.length) {
      appendMessage("assistant", "Ask about BioSphere Kids lessons, science vocabulary, printing, teacher mode, autosave, source limits, or safe learning boundaries.", answerPack.suggested_questions);
    }

    document.querySelectorAll("[data-print-lesson]").forEach((button) => {
      button.addEventListener("click", printLesson);
    });
    launcherButtons.forEach((button) => {
      button.addEventListener("click", () => openAssistant(button.getAttribute("data-open-assistant") || ""));
    });
    closeButtons.forEach((button) => button.addEventListener("click", closeAssistant));
    suggestionButtons.forEach((button) => {
      button.addEventListener("click", () => openAssistant(button.getAttribute("data-suggest") || button.textContent));
    });
    initFocusMode();
    if (askForm) {
      askForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = askInput;
        if (input) input.blur();
        submitQuestion();
      });
    }
    if (askInput && askInput.tagName === "TEXTAREA") {
      askInput.addEventListener("input", resizeAskInput);
      askInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        askForm.requestSubmit();
      });
      resizeAskInput();
    }
    if (menuOpen) menuOpen.addEventListener("click", openMenu);
    if (menuClose) menuClose.addEventListener("click", closeMenu);
    if (menuScrim) menuScrim.addEventListener("click", closeMenu);
    const assistantGestureSurface = assistantPanel || assistantBody;
    if (assistantGestureSurface) {
      assistantGestureSurface.addEventListener("wheel", handleAssistantWheel, { passive: false });
      assistantGestureSurface.addEventListener("touchstart", handleAssistantTouchStart, { passive: true });
      assistantGestureSurface.addEventListener("touchmove", handleAssistantTouchMove, { passive: false });
      assistantGestureSurface.addEventListener("touchend", handleAssistantTouchEnd, { passive: true });
      assistantGestureSurface.addEventListener("touchcancel", handleAssistantTouchEnd, { passive: true });
    }
    if (assistantBody) {
      assistantBody.addEventListener("scroll", () => {
        followStream = false;
      }, { passive: true });
    }
    document.addEventListener("touchstart", handleDocumentTouchStart, { passive: true });
    document.addEventListener("touchmove", handleDocumentTouchMove, { passive: false });
    document.addEventListener("touchend", handleDocumentTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleDocumentTouchEnd, { passive: true });
    document.addEventListener("wheel", handleDocumentWheel, { passive: false });
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (body.classList.contains("menu-open")) closeMenu();
      else if (body.classList.contains("assistant-open")) closeAssistant();
      else if (body.classList.contains("focus-mode-open")) closeFocusMode();
    });
    window.addEventListener("beforeprint", prepareFullLessonPrint);
    window.addEventListener("afterprint", () => body.classList.remove("printing-lesson"));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
