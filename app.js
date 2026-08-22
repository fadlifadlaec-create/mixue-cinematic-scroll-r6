(() => {
  "use strict";
  const config = window.MIXUE_STORY_CONFIG;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const pad = (value) => String(value).padStart(4, "0");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const products = {
    lemon: {
      name: "冰鲜柠檬水",
      recipe: { fruit: "lemon", texture: "clear", ice: "full" },
      ingredientTitle: "先让柠檬醒来。",
      ingredientLine: "压下红色把手，柠檬越过跷跷板，清爽就有了起点。",
      journeyTitle: "柠檬把甜拉亮。",
      journeyText: "车轮追着黄色跑。柠檬落进车斗的那一刻，整条路都亮了。",
      orderFeedback: "01 已放进小车",
      recipeFeedback: "配方正好接住第一张纸条。",
      finalStory: "把复杂的一天，先还原成清亮的一口。",
    },
    grape: {
      name: "芋圆葡萄",
      recipe: { fruit: "grape", texture: "taro", ice: "light" },
      ingredientTitle: "再让葡萄绕一圈。",
      ingredientLine: "齿轮慢慢转，果香先铺开，芋圆替今天留下一拍。",
      journeyTitle: "葡萄让时间慢一点。",
      journeyText: "葡萄滚进车斗，路没有变短，但赶路的人可以先慢下来。",
      orderFeedback: "02 已放进小车",
      recipeFeedback: "果香和芋圆，把第二张纸条放慢了一拍。",
      finalStory: "有些甜不催你，只陪你慢慢嚼完。",
    },
    berry: {
      name: "草莓波波",
      recipe: { fruit: "berry", texture: "bobo", ice: "full" },
      ingredientTitle: "最后，把草莓弹高一点。",
      ingredientLine: "弹簧一松，草莓越过红色弧线。普通的一天也有了庆祝的理由。",
      journeyTitle: "草莓给今天加一颗星。",
      journeyText: "这次不借用蛋糕影片。草莓从机关台直接落进真实杯子，故事才算完整。",
      orderFeedback: "03 已放进小车",
      recipeFeedback: "草莓和波波，刚好接住第三张纸条。",
      finalStory: "普通的一天，也值得被认真地甜一下。",
    },
  };
  const chapters = $$(".chapter");
  const state = {
    order: "lemon",
    recipe: { ...products.lemon.recipe },
    activeIndex: 0,
    autoEnabled: !reduceMotion,
    autoTimer: 0,
    resumeTimer: 0,
    motionTokens: {},
    visited: new Set(),
    found: new Set(),
    sound: false,
    soundUserMuted: false,
    celebrating: false,
    productsRevealed: false,
  };
  const audio = $("#journey-score");
  let toastTimer = 0;

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
  }

  function setSoundUi() {
    const button = $("#sound-toggle");
    button.setAttribute("aria-pressed", String(state.sound));
    button.setAttribute("aria-label", state.sound ? "关闭音乐" : "开启音乐");
    button.querySelector("span").textContent = state.sound ? "♫" : "♪";
  }

  async function unlockAudio(fromGesture = false) {
    if (state.soundUserMuted || state.sound) return;
    audio.volume = 0.52;
    try {
      await audio.play();
      state.sound = true;
      setSoundUi();
      if (fromGesture) showToast("音乐已开启");
    } catch (_) {
      state.sound = false;
      setSoundUi();
    }
  }

  function frameUrl(sequence, frame) {
    return `${sequence.path.replace("{frame}", pad(frame))}?v=${config.assetVersion}`;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  }

  function cancelMotion(key) {
    state.motionTokens[key] = (state.motionTokens[key] || 0) + 1;
  }

  async function playSequence(key, imageNode, progressNode, options = {}) {
    const sequence = config.sequences[key];
    if (!sequence || reduceMotion) return;
    const token = (state.motionTokens[key] || 0) + 1;
    state.motionTokens[key] = token;
    const control = options.control;
    control?.classList.add("is-playing");
    const ahead = new Map();
    const duration = ((sequence.to - sequence.from + 1) / config.fps) * 1000;
    const started = performance.now();

    function prefetch(from) {
      for (let frame = from; frame <= Math.min(sequence.to, from + 9); frame += 1) {
        if (!ahead.has(frame)) ahead.set(frame, loadImage(frameUrl(sequence, frame)).catch(() => null));
      }
    }

    try {
      prefetch(sequence.from);
      for (let frame = sequence.from; frame <= sequence.to; frame += 1) {
        if (state.motionTokens[key] !== token) return;
        prefetch(frame + 1);
        const image = await ahead.get(frame);
        ahead.delete(frame);
        if (image) imageNode.src = image.src;
        const ratio = (frame - sequence.from + 1) / (sequence.to - sequence.from + 1);
        if (progressNode) progressNode.style.width = `${ratio * 100}%`;
        const due = started + ratio * duration;
        const wait = Math.max(0, due - performance.now());
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      }
      if (options.finalSrc) imageNode.src = options.finalSrc;
    } finally {
      if (state.motionTokens[key] === token) control?.classList.remove("is-playing");
    }
  }

  function updateOrderUi() {
    const product = products[state.order];
    $$('[data-order]').forEach((button) => button.setAttribute("aria-checked", String(button.dataset.order === state.order)));
    $("#order-feedback").textContent = product.orderFeedback;
    $("#ingredient-title").textContent = product.ingredientTitle;
    $("#ingredient-line").textContent = product.ingredientLine;
    $("#journey-title").textContent = product.journeyTitle;
    $("#journey-text").textContent = product.journeyText;
    $("#final-choice").textContent = product.name;
    $("#final-story").textContent = product.finalStory;
    $$('[data-final-product]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.finalProduct === state.order)));
  }

  function setRecipe(recipe) {
    state.recipe = { ...recipe };
    $$('[data-recipe]').forEach((button) => button.setAttribute("aria-pressed", String(state.recipe[button.dataset.recipe] === button.dataset.value)));
    renderRecipe();
  }

  function recipeMatch() {
    return Object.entries(products).find(([, product]) => Object.entries(product.recipe).every(([key, value]) => state.recipe[key] === value))?.[0] || null;
  }

  function renderRecipe() {
    const match = recipeMatch();
    if (match) {
      $("#recipe-name").textContent = products[match].name;
      $("#recipe-feedback").textContent = products[match].recipeFeedback;
      return;
    }
    $("#recipe-name").textContent = "雪王试验杯";
    $("#recipe-feedback").textContent = "有点意外。再换一个口感，真实菜单就会出现。";
  }

  function selectOrder(id, options = {}) {
    if (!products[id]) return;
    state.order = id;
    setRecipe(products[id].recipe);
    updateOrderUi();
    activateIngredient(id, false);
    if (options.move) chapters[2].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    if (options.toast) showToast(`${products[id].name} · 订单已换`);
  }

  function activateIngredient(id, announce = true) {
    state.found.add(id);
    $$('[data-ingredient]').forEach((button) => button.classList.toggle("is-active", button.dataset.ingredient === id));
    $$('[data-found]').forEach((node) => node.classList.toggle("is-found", state.found.has(node.dataset.found)));
    $("#ingredient-title").textContent = products[id].ingredientTitle;
    $("#ingredient-line").textContent = products[id].ingredientLine;
    if (announce) showToast(`${products[id].name}的原料已找到`);
    setTimeout(() => $(`[data-ingredient="${id}"]`)?.classList.remove("is-active"), 900);
  }

  async function playJourney() {
    const image = $("#journey-frame");
    const section = $("#journey");
    cancelMotion("lemon");
    cancelMotion("grape");
    if (state.order === "berry") {
      section.classList.add("poster-mode");
      image.src = "assets/generated/ingredient-playground-paul-rand-mixue-r11.png";
      image.alt = "草莓从原料机关弹入杯中";
      $("#journey-progress").style.width = "100%";
      image.animate([{ transform: "scale(.97)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: 1500, easing: "cubic-bezier(.2,.8,.2,1)" });
      return;
    }
    section.classList.remove("poster-mode");
    image.alt = state.order === "lemon" ? "雪王寻找柠檬" : "雪王追上葡萄";
    $("#journey-progress").style.width = "0";
    await playSequence(state.order, image, $("#journey-progress"), { control: $("#replay-journey") });
  }

  function revealProducts() {
    if (state.productsRevealed) return;
    state.productsRevealed = true;
    $$('[data-final-product]').forEach((button, index) => {
      setTimeout(() => {
        button.classList.add("is-visible");
        if (index === 2) $("#crown-egg").classList.add("is-ready");
      }, 520 + index * 420);
    });
  }

  function setDance(open) {
    state.celebrating = open;
    const dance = $("#dance-trio");
    dance.hidden = !open;
    $("#crown-egg").setAttribute("aria-pressed", String(open));
    $("#crown-egg").classList.toggle("is-ready", !open);
    showToast(open ? "皇冠收到，雪王们一起跳" : "雪王们回到队伍");
  }

  function scheduleAutoTour(delay) {
    clearTimeout(state.autoTimer);
    if (!state.autoEnabled || state.activeIndex >= chapters.length - 1) return;
    const dwell = delay ?? Number(chapters[state.activeIndex].dataset.dwell || 6500);
    state.autoTimer = setTimeout(() => {
      if (!state.autoEnabled) return;
      chapters[state.activeIndex + 1].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }, dwell);
  }

  function pauseForInput() {
    if (!state.autoEnabled) return;
    clearTimeout(state.autoTimer);
    clearTimeout(state.resumeTimer);
    state.resumeTimer = setTimeout(() => scheduleAutoTour(1200), config.autoTour.resumeAfterInputMs);
  }

  function setAutoEnabled(enabled) {
    state.autoEnabled = enabled && !reduceMotion;
    const button = $("#tour-toggle");
    button.setAttribute("aria-pressed", String(state.autoEnabled));
    button.setAttribute("aria-label", state.autoEnabled ? "暂停自动巡游" : "继续自动巡游");
    button.querySelector("span").textContent = state.autoEnabled ? "Ⅱ" : "▶";
    clearTimeout(state.autoTimer);
    clearTimeout(state.resumeTimer);
    if (state.autoEnabled) scheduleAutoTour(800);
  }

  function enterChapter(index) {
    if (index === state.activeIndex && state.visited.has(index)) return;
    state.activeIndex = index;
    state.visited.add(index);
    $("#chapter-label").textContent = chapters[index].dataset.chapter;
    if (index === 2) playSequence("departure", $("#depart-frame"), $("#depart-progress"), { control: $("#replay-depart") });
    if (index === 3) setTimeout(() => activateIngredient(state.order, false), 650);
    if (index === 4) playJourney();
    if (index === 5) setTimeout(() => setRecipe(products[state.order].recipe), 700);
    if (index === 6) {
      const finalSrc = "assets/keyframes/v06-end.png";
      $("#final-brand").classList.remove("is-visible");
      playSequence("homecoming", $("#final-frame"), null, { finalSrc });
      setTimeout(() => $("#final-brand").classList.add("is-visible"), reduceMotion ? 0 : 3300);
      setTimeout(revealProducts, reduceMotion ? 0 : 3700);
    }
    scheduleAutoTour();
  }

  $$('[data-order]').forEach((button) => button.addEventListener("click", () => selectOrder(button.dataset.order, { toast: true })));
  $("#accept-order").addEventListener("click", () => selectOrder(state.order, { move: true }));
  $$('[data-ingredient]').forEach((button) => button.addEventListener("click", () => { selectOrder(button.dataset.ingredient); activateIngredient(button.dataset.ingredient); }));
  $$('[data-recipe]').forEach((button) => button.addEventListener("click", () => { state.recipe[button.dataset.recipe] = button.dataset.value; renderRecipe(); $$(`[data-recipe="${button.dataset.recipe}"]`).forEach((node) => node.setAttribute("aria-pressed", String(node === button))); }));
  $$('[data-final-product]').forEach((button) => button.addEventListener("click", () => { selectOrder(button.dataset.finalProduct, { toast: true }); button.animate([{ transform: "translateY(0)" }, { transform: "translateY(-12px)" }, { transform: "translateY(0)" }], { duration: 520, easing: "ease-out" }); }));
  $("#replay-depart").addEventListener("click", () => playSequence("departure", $("#depart-frame"), $("#depart-progress"), { control: $("#replay-depart") }));
  $("#replay-journey").addEventListener("click", playJourney);
  $("#crown-egg").addEventListener("click", () => setDance(!state.celebrating));
  $("#restart-story").addEventListener("click", () => { setDance(false); chapters[1].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); });
  $("#tour-toggle").addEventListener("click", () => { setAutoEnabled(!state.autoEnabled); showToast(state.autoEnabled ? "自动巡游继续" : "自动巡游已暂停"); });
  $("#sound-toggle").addEventListener("click", async () => {
    if (state.sound) {
      audio.pause(); state.sound = false; state.soundUserMuted = true;
    } else {
      state.soundUserMuted = false; await unlockAudio(true);
    }
    setSoundUi();
  });
  document.addEventListener("pointerdown", () => unlockAudio(false), { once: true, capture: true });
  ["wheel", "touchstart"].forEach((name) => addEventListener(name, pauseForInput, { passive: true }));
  document.addEventListener("keydown", (event) => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) pauseForInput();
    if (event.key === "Escape" && state.celebrating) setDance(false);
  });

  const visible = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => visible.set(entry.target, entry.intersectionRatio));
    const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] > .18) enterChapter(chapters.indexOf(best[0]));
  }, { threshold: [0, .2, .4, .6], rootMargin: "-18% 0px -18% 0px" });
  chapters.forEach((chapter) => observer.observe(chapter));
  addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    $("#reading-progress").style.width = `${Math.min(100, scrollY / Math.max(1, max) * 100)}%`;
  }, { passive: true });

  selectOrder("lemon");
  setAutoEnabled(!reduceMotion);
  audio.volume = .52;
  unlockAudio(false);
  window.__MIXUE_DEBUG__ = { state, products, playSequence, selectOrder, revealProducts, setDance, setAutoEnabled };
})();
