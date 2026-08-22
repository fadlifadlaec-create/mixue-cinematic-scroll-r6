(() => {
  "use strict";
  const config = window.MIXUE_STORY_CONFIG;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const pad = (value) => String(value).padStart(4, "0");
  const products = {
    lemon: {
      name: "冰鲜柠檬水", image: "../assets/products/real-lemonade.png", number: "01",
      note: "刚跑完八百米的订单", values: [72, 24, 92],
      journeyTitle: "柠檬把甜拉亮。", journeyText: "第一口先到的是清爽。我们不需要把所有原料都装上车，只寻找这一杯真正需要的那一种。",
      match: "高清爽、轻口感，答案直接而明亮。", now: "刚跑完一段路，想把燥热放下。",
      response: "鲜柠的酸甜先把味觉拉亮，再让冰凉慢慢接住今天。", quote: "“把复杂的一天，先还原成清亮的一口。”", slip: "你选择了清爽和轻口感。"
    },
    grape: {
      name: "芋圆葡萄", image: "../assets/products/real-taro-grape.png", number: "02",
      note: "结束了很长一天的订单", values: [86, 84, 45],
      journeyTitle: "葡萄让时间慢一点。", journeyText: "果香先铺开，芋圆再留下可以咀嚼的停顿。这一杯不是催你赶路，而是允许你慢下来。",
      match: "高果味、丰富口感，适合把节奏放慢。", now: "结束了很长的一天，不想马上赶往下一件事。",
      response: "葡萄果香先打开一层，软糯芋圆再把一口的时间轻轻拉长。", quote: "“有些甜，不催你，只陪你慢慢嚼完。”", slip: "你选择了果香和丰富口感。"
    },
    berry: {
      name: "草莓波波", image: "../assets/products/real-strawberry-bobo.png", number: "03",
      note: "今天值得草莓味的订单", values: [94, 65, 58],
      journeyTitle: "草莓给今天换一种颜色。", journeyText: "不是每一种快乐都需要理由。草莓和波波把普通的一天调亮，这一次我们不播放错误的蛋糕影片。",
      match: "高果味、适中口感，把今天调得更轻快。", now: "没有坏消息，也不需要庆功，只是想认真奖励今天。",
      response: "草莓风味把颜色点亮，晶莹波波让轻快的节奏留在每一口。", quote: "“普通的一天，也值得被认真地甜一下。”", slip: "你选择了明亮果味和轻快口感。"
    }
  };
  const state = { order: "lemon", match: "lemon", history: [], playing: false, sound: false };
  const audio = $("#journey-score");
  const toast = $("#toast");
  let toastTimer = 0;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function chooseOrder(id, move = false) {
    state.order = id;
    $$('[data-order]').forEach((button) => button.setAttribute("aria-checked", String(button.dataset.order === id)));
    $("#letter-feedback").textContent = `已选中：${products[id].note}`;
    const motion = config.motion[id];
    $("#journey-frame").src = motion ? motion.path.replace("{frame}", pad(motion.from)) : products[id].image;
    $("#journey-frame").alt = motion ? `雪王寻找${id === "lemon" ? "柠檬" : "葡萄"}` : "真实草莓波波";
    $("#journey-title").textContent = products[id].journeyTitle;
    $("#journey-text").textContent = products[id].journeyText;
    $("#play-ingredient").innerHTML = motion ? '看两秒采购 <span>▶</span>' : '看草莓抵达 <span>✦</span>';
    applyPreset(id, false);
    if (move) $("#journey").scrollIntoView({ behavior: "smooth" });
  }

  function values() { return [$("#fruit").valueAsNumber, $("#texture").valueAsNumber, $("#fresh").valueAsNumber]; }
  function nearestMatch(current) {
    return Object.entries(products).map(([id, p]) => [id, p.values.reduce((sum, value, index) => sum + Math.pow(value - current[index], 2), 0)])
      .sort((a, b) => a[1] - b[1])[0][0];
  }
  function renderMatch(id) {
    state.match = id;
    const product = products[id];
    ["fruit", "texture", "fresh"].forEach((name) => { $(`#${name}-value`).textContent = $(`#${name}`).value; });
    $("#liquid-cup").dataset.match = id;
    $("#match-name").textContent = product.name; $("#match-reason").textContent = product.match;
    $("#story-name").textContent = product.name; $("#story-product").src = product.image; $("#story-product").alt = product.name;
    $("#story-number").textContent = product.number; $("#story-now").textContent = product.now; $("#story-response").textContent = product.response; $("#story-quote").textContent = product.quote;
    $("#slip-name").textContent = product.name; $("#slip-product").src = product.image; $("#slip-product").alt = product.name; $("#slip-reason").textContent = product.slip;
  }
  function setValues(next, remember = true) {
    if (remember) state.history.push(values());
    ["fruit", "texture", "fresh"].forEach((name, index) => { $(`#${name}`).value = next[index]; });
    renderMatch(nearestMatch(next));
  }
  function applyPreset(id, remember = true) { setValues(products[id].values, remember); }

  async function playMotion() {
    if (state.playing) return;
    const motion = config.motion[state.order];
    if (!motion) {
      const image = $("#journey-frame");
      image.animate([{ transform: "scale(.94)", opacity: .2 }, { transform: "scale(1)", opacity: 1 }], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" });
      $("#motion-status").textContent = "草莓订单使用真实饮品图，不再借用与故事无关的蛋糕视频。";
      return;
    }
    state.playing = true;
    const loading = $("#journey-loading");
    const bar = loading.querySelector("b");
    loading.hidden = false; bar.style.width = "0";
    const frames = [];
    for (let frame = motion.from; frame <= motion.to; frame += 1) {
      const image = new Image();
      image.decoding = "async";
      image.src = `${motion.path.replace("{frame}", pad(frame))}?v=${config.assetVersion}`;
      frames.push(image.decode?.().catch(() => {}) || Promise.resolve());
      if ((frame - motion.from) % 5 === 0) bar.style.width = `${Math.round((frame - motion.from) / (motion.to - motion.from) * 100)}%`;
    }
    await Promise.all(frames); bar.style.width = "100%"; loading.hidden = true;
    $("#motion-status").textContent = "采购进行中 · 播完会停在原料上，由你决定何时继续。";
    const start = performance.now();
    const duration = (motion.to - motion.from + 1) / motion.fps * 1000;
    await new Promise((resolve) => {
      function tick(now) {
        const index = Math.min(motion.to, motion.from + Math.floor((now - start) / 1000 * motion.fps));
        $("#journey-frame").src = `${motion.path.replace("{frame}", pad(index))}?v=${config.assetVersion}`;
        if (now - start < duration) requestAnimationFrame(tick); else resolve();
      }
      requestAnimationFrame(tick);
    });
    state.playing = false;
    $("#motion-status").textContent = "原料已找到。现在由你决定：继续调饮，或回看这一段。";
  }

  $$('[data-order]').forEach((button) => button.addEventListener("click", () => chooseOrder(button.dataset.order)));
  $$('[data-choice]').forEach((article) => article.querySelector("button").addEventListener("click", () => { chooseOrder(article.dataset.choice); $("#letters").scrollIntoView({ behavior: "smooth" }); showToast(`已记住：${products[article.dataset.choice].name}`); }));
  $("#accept-order").addEventListener("click", () => chooseOrder(state.order, true));
  $("#play-ingredient").addEventListener("click", playMotion);
  ["fruit", "texture", "fresh"].forEach((name) => {
    const slider = $(`#${name}`);
    slider.addEventListener("pointerdown", () => state.history.push(values()), { passive: true });
    slider.addEventListener("keydown", () => state.history.push(values()));
    slider.addEventListener("input", () => renderMatch(nearestMatch(values())));
  });
  $("#undo-flavor").addEventListener("click", () => { const prior = state.history.pop(); if (prior) setValues(prior, false); else showToast("已经是第一步"); });
  $("#reset-flavor").addEventListener("click", () => setValues([50, 50, 50]));
  $("#skip-flavor").addEventListener("click", () => { applyPreset(state.order); showToast("已按纸条给出推荐"); });
  $("#show-result").addEventListener("click", () => { $("#result-slip").classList.add("is-open"); $("#result-slip").setAttribute("aria-hidden", "false"); });
  $("#close-slip").addEventListener("click", () => { $("#result-slip").classList.remove("is-open"); $("#result-slip").setAttribute("aria-hidden", "true"); });
  $("#change-mood").addEventListener("click", () => $("#letters").scrollIntoView({ behavior: "smooth" }));
  $("#crown-egg").addEventListener("click", () => { const dance = $("#dance-trio"); dance.hidden = !dance.hidden; showToast(dance.hidden ? "雪王们回到队伍" : "皇冠收到：一起跳一下"); });
  $("#sound-toggle").addEventListener("click", async () => {
    state.sound = !state.sound;
    if (state.sound) { audio.volume = .5; await audio.play().catch(() => { state.sound = false; showToast("浏览器需要再次点击才能播放声音"); }); } else audio.pause();
    $("#sound-toggle").setAttribute("aria-pressed", String(state.sound)); $("#sound-toggle").setAttribute("aria-label", state.sound ? "关闭音乐" : "开启音乐");
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") $("#close-slip").click(); });

  const chapters = $$(".chapter");
  const chapterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) $("#chapter-label").textContent = entry.target.dataset.chapter; });
  }, { threshold: .55 });
  chapters.forEach((chapter) => chapterObserver.observe(chapter));
  addEventListener("scroll", () => { const max = document.documentElement.scrollHeight - innerHeight; $("#reading-progress").style.width = `${Math.min(100, scrollY / Math.max(1, max) * 100)}%`; }, { passive: true });

  chooseOrder("lemon");
  audio.volume = .5;
  audio.play().then(() => {
    state.sound = true;
    $("#sound-toggle").setAttribute("aria-pressed", "true");
    $("#sound-toggle").setAttribute("aria-label", "关闭音乐");
  }).catch(() => {});
})();
