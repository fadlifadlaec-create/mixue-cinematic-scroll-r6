window.CREATIVE_V3_CONFIG = {
  version: "creative-v4-story",
  assetVersion: "20260821-interaction-r6",
  concurrency: { desktop: 6, mobile: 4 },
  cacheLimit: { desktop: 36, mobile: 28 },
  wheelIdleMs: 400,
  swipeThreshold: 44,
  sequences: {
    v01: { path: "assets/sequences/v01-clean-v5/frame_{frame}.webp", desktopPath: "assets/sequences-hd/v01-clean-v5/frame_{frame}.webp", sourceDir: "v01-clean-v5", pad: 4, count: 0, duration: 5000 },
    v02: { path: "assets/sequences/v02/frame_{frame}.webp", desktopPath: "assets/sequences-hd/v02/frame_{frame}.webp", pad: 4, count: 0, duration: 5000 },
    v03: { path: "assets/sequences/v03/frame_{frame}.webp", desktopPath: "assets/sequences-hd/v03/frame_{frame}.webp", pad: 4, count: 0, duration: 5000 },
    v04: { path: "assets/sequences/v04/frame_{frame}.webp", desktopPath: "assets/sequences-hd/v04/frame_{frame}.webp", pad: 4, count: 0, duration: 5000 },
    v05: { path: "assets/sequences/v05/frame_{frame}.webp", desktopPath: "assets/sequences-hd/v05/frame_{frame}.webp", pad: 4, count: 0, frameOffset: 0, trimCount: 72, duration: 3600 },
    v06: { path: "assets/sequences/v06/frame_{frame}.webp", desktopPath: "assets/sequences-hd/v06/frame_{frame}.webp", pad: 4, count: 0, frameOffset: 60, trimCount: 60, duration: 3000 }
  },
  stations: [
    { id: "brand", kind: "brand", title: "蜜雪冰城", copy: "始于 1997 · 冰淇淋与茶", align: "center" },
    {
      id: "v01", kind: "sequence", sequenceId: "v01",
      poster: "assets/keyframes/v01-end.png",
      keyframes: [
        "assets/keyframes/castle-original-wide.png",
        "assets/keyframes/v01-mid.png",
        "assets/keyframes/v01-end.png"
      ],
      expectedKeyframes: [
        "assets/keyframes/castle-original-wide.png",
        "assets/keyframes/v01-mid.png",
        "assets/keyframes/v01-end.png"
      ],
      title: "出发，去找原料", copy: "今天的菜单，从一辆小小采购车开始。", align: "bottom-left"
    },
    {
      id: "v02", kind: "sequence", sequenceId: "v02",
      poster: "assets/keyframes/v02-end.png",
      keyframes: [
        "assets/keyframes/v01-end.png",
        "assets/keyframes/v02-mid.png",
        "assets/keyframes/v02-end.png"
      ],
      expectedKeyframes: [
        "assets/keyframes/v01-end.png",
        "assets/keyframes/v02-mid.png",
        "assets/keyframes/v02-end.png"
      ],
      title: "柠檬，装车", copy: "追上新鲜柠檬，先收下第一份清爽。", align: "top-left"
    },
    {
      id: "v03", kind: "sequence", sequenceId: "v03",
      poster: "assets/keyframes/v03-end.png",
      keyframes: [
        "assets/keyframes/v03-start.png",
        "assets/keyframes/v03-mid.png",
        "assets/keyframes/v03-end.png"
      ],
      expectedKeyframes: [
        "assets/keyframes/v03-start.png",
        "assets/keyframes/v03-mid.png",
        "assets/keyframes/v03-end.png"
      ],
      title: "葡萄，装车", copy: "分头追、一起接，紫色果香装满小车。", align: "top-left"
    },
    {
      id: "v04", kind: "sequence", sequenceId: "v04",
      poster: "assets/keyframes/v04-end.png",
      keyframes: [
        "assets/keyframes/v04-start.png",
        "assets/keyframes/v04-mid.png",
        "assets/keyframes/v04-end.png"
      ],
      expectedKeyframes: [
        "assets/keyframes/v04-start.png",
        "assets/keyframes/v04-mid.png",
        "assets/keyframes/v04-end.png"
      ],
      title: "草莓，也收好", copy: "带上草莓和奶香，今天的原料齐了。", align: "top-left"
    },
    {
      id: "v05", kind: "sequence", sequenceId: "v05",
      poster: "assets/toys/v05-mix-lab.png",
      keyframes: [
        "assets/toys/v05-mix-lab.png",
        "assets/products/real-taro-grape.png",
        "assets/toys/v05-mix-lab.png"
      ],
      expectedKeyframes: [
        "assets/toys/v05-mix-lab.png",
        "assets/products/real-strawberry-bobo.png",
        "assets/toys/v05-mix-lab.png"
      ],
      title: "回店，开始调饮", copy: "柠檬、葡萄、草莓，点一下做成今日菜单。", align: "top-left"
    },
    {
      id: "v06", kind: "sequence", sequenceId: "v06",
      poster: "assets/keyframes/v06-end.png",
      keyframes: [
        "assets/keyframes/v06-start.png",
        "assets/keyframes/v06-mid.png",
        "assets/keyframes/v06-end.png"
      ],
      expectedKeyframes: [
        "assets/keyframes/v06-start.png",
        "assets/keyframes/v06-mid.png",
        "assets/keyframes/v06-end.png"
      ],
      title: "今日菜单，完成", copy: "柠檬水、芋圆葡萄和草莓波波，正式开卖。", align: "top-left"
    }
  ]
};
