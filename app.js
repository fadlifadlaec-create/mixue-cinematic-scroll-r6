(() => {
  "use strict";

  const config = window.CREATIVE_V3_CONFIG;
  const generated = window.CREATIVE_V3_MANIFEST || {};
  Object.entries(generated).forEach(([id, value]) => {
    if (config.sequences[id] && Number.isInteger(value.count)) {
      const sequence = config.sequences[id];
      const available = Math.max(0, value.count - (sequence.frameOffset || 0));
      sequence.count = Math.min(available, sequence.trimCount || available);
    }
  });

  const canvas = document.querySelector("#stage");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const posters = [...document.querySelectorAll(".poster")];
  const brandStage = document.querySelector("#brand-stage");
  const caption = document.querySelector("#caption");
  const title = document.querySelector("#title");
  const copy = document.querySelector("#copy");
  const loading = document.querySelector("#loading");
  const status = document.querySelector("#status");
  const scrollSpace = document.querySelector("#scroll-space");
  const experience = document.querySelector("#experience");
  const cornerControls = document.querySelector("#corner-controls");
  const autoplayToggle = document.querySelector("#autoplay-toggle");
  const soundToggle = document.querySelector("#sound-toggle");
  const soundtrack = document.querySelector("#journey-score");
  const finalBrand = document.querySelector("#final-brand");
  const resultCard = document.querySelector("#result-card");
  const resultProduct = document.querySelector("#result-product");
  const resultImage = resultProduct?.querySelector("img");
  const resultKicker = document.querySelector("#result-kicker");
  const resultName = document.querySelector("#result-name");
  const resultReason = document.querySelector("#result-reason");
  const resultStamp = document.querySelector("#result-stamp");
  const changeOrder = document.querySelector("#change-order");
  const replayOrder = document.querySelector("#replay-order");
  const fxLayer = document.querySelector("#fx-layer");
  const sceneActionButtons = [...document.querySelectorAll("[data-scene-action]")];
  const ingredientTray = document.querySelector("#ingredient-tray");
  const lemonCount = document.querySelector("#lemon-count");
  const grapeCount = document.querySelector("#grape-count");
  const berryCount = document.querySelector("#berry-count");
  const mixBench = document.querySelector("#mix-bench");
  const mixProducts = [...document.querySelectorAll(".mix-product")];
  const mixButtons = [...document.querySelectorAll("[data-mix]")];
  const mixPrompt = document.querySelector("#mix-prompt");
  const orderBrief = document.querySelector("#order-brief");
  const orderButtons = [...document.querySelectorAll("[data-order]")];
  const startOrder = document.querySelector("#start-order");
  const missionHud = document.querySelector("#mission-hud");
  const missionStep = document.querySelector("#mission-step");
  const missionTitle = document.querySelector("#mission-title");
  const missionCopy = document.querySelector("#mission-copy");
  const missionProgress = document.querySelector("#mission-progress");
  const deferredImages = [...document.querySelectorAll("img[data-src]")];
  const danceImage = document.querySelector(".dance-trio img");
  const mixBackdrop = document.querySelector(".v05-safe-stage img");

  const isMobile = matchMedia("(max-width: 700px)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const useHdFrames = !isMobile && innerWidth >= 1200;
  const concurrency = isMobile ? config.concurrency.mobile : config.concurrency.desktop;
  const cacheLimit = isMobile ? config.cacheLimit.mobile : config.cacheLimit.desktop;
  const encodedLimit = isMobile ? 30 : 42;
  const decodeWindowSize = Math.min(cacheLimit, isMobile ? 20 : 28);
  const initialBufferSize = isMobile ? 12 : 18;
  const finalBrandAnchor = { x: 768, y: 391.5, sourceWidth: 1280, sourceHeight: 720 };

  const timeline = [];
  let totalFrames = 0;
  for (const id of Object.keys(config.sequences)) {
    const sequence = config.sequences[id];
    if (!sequence.count) continue;
    timeline.push({ id, sequence, start: totalFrames, end: totalFrames + sequence.count - 1 });
    totalFrames += sequence.count;
  }

  const stationUnits = [0];
  let cumulative = 0;
  for (const item of timeline) {
    cumulative += item.sequence.count;
    stationUnits.push(cumulative);
  }

  const state = {
    currentStation: 0,
    targetGlobal: 0,
    renderedGlobal: 0,
    direction: 1,
    activeSequence: timeline[0]?.id || null,
    encodedCache: new Map(),
    encodedPromises: new Map(),
    prefetchJobs: new Map(),
    frameCache: new Map(),
    decodePromises: new Map(),
    playToken: 1,
    decodeAnchor: -1000,
    lastDrawn: null,
    renderFrame: 0,
    resizeFrame: 0,
    idleTimer: 0,
    failedUrls: new Set(),
    ingredients: { lemon: 0, grape: 0, berry: 0 },
    boostUntil: 0,
    soundEnabled: true,
    audioUnlocked: false,
    audioBlocked: false,
    audioUnlockPromise: null,
    audioAttempt: 0,
    autoEnabled: !reducedMotion,
    autoPlaying: false,
    autoBuffering: false,
    initialBufferReady: false,
    autoResumeAt: performance.now() + 5000,
    autoLastTime: 0,
    autoHoldUntil: 0,
    autoWritingUntil: 0,
    autoFrame: 0,
    autoHeartbeat: performance.now(),
    sceneRevealTimer: 0,
    autoChoiceTimer: 0,
    briefingTimer: 0,
    finaleRevealed: false,
    interactionLocked: false,
    briefingComplete: false,
    order: "lemon",
    selectedRecipe: null,
    result: "lemon"
  };

  const recipes = {
    lemon: {
      need: "清爽解腻", name: "冰鲜柠檬水", kicker: "清爽解腻的今天",
      reason: "鲜柠的酸甜，把赶路后的燥热轻轻带走。",
      image: "../assets/products/real-lemonade.png", accent: "#ffd629"
    },
    grape: {
      need: "果香有嚼感", name: "芋圆葡萄", kicker: "果香和嚼感都要",
      reason: "葡萄果香遇上 Q 弹芋圆，每一口都有新节奏。",
      image: "../assets/products/real-taro-grape.png", accent: "#7950a5"
    },
    berry: {
      need: "甜润有波波", name: "草莓波波", kicker: "甜甜的快乐要加倍",
      reason: "草莓风味配上晶莹波波，把今天调成明亮的粉红色。",
      image: "../assets/products/real-strawberry-bobo.png", accent: "#ef3d67"
    }
  };

  const missionByScene = {
    v01: ["01 / 04", "出发采购", "帮雪王把今天的原料带回店里", 18],
    v02: ["02 / 04", "收下鲜柠", "点亮原料，让清爽跟上采购车", 36],
    v03: ["02 / 04", "追上葡萄", "果香已经装车，还差最后一站", 52],
    v04: ["02 / 04", "带回草莓", "三份原料到齐，准备回店调饮", 68],
    v05: ["03 / 04", "甜蜜调饮所", "读懂订单，再选最合适的一杯", 84],
    v06: ["04 / 04", "订单完成", "你的选择已经变成一杯真实饮品", 100]
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pad = (value, size) => String(value).padStart(size, "0");
  const frameUrl = (sequence, index) => {
    const sourceFrame = index + 1 + (sequence.frameOffset || 0);
    const template = useHdFrames && sequence.desktopPath ? sequence.desktopPath : sequence.path;
    const path = template.replace("{frame}", pad(sourceFrame, sequence.pad));
    return `${path}?v=${encodeURIComponent(config.assetVersion)}`;
  };

  function hydrateDeferredImages(sceneId) {
    const loadProducts = ["v04", "v05", "v06"].includes(sceneId);
    const loadDance = ["v05", "v06"].includes(sceneId);
    deferredImages.forEach((image) => {
      const source = image.dataset.src;
      if (!source) return;
      const isDance = Boolean(image.closest(".dance-trio"));
      if ((isDance && loadDance) || (!isDance && loadProducts)) {
        image.src = source;
        delete image.dataset.src;
      }
    });
  }

  function ensureImageReady(image) {
    if (!image) return Promise.resolve();
    if (image.dataset.src) {
      image.src = image.dataset.src;
      delete image.dataset.src;
    }
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }

  function setupScrollSpace() {
    scrollSpace.style.height = `${100 + totalFrames}vh`;
    scrollSpace.replaceChildren();
    stationUnits.forEach((unit) => {
      const marker = document.createElement("i");
      marker.className = "scroll-step";
      marker.style.top = `${unit}vh`;
      scrollSpace.appendChild(marker);
    });
  }

  function maxScroll() {
    return Math.max(1, document.documentElement.scrollHeight - innerHeight);
  }

  function scrollUnits() {
    return scrollY / Math.max(1, innerHeight / 100);
  }

  function globalFromScroll() {
    const limit = maxScroll();
    if (scrollY <= 1) return 0;
    if (limit - scrollY <= 2) return Math.max(0, totalFrames - 1);
    return clamp(scrollY / limit, 0, 1) * Math.max(0, totalFrames - 1);
  }

  function pointForGlobal(value) {
    const frame = Math.floor(clamp(value, 0, Math.max(0, totalFrames - 1)));
    const item = timeline.find((candidate) => frame <= candidate.end) || timeline[timeline.length - 1];
    return { ...item, index: clamp(frame - item.start, 0, item.sequence.count - 1), global: frame };
  }

  function nearestStationIndex(units = scrollUnits()) {
    let nearest = 0;
    let distance = Infinity;
    stationUnits.forEach((unit, index) => {
      const candidate = Math.abs(unit - units);
      if (candidate < distance) {
        distance = candidate;
        nearest = index;
      }
    });
    return { index: nearest, distance };
  }

  function closeRecord(record) {
    record?.bitmap?.close?.();
  }

  function touchFrame(url) {
    const record = state.frameCache.get(url);
    if (!record) return null;
    state.frameCache.delete(url);
    state.frameCache.set(url, record);
    return record;
  }

  function touchEncoded(url) {
    if (!state.encodedCache.has(url)) return null;
    const blob = state.encodedCache.get(url);
    state.encodedCache.delete(url);
    state.encodedCache.set(url, blob);
    return blob;
  }

  function enforceEncodedLimit(protectedUrl = null) {
    while (state.encodedCache.size > encodedLimit) {
      const candidate = state.encodedCache.keys().next().value;
      if (!candidate) break;
      if (candidate === protectedUrl) {
        const blob = state.encodedCache.get(candidate);
        state.encodedCache.delete(candidate);
        state.encodedCache.set(candidate, blob);
        continue;
      }
      state.encodedCache.delete(candidate);
    }
  }

  function enforceDecodeLimit(protectedUrl = null) {
    while (state.frameCache.size > cacheLimit) {
      const candidate = state.frameCache.keys().next().value;
      if (!candidate) break;
      if (candidate === protectedUrl) {
        const record = state.frameCache.get(candidate);
        state.frameCache.delete(candidate);
        state.frameCache.set(candidate, record);
        continue;
      }
      closeRecord(state.frameCache.get(candidate));
      state.frameCache.delete(candidate);
    }
  }

  async function fetchFrame(url) {
    if (state.encodedCache.has(url)) return touchEncoded(url);
    if (state.encodedPromises.has(url)) return state.encodedPromises.get(url);
    const promise = fetch(url, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
        return response.blob();
      })
      .then((blob) => {
        state.encodedCache.set(url, blob);
        enforceEncodedLimit(state.lastDrawn?.url);
        return blob;
      })
      .finally(() => state.encodedPromises.delete(url));
    state.encodedPromises.set(url, promise);
    return promise;
  }

  async function decodeFrame(url, id, index, token) {
    const blob = await fetchFrame(url);
    let bitmap = null;
    let image = null;
    if ("createImageBitmap" in window) bitmap = await createImageBitmap(blob).catch(() => null);
    if (!bitmap) {
      const objectUrl = URL.createObjectURL(blob);
      try {
        image = new Image();
        image.decoding = "async";
        image.src = objectUrl;
        if (image.decode) await image.decode();
        else await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
    if (token !== state.playToken) {
      bitmap?.close?.();
      return null;
    }
    return { url, id, index, bitmap, image };
  }

  async function ensureDecoded(id, index, token = state.playToken) {
    const sequence = config.sequences[id];
    const url = frameUrl(sequence, index);
    if (state.frameCache.has(url)) return touchFrame(url);
    if (state.failedUrls.has(url)) return null;
    if (state.decodePromises.has(url)) return state.decodePromises.get(url);
    const promise = decodeFrame(url, id, index, token)
      .then((record) => {
        if (record && token === state.playToken) {
          state.frameCache.set(url, record);
          enforceDecodeLimit(state.lastDrawn?.url);
        }
        return record;
      })
      .catch((error) => {
        state.failedUrls.add(url);
        console.warn(`[creative-v4] ${id} frame ${index + 1} failed`, error);
        return null;
      })
      .finally(() => state.decodePromises.delete(url));
    state.decodePromises.set(url, promise);
    return promise;
  }

  async function boundedMap(items, worker) {
    let cursor = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) await worker(items[cursor++]);
    });
    await Promise.all(runners);
  }

  function prefetchSequence(id) {
    if (state.prefetchJobs.has(id)) return state.prefetchJobs.get(id);
    const sequence = config.sequences[id];
    const urls = Array.from({ length: sequence.count }, (_, index) => frameUrl(sequence, index))
      .filter((url) => !state.encodedCache.has(url));
    const promise = (async () => {
      let cursor = 0;
      const runners = Array.from({ length: Math.min(2, urls.length) }, async () => {
        while (cursor < urls.length) await fetchFrame(urls[cursor++]).catch(() => null);
      });
      await Promise.all(runners);
    })().finally(() => state.prefetchJobs.delete(id));
    state.prefetchJobs.set(id, promise);
    return promise;
  }

  function windowIndices(sequence, index, forward) {
    const behind = isMobile ? 5 : 8;
    let start;
    let end;
    if (forward) {
      start = Math.max(0, index - behind);
      end = Math.min(sequence.count - 1, start + decodeWindowSize - 1);
      start = Math.max(0, end - decodeWindowSize + 1);
    } else {
      end = Math.min(sequence.count - 1, index + behind);
      start = Math.max(0, end - decodeWindowSize + 1);
      end = Math.min(sequence.count - 1, start + decodeWindowSize - 1);
    }
    const indices = Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
    return forward ? indices : indices.reverse();
  }

  function warmWindow(id, index, forward, { force = false } = {}) {
    const timelineItem = timeline.find((item) => item.id === id);
    const anchor = timelineItem.start + index;
    if (!force && Math.abs(anchor - state.decodeAnchor) < 5) return;
    state.decodeAnchor = anchor;
    const token = state.playToken;
    const indices = windowIndices(config.sequences[id], index, forward);
    boundedMap(indices, async (candidate) => {
      await ensureDecoded(id, candidate, token);
      requestRender();
    }).then(() => {
      requestRender();
    });
  }

  function coverTransform(sourceWidth, sourceHeight, targetWidth = canvas.width, targetHeight = canvas.height) {
    const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
    return {
      scale,
      width: sourceWidth * scale,
      height: sourceHeight * scale,
      x: (targetWidth - sourceWidth * scale) / 2,
      y: (targetHeight - sourceHeight * scale) / 2
    };
  }

  function positionFinalBrand() {
    const { sourceWidth, sourceHeight, x, y } = finalBrandAnchor;
    const transform = coverTransform(sourceWidth, sourceHeight, innerWidth, innerHeight);
    finalBrand.style.left = `${transform.x + x * transform.scale}px`;
    finalBrand.style.top = `${transform.y + y * transform.scale}px`;
  }

  function drawCover(drawable) {
    if (!drawable) return false;
    const sourceWidth = drawable.width || drawable.naturalWidth;
    const sourceHeight = drawable.height || drawable.naturalHeight;
    if (!sourceWidth || !sourceHeight) return false;
    const transform = coverTransform(sourceWidth, sourceHeight);
    ctx.fillStyle = "#171311";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(drawable, transform.x, transform.y, transform.width, transform.height);
    return true;
  }

  function drawFrame(id, index) {
    const sequence = config.sequences[id];
    const url = frameUrl(sequence, index);
    const record = touchFrame(url);
    if (!record || !drawCover(record.bitmap || record.image)) return false;
    state.lastDrawn = { id, index, url };
    posters.forEach((poster) => poster.classList.remove("is-visible"));
    if (scrollY > 1) {
      brandStage.classList.add("is-hidden");
      cornerControls.classList.add("is-visible");
    }
    return true;
  }

  function drawNearest(id, index) {
    const sequence = config.sequences[id];
    for (let distance = 1; distance < decodeWindowSize; distance += 1) {
      const before = index - distance;
      const after = index + distance;
      if (before >= 0 && drawFrame(id, before)) return true;
      if (after < sequence.count && drawFrame(id, after)) return true;
    }
    return false;
  }

  function renderTimeline(value) {
    if (!timeline.length || scrollY <= 1) return;
    const point = pointForGlobal(value);
    experience.dataset.scene = point.id;
    hydrateDeferredImages(point.id);
    const forward = state.direction >= 0;
    if (state.activeSequence !== point.id) {
      clearTimeout(state.sceneRevealTimer);
      clearTimeout(state.autoChoiceTimer);
      if (state.activeSequence === "v05") setInteractionLock(false, 220);
      experience.classList.remove("has-mix-bench");
      state.activeSequence = point.id;
      updateMission(point.id);
      state.decodeAnchor = -1000;
      state.finaleRevealed = false;
      setFinalInteractive(false);
      if (point.id !== "v05") {
        mixBench.classList.remove("is-visible");
        mixBench.setAttribute("aria-hidden", "true");
        mixBench.setAttribute("inert", "");
      }
      scheduleSceneReveal(point.id);
    }
    const token = state.playToken;
    const drawn = drawFrame(point.id, point.index);
    if (!drawn) {
      const canHoldLastFrame = forward && state.lastDrawn?.id === point.id && state.lastDrawn.index <= point.index;
      if (!canHoldLastFrame) drawNearest(point.id, point.index);
      ensureDecoded(point.id, point.index, token).then((record) => {
        if (record && token === state.playToken) requestRender();
      });
    }
    if (drawn && state.finaleRevealed && point.global >= totalFrames - 2 && maxScroll() - scrollY <= 2) {
      setFinalInteractive(true);
    }
    warmWindow(point.id, point.index, forward);

    const itemIndex = timeline.findIndex((item) => item.id === point.id);
    const next = forward ? timeline[itemIndex + 1] : timeline[itemIndex - 1];
    const edgeDistance = forward ? point.sequence.count - 1 - point.index : point.index;
    if (next && edgeDistance < 18) {
      const edge = forward ? 0 : next.sequence.count - 1;
      windowIndices(next.sequence, edge, forward).slice(0, 12).forEach((index) => {
        ensureDecoded(next.id, index, token).then(requestRender);
      });
    }
  }

  function renderLoop() {
    state.renderFrame = 0;
    const delta = state.targetGlobal - state.renderedGlobal;
    if (reducedMotion || Math.abs(delta) < 0.04) state.renderedGlobal = state.targetGlobal;
    else {
      state.renderedGlobal += delta * 0.2;
      if (Math.abs(state.targetGlobal - state.renderedGlobal) < 0.04) {
        state.renderedGlobal = state.targetGlobal;
      }
    }
    renderTimeline(state.renderedGlobal);
    if (Math.abs(state.targetGlobal - state.renderedGlobal) >= 0.04) {
      state.renderFrame = requestAnimationFrame(renderLoop);
    }
  }

  function requestRender() {
    if (!state.renderFrame) state.renderFrame = requestAnimationFrame(renderLoop);
  }

  function setCaption(station) {
    caption.className = `caption align-${station.align || "left"}${station.kind === "brand" ? " is-brand" : ""}`;
    title.textContent = station.title;
    copy.textContent = station.copy;
    status.textContent = station.title;
  }

  function setInteractionLock(active, delay = 0) {
    state.interactionLocked = active;
    experience.classList.toggle("is-interacting", active);
    if (active) {
      state.autoPlaying = false;
      state.autoLastTime = 0;
    } else {
      postponeAutoplay(delay);
    }
  }

  function updateMission(sceneId) {
    const mission = missionByScene[sceneId];
    const visible = Boolean(mission);
    missionHud?.classList.toggle("is-visible", visible);
    missionHud?.setAttribute("aria-hidden", String(!visible));
    if (!mission) return;
    missionStep.textContent = mission[0];
    missionTitle.textContent = mission[1];
    missionCopy.textContent = mission[2];
    missionProgress.style.width = `${mission[3]}%`;
  }

  function scheduleBriefingFallback() {
    clearTimeout(state.briefingTimer);
    state.briefingTimer = setTimeout(() => {
      if (!state.briefingComplete && scrollY <= 1) {
        selectOrder(state.order, { start: true, automatic: true });
      }
    }, reducedMotion ? 12000 : 8000);
  }

  function selectOrder(kind, { start = false, automatic = false } = {}) {
    if (!recipes[kind]) return;
    state.order = kind;
    orderButtons.forEach((button) => {
      const selected = button.dataset.order === kind;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    mixPrompt.textContent = `订单要：${recipes[kind].need}`;
    status.textContent = `已接下${recipes[kind].need}的订单`;
    if (start) {
      clearTimeout(state.briefingTimer);
      state.briefingComplete = true;
      unlockSoundtrack({ userInitiated: !automatic });
      orderBrief.classList.add("is-confirmed");
      updateMission("v01");
      state.autoResumeAt = performance.now() + 240;
      scrollToStation(1, "smooth");
    }
  }

  async function setResult(kind, { matched = kind === state.order } = {}) {
    const recipe = recipes[kind] || recipes.lemon;
    state.result = kind;
    experience.dataset.result = kind;
    experience.style.setProperty("--result-accent", recipe.accent);
    resultKicker.textContent = recipe.kicker;
    resultName.textContent = recipe.name;
    resultReason.textContent = matched ? recipe.reason : `这杯也完成了。下次按“${recipes[state.order].need}”提示调制，会更贴合订单。`;
    resultStamp.textContent = matched ? "订单完成" : "新口味完成";
    resultProduct.setAttribute("aria-label", `查看${recipe.name}`);
    if (resultImage.dataset.src || !resultImage.src.includes(recipe.image.split("/").at(-1))) {
      resultImage.dataset.src = recipe.image;
      resultImage.removeAttribute("src");
      await ensureImageReady(resultImage);
    }
    resultImage.alt = recipe.name;
  }

  function setFinalInteractive(active, { brand = active } = {}) {
    finalBrand.classList.toggle("is-visible", brand);
    finalBrand.setAttribute("aria-hidden", String(!brand));
    resultCard.classList.toggle("is-visible", active);
    resultCard.setAttribute("aria-hidden", String(!active));
    resultCard.toggleAttribute("inert", !active);
  }

  function replayClass(node, className) {
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
  }

  async function revealMixBench() {
    await ensureImageReady(mixBackdrop);
    if (state.activeSequence !== "v05") return;
    mixBench.classList.add("is-visible");
    experience.classList.add("has-mix-bench");
    mixBench.setAttribute("aria-hidden", "false");
    mixBench.removeAttribute("inert");
    replayClass(mixBench, "is-auto-revealing");
    setInteractionLock(true);
    clearTimeout(state.autoChoiceTimer);
    state.autoChoiceTimer = setTimeout(() => {
      if (state.activeSequence !== "v05" || state.selectedRecipe) return;
      const fallback = mixButtons.find((button) => button.dataset.mix === state.order);
      if (fallback) chooseMix(fallback, { automatic: true });
    }, reducedMotion ? 1200 : 4400);
  }

  async function revealFinale() {
    state.finaleRevealed = true;
    await setResult(state.result || state.selectedRecipe || state.order);
    setFinalInteractive(true, { brand: false });
    replayClass(resultCard, "is-auto-revealing");
  }

  function revealFinaleWhenReady(attempt = 0) {
    if (state.activeSequence !== "v06") return;
    if (state.lastDrawn?.id === "v06") {
      revealFinale();
      return;
    }
    if (attempt < 80) {
      state.sceneRevealTimer = setTimeout(() => revealFinaleWhenReady(attempt + 1), 100);
    }
  }

  function scheduleSceneReveal(sceneId) {
    if (sceneId !== "v05" && sceneId !== "v06") return;
    const delay = sceneId === "v05" ? 280 : 220;
    state.sceneRevealTimer = setTimeout(() => {
      if (state.activeSequence !== sceneId) return;
      if (sceneId === "v05") revealMixBench();
      else revealFinaleWhenReady();
    }, reducedMotion ? 0 : delay);
  }

  function updateSoundControl(mode) {
    const waiting = mode === "waiting";
    const muted = mode === "muted";
    const label = waiting || muted ? "开启声音" : "关闭声音";
    state.audioBlocked = waiting;
    soundToggle.classList.toggle("is-waiting", waiting);
    soundToggle.classList.toggle("is-muted", muted);
    cornerControls.classList.toggle("needs-sound", waiting);
    soundToggle.setAttribute("aria-label", label);
    soundToggle.setAttribute("aria-pressed", String(!waiting && !muted));
    soundToggle.title = label;
  }

  function unlockSoundtrack({ userInitiated = false } = {}) {
    if (!state.soundEnabled || !soundtrack) return Promise.resolve(false);
    if (state.audioUnlockPromise && !userInitiated) return state.audioUnlockPromise;
    soundtrack.volume = .68;
    const attemptId = ++state.audioAttempt;
    const attempt = soundtrack.play().then(() => {
      if (attemptId !== state.audioAttempt) return !soundtrack.paused;
      state.audioUnlocked = !soundtrack.paused;
      if (!state.audioUnlocked) throw new DOMException("Playback remained paused", "NotAllowedError");
      const duration = Number.isFinite(soundtrack.duration) && soundtrack.duration > 0 ? soundtrack.duration : 32;
      const desired = totalFrames > 1 ? state.targetGlobal / (totalFrames - 1) * duration : 0;
      if (Number.isFinite(soundtrack.duration)) soundtrack.currentTime = clamp(desired, 0, Math.max(0, duration - .2));
      updateSoundControl("playing");
      if (userInitiated) status.textContent = "声音已开启";
      return true;
    }).catch(() => {
      if (attemptId !== state.audioAttempt) return !soundtrack.paused;
      state.audioUnlocked = false;
      updateSoundControl("waiting");
      return false;
    }).finally(() => {
      if (state.audioUnlockPromise === attempt) state.audioUnlockPromise = null;
    });
    state.audioUnlockPromise = attempt;
    return attempt;
  }

  function flyIngredient(button, kind) {
    const rect = button.getBoundingClientRect();
    const targetRect = ingredientTray.getBoundingClientRect();
    const count = 9;
    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("span");
      particle.className = "ingredient-speck";
      const fromX = rect.left + rect.width / 2 + (Math.random() - .5) * 50;
      const fromY = rect.top + rect.height / 2 + (Math.random() - .5) * 50;
      const destinationX = targetRect.left + ({ lemon: 16, grape: 62, berry: 108 }[kind] || 16);
      const destinationY = targetRect.top + 12;
      particle.style.setProperty("--from-x", `${fromX}px`);
      particle.style.setProperty("--from-y", `${fromY}px`);
      particle.style.setProperty("--to-x", `${destinationX - fromX}px`);
      particle.style.setProperty("--to-y", `${destinationY - fromY}px`);
      particle.style.setProperty("--size", `${9 + Math.round(Math.random() * 7)}px`);
      particle.style.setProperty("--speck-color", { lemon: "#ffd629", grape: "#7950a5", berry: "#ef3d4b" }[kind]);
      fxLayer.appendChild(particle);
      particle.addEventListener("animationend", () => particle.remove(), { once: true });
    }
  }

  function pulseExperience(className, duration) {
    experience.classList.remove(className);
    requestAnimationFrame(() => experience.classList.add(className));
    setTimeout(() => experience.classList.remove(className), duration);
  }

  function collectIngredient(button, kind) {
    state.ingredients[kind] = 1;
    lemonCount.textContent = state.ingredients.lemon;
    grapeCount.textContent = state.ingredients.grape;
    berryCount.textContent = state.ingredients.berry;
    flyIngredient(button, kind);
    status.textContent = { lemon: "柠檬已装车", grape: "葡萄已装车", berry: "草莓原料已装车" }[kind];
  }

  function runSceneAction(button) {
    unlockSoundtrack({ userInitiated: true });
    postponeAutoplay(1200);
    const action = button.dataset.sceneAction;
    if (action === "boost") {
      state.boostUntil = performance.now() + 2200;
      pulseExperience("is-boosting", 1550);
      status.textContent = "采购车加速";
    } else if (action === "lemon" || action === "grape" || action === "berry") {
      collectIngredient(button, action);
      if (action === "berry") pulseExperience("is-berrying", 1050);
    } else if (action === "mix") {
      setInteractionLock(true);
      button.classList.remove("is-triggered");
      void button.offsetWidth;
      button.classList.add("is-triggered");
      setTimeout(() => {
        revealMixBench();
        status.textContent = "选择今天的配方";
      }, 330);
      setTimeout(() => button.classList.remove("is-triggered"), 430);
    } else if (action === "dance") {
      button.classList.remove("is-triggered");
      void button.offsetWidth;
      button.classList.add("is-triggered");
      setTimeout(async () => {
        await ensureImageReady(danceImage);
        pulseExperience("is-dancing", 3100);
        finalBrand.classList.remove("is-lit");
        requestAnimationFrame(() => finalBrand.classList.add("is-lit"));
        status.textContent = "雪王们一起跳舞";
      }, 390);
      setTimeout(() => button.classList.remove("is-triggered"), 460);
    }
  }

  function chooseMix(button, { automatic = false } = {}) {
    clearTimeout(state.autoChoiceTimer);
    const kind = button.dataset.mix;
    state.selectedRecipe = kind;
    mixButtons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
    mixButtons.forEach((candidate) => candidate.setAttribute("aria-checked", String(candidate === button)));
    mixBench.dataset.selected = kind;
    mixProducts.forEach((product) => product.classList.toggle("is-selected", product.dataset.product === kind));
    mixBench.classList.remove("is-pouring");
    requestAnimationFrame(() => mixBench.classList.add("is-pouring"));
    unlockSoundtrack({ userInitiated: !automatic });
    setResult(kind, { matched: kind === state.order });
    status.textContent = `${recipes[kind].name}完成`;
    setTimeout(() => setInteractionLock(false, 650), reducedMotion ? 100 : 900);
  }

  function chooseMixProduct(product) {
    const button = mixButtons.find((candidate) => candidate.dataset.mix === product.dataset.product);
    if (button) chooseMix(button);
  }

  function celebrateResult() {
    replayClass(resultProduct, "is-bouncing");
    const crown = sceneActionButtons.find((button) => button.dataset.sceneAction === "dance");
    if (crown) runSceneAction(crown);
  }

  function updateAutoplayControl() {
    const ended = globalFromScroll() >= totalFrames - 1.5;
    autoplayToggle.classList.toggle("is-paused", !state.autoEnabled || ended);
    autoplayToggle.querySelector("span").textContent = state.autoEnabled && !ended ? "Ⅱ" : "▶";
    const label = ended ? "重新自动巡游" : state.autoEnabled ? "暂停自动巡游" : "继续自动巡游";
    autoplayToggle.setAttribute("aria-label", label);
    autoplayToggle.title = label;
  }

  function postponeAutoplay(delay = 500) {
    if (!state.autoEnabled) return;
    state.autoResumeAt = performance.now() + delay;
    state.autoLastTime = 0;
    state.autoPlaying = false;
  }

  function bufferedFramesAhead(global, maximum = 20) {
    let buffered = 0;
    const start = Math.floor(global) + 1;
    for (let frame = start; frame < Math.min(totalFrames, start + maximum); frame += 1) {
      const point = pointForGlobal(frame);
      if (!state.frameCache.has(frameUrl(point.sequence, point.index))) break;
      buffered += 1;
    }
    return buffered;
  }

  function autoTour(now) {
    state.autoFrame = requestAnimationFrame(autoTour);
    state.autoHeartbeat = now;
    if (!state.autoEnabled || !state.briefingComplete || state.interactionLocked || !state.initialBufferReady || document.hidden || now < state.autoResumeAt || now < state.autoHoldUntil) {
      state.autoPlaying = false;
      state.autoLastTime = 0;
      return;
    }
    const current = globalFromScroll();
    if (current >= totalFrames - 1.2) {
      state.autoPlaying = false;
      updateAutoplayControl();
      return;
    }
    const bufferedAhead = bufferedFramesAhead(current);
    const remainingFrames = Math.max(0, totalFrames - 1 - Math.floor(current));
    const lowWater = Math.min(6, remainingFrames);
    const highWater = Math.min(14, remainingFrames);
    if (bufferedAhead < lowWater) state.autoBuffering = true;
    if (state.autoBuffering) {
      const point = pointForGlobal(current);
      warmWindow(point.id, point.index, true, { force: bufferedAhead < 3 });
      if (bufferedAhead < highWater) {
        state.autoPlaying = false;
        state.autoLastTime = now;
        return;
      }
      state.autoBuffering = false;
    }
    if (!state.autoLastTime) state.autoLastTime = now;
    const elapsed = Math.min(50, now - state.autoLastTime);
    state.autoLastTime = now;
    state.autoPlaying = true;
    const speed = now < state.boostUntil ? .03 : .0165;
    let next = Math.min(totalFrames - 1, current + elapsed * speed);
    const stop = stationUnits.slice(1).map((unit) => unit - 1)
      .find((frame) => frame > current + .35 && frame <= next + .35);
    if (stop !== undefined) {
      next = stop;
      state.autoHoldUntil = now + 320;
      setTimeout(settleFromScroll, 180);
    }
    const nextPoint = pointForGlobal(next);
    const nextUrl = frameUrl(nextPoint.sequence, nextPoint.index);
    if (!state.frameCache.has(nextUrl)) {
      ensureDecoded(nextPoint.id, nextPoint.index).then(requestRender);
      state.autoPlaying = false;
      state.autoLastTime = now;
      return;
    }
    state.autoWritingUntil = now + 120;
    scrollTo(0, next / Math.max(1, totalFrames - 1) * maxScroll());
  }

  function settleFromScroll() {
    const nearest = nearestStationIndex();
    state.currentStation = nearest.index;
    if (nearest.distance <= 4 || nearest.index === 0 || nearest.index === stationUnits.length - 1) {
      setCaption(config.stations[nearest.index]);
      caption.classList.remove("is-playing");
      const finalReady = state.lastDrawn?.id === timeline.at(-1)?.id &&
        state.lastDrawn.index >= timeline.at(-1).sequence.count - 2;
      const finaleActive = state.activeSequence === "v06" && state.finaleRevealed;
      setFinalInteractive(finaleActive, {
        brand: finaleActive && nearest.index === stationUnits.length - 1 && finalReady
      });
    } else {
      caption.classList.add("is-playing");
      setFinalInteractive(state.activeSequence === "v06" && state.finaleRevealed, { brand: false });
    }
  }

  function onScroll() {
    const nextTarget = globalFromScroll();
    state.direction = nextTarget >= state.targetGlobal ? 1 : -1;
    state.targetGlobal = nextTarget;
    if (state.audioUnlocked && performance.now() > state.autoWritingUntil && soundtrack.duration) {
      const desired = nextTarget / Math.max(1, totalFrames - 1) * soundtrack.duration;
      if (Math.abs(soundtrack.currentTime - desired) > .85) soundtrack.currentTime = desired;
    }
    caption.classList.add("is-playing");
    if (state.activeSequence !== "v06") setFinalInteractive(false);
    else if (state.finaleRevealed && nextTarget < totalFrames - 2) {
      setFinalInteractive(true, { brand: false });
    }
    if (scrollY <= 1) {
      brandStage.classList.remove("is-hidden");
      cornerControls.classList.remove("is-visible");
      missionHud.classList.remove("is-visible");
      missionHud.setAttribute("aria-hidden", "true");
      setCaption(config.stations[0]);
    }
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(settleFromScroll, 180);
    requestRender();
  }

  function scrollToStation(index, behavior = "smooth") {
    const target = clamp(index, 0, stationUnits.length - 1);
    scrollTo({ top: stationUnits[target] * innerHeight / 100, behavior });
  }

  function resizeCanvas() {
    const sourceWidth = useHdFrames ? 1920 : 1280;
    const sourceHeight = useHdFrames ? 1080 : 720;
    const sourceRatio = Math.min(sourceWidth / Math.max(1, innerWidth), sourceHeight / Math.max(1, innerHeight));
    const dpr = Math.max(.75, Math.min(devicePixelRatio || 1, useHdFrames ? 1.25 : 1, sourceRatio));
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    positionFinalBrand();
    if (state.lastDrawn) drawFrame(state.lastDrawn.id, state.lastDrawn.index);
  }

  async function prepareInitialPlayback() {
    const first = timeline[0];
    if (!first) return;
    const token = state.playToken;
    const indices = Array.from({ length: Math.min(initialBufferSize, first.sequence.count) }, (_, index) => index);
    await boundedMap(indices, (index) => ensureDecoded(first.id, index, token));
    state.initialBufferReady = true;
    state.autoResumeAt = Math.max(state.autoResumeAt, performance.now() + 120);
    requestRender();
    warmWindow(first.id, 0, true, { force: true });
  }

  function resetJourney({ choose = false } = {}) {
    clearTimeout(state.autoChoiceTimer);
    state.ingredients = { lemon: 0, grape: 0, berry: 0 };
    lemonCount.textContent = "0";
    grapeCount.textContent = "0";
    berryCount.textContent = "0";
    state.selectedRecipe = null;
    state.result = state.order;
    state.interactionLocked = false;
    mixButtons.forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-checked", "false");
    });
    mixProducts.forEach((product) => product.classList.remove("is-selected"));
    mixBench.classList.remove("is-visible", "is-pouring");
    experience.classList.remove("has-mix-bench");
    setFinalInteractive(false);
    orderBrief.classList.toggle("is-confirmed", !choose);
    state.briefingComplete = !choose;
    scrollTo({ top: 0, behavior: "smooth" });
    if (!choose) {
      state.autoResumeAt = performance.now() + 760;
      setTimeout(() => scrollToStation(1, "smooth"), 380);
    } else {
      state.autoResumeAt = performance.now() + 8000;
      scheduleBriefingFallback();
    }
  }

  addEventListener("scroll", onScroll, { passive: true });
  sceneActionButtons.forEach((button) => button.addEventListener("click", () => runSceneAction(button)));
  mixButtons.forEach((button) => button.addEventListener("click", () => chooseMix(button)));
  mixProducts.forEach((product) => product.addEventListener("click", () => chooseMixProduct(product)));
  orderButtons.forEach((button) => button.addEventListener("click", () => selectOrder(button.dataset.order)));
  startOrder.addEventListener("click", () => selectOrder(state.order, { start: true }));
  resultProduct.addEventListener("click", celebrateResult);
  changeOrder.addEventListener("click", () => resetJourney({ choose: true }));
  replayOrder.addEventListener("click", () => resetJourney({ choose: false }));
  addEventListener("wheel", () => { unlockSoundtrack(); postponeAutoplay(360); }, { passive: true });
  addEventListener("touchstart", (event) => {
    unlockSoundtrack({ userInitiated: true });
    postponeAutoplay(620);
  }, { passive: true });
  addEventListener("pointerdown", (event) => {
    unlockSoundtrack({ userInitiated: true });
    postponeAutoplay(event.target.closest("button") ? 5000 : 700);
  }, { passive: true });
  autoplayToggle.addEventListener("click", () => {
    unlockSoundtrack();
    const ended = globalFromScroll() >= totalFrames - 1.5;
    if (ended) scrollTo(0, 0);
    state.autoEnabled = !state.autoEnabled || ended;
    state.autoResumeAt = performance.now() + 180;
    state.autoLastTime = 0;
    updateAutoplayControl();
  });
  soundToggle.addEventListener("click", async () => {
    if (!state.audioUnlocked || soundtrack.paused) {
      state.soundEnabled = true;
      await unlockSoundtrack({ userInitiated: true });
      return;
    }
    state.soundEnabled = false;
    soundtrack.pause();
    updateSoundControl("muted");
  });
  addEventListener("keydown", (event) => {
    if (event.target.closest("button")) return;
    const downward = ["ArrowDown", "PageDown", "Enter", " "].includes(event.key);
    const upward = ["ArrowUp", "PageUp"].includes(event.key);
    if (!downward && !upward) return;
    event.preventDefault();
    const units = scrollUnits();
    const index = downward
      ? stationUnits.findIndex((unit) => unit > units + 4)
      : stationUnits.reduce((result, unit, candidate) => unit < units - 4 ? candidate : result, 0);
    scrollToStation(downward ? (index === -1 ? stationUnits.length - 1 : index) : index);
  });
  addEventListener("resize", () => {
    cancelAnimationFrame(state.resizeFrame);
    state.resizeFrame = requestAnimationFrame(() => {
      resizeCanvas();
      state.targetGlobal = globalFromScroll();
      state.renderedGlobal = state.targetGlobal;
      requestRender();
    });
  }, { passive: true });

  setupScrollSpace();
  loading.hidden = true;
  resizeCanvas();
  setCaption(config.stations[0]);
  selectOrder("lemon");
  scheduleBriefingFallback();
  prepareInitialPlayback();
  updateAutoplayControl();
  soundtrack.addEventListener("canplay", () => {
    if (state.soundEnabled && !state.audioUnlocked) unlockSoundtrack();
  }, { once: true });
  unlockSoundtrack();
  state.autoFrame = requestAnimationFrame(autoTour);
  setInterval(() => {
    if (!state.autoEnabled || document.hidden) return;
    if (performance.now() - state.autoHeartbeat > 700) {
      cancelAnimationFrame(state.autoFrame);
      state.autoLastTime = 0;
      state.autoFrame = requestAnimationFrame(autoTour);
    }
  }, 800);

  window.__CREATIVE_V3_DIAGNOSTICS__ = {
    scrollToStation,
    snapshot() {
      return {
        currentStation: config.stations[state.currentStation]?.id,
        activeSequence: state.activeSequence,
        targetGlobal: state.targetGlobal,
        renderedGlobal: state.renderedGlobal,
        encodedFrames: state.encodedCache.size,
        decodedFrames: state.frameCache.size,
        decodeLimit: cacheLimit,
        decodeWindowSize,
        assetTier: useHdFrames ? "desktop-hd" : "standard",
        lastDrawn: state.lastDrawn ? { id: state.lastDrawn.id, index: state.lastDrawn.index } : null,
        scrollUnits: scrollUnits(),
        totalFrames,
        finalBrandVisible: finalBrand.classList.contains("is-visible"),
        ingredients: { ...state.ingredients },
        soundEnabled: state.soundEnabled,
        audioUnlocked: state.audioUnlocked,
        audioBlocked: state.audioBlocked,
        autoEnabled: state.autoEnabled,
        autoPlaying: state.autoPlaying,
        autoBuffering: state.autoBuffering,
        initialBufferReady: state.initialBufferReady,
        interactionLocked: state.interactionLocked,
        order: state.order,
        selectedRecipe: state.selectedRecipe,
        result: state.result,
        resultVisible: resultCard.classList.contains("is-visible")
      };
    }
  };
})();
