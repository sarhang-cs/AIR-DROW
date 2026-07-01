const TASKS_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const PROFILES = {
  sensitive: { detect: .45, presence: .45, track: .42, start: .070, stop: .092, smoothing: .28 },
  balanced: { detect: .60, presence: .60, track: .55, start: .058, stop: .078, smoothing: .42 },
  stable: { detect: .72, presence: .72, track: .68, start: .050, stop: .070, smoothing: .56 }
};

export class HandEngine {
  constructor({ video, overlay, onPoint, onStrokeStart, onStrokeEnd, onStatus, onFps }) {
    this.video = video;
    this.overlay = overlay;
    this.ctx = overlay.getContext("2d");
    this.onPoint = onPoint;
    this.onStrokeStart = onStrokeStart;
    this.onStrokeEnd = onStrokeEnd;
    this.onStatus = onStatus;
    this.onFps = onFps;
    this.landmarker = null;
    this.stream = null;
    this.running = false;
    this.profileName = "balanced";
    this.targetFps = 30;
    this.lastDetectAt = 0;
    this.lastFrameAt = 0;
    this.lastSeenAt = 0;
    this.pinching = false;
    this.smoothed = null;
    this.loopId = 0;
    this.delegate = "Not started";
  }

  profile() { return PROFILES[this.profileName] || PROFILES.balanced; }

  async start({ profileName = "balanced", targetFps = 30, preview = false } = {}) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera API unavailable in this browser");
    this.profileName = profileName;
    this.targetFps = Number(targetFps) || 30;
    this.video.style.opacity = preview ? ".42" : "0";
    this.onStatus?.("Requesting camera permission…");

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 960, max: 1280 },
        height: { ideal: 540, max: 720 },
        frameRate: { ideal: Math.min(this.targetFps, 45), max: 45 }
      },
      audio: false
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    await this.createLandmarker();
    this.running = true;
    this.lastFrameAt = performance.now();
    this.onStatus?.(`Ready • ${this.delegate}`);
    this.loop();
  }

  async createLandmarker() {
    const { FilesetResolver, HandLandmarker } = await import(TASKS_URL);
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    const p = this.profile();
    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: p.detect,
      minHandPresenceConfidence: p.presence,
      minTrackingConfidence: p.track
    };

    try {
      this.landmarker = await HandLandmarker.createFromOptions(fileset, options);
      this.delegate = "GPU requested";
    } catch {
      options.baseOptions.delegate = "CPU";
      this.landmarker = await HandLandmarker.createFromOptions(fileset, options);
      this.delegate = "CPU fallback";
    }
  }

  async applyProfile(profileName) {
    this.profileName = profileName;
    const p = this.profile();
    if (this.landmarker?.setOptions) {
      await this.landmarker.setOptions({
        minHandDetectionConfidence: p.detect,
        minHandPresenceConfidence: p.presence,
        minTrackingConfidence: p.track
      });
    }
  }

  resize(width, height, dpr) {
    this.overlay.width = Math.max(1, Math.round(width * dpr));
    this.overlay.height = Math.max(1, Math.round(height * dpr));
    this.overlay.style.width = `${width}px`;
    this.overlay.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.loopId);
    if (this.pinching) this.onStrokeEnd?.();
    this.pinching = false;
    this.smoothed = null;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    try { this.landmarker?.close?.(); } catch {}
    this.landmarker = null;
    this.clear();
    this.onStatus?.("Stopped");
  }

  loop() {
    if (!this.running) return;
    this.loopId = requestAnimationFrame(() => this.loop());
    const now = performance.now();
    if (now - this.lastDetectAt < 1000 / this.targetFps || this.video.readyState < 2 || !this.landmarker) return;
    this.lastDetectAt = now;

    try {
      const result = this.landmarker.detectForVideo(this.video, now);
      this.handleResult(result, now);
    } catch (error) {
      this.onStatus?.(`Tracking stopped: ${error?.message || "unknown error"}`);
      this.stop();
      return;
    }

    const delta = now - this.lastFrameAt;
    if (delta > 0) this.onFps?.(Math.round(1000 / delta));
    this.lastFrameAt = now;
  }

  handleResult(result, now) {
    this.clear();
    const hands = result?.landmarks || [];
    if (!hands.length) {
      if (this.pinching && now - this.lastSeenAt > 180) {
        this.pinching = false;
        this.onStrokeEnd?.();
      }
      this.onStatus?.("Hand not found");
      return;
    }

    const points = hands[0];
    this.lastSeenAt = now;
    this.drawSkeleton(points);
    const index = points[8];
    const thumb = points[4];
    const distance = Math.hypot(index.x - thumb.x, index.y - thumb.y);
    const p = this.profile();
    const target = { x: index.x, y: index.y, pressure: 1, pointerType: "hand", time: now };
    this.smoothed = this.smoothed
      ? { ...target, x: this.smoothed.x + (target.x - this.smoothed.x) * (1 - p.smoothing), y: this.smoothed.y + (target.y - this.smoothed.y) * (1 - p.smoothing) }
      : target;

    if (!this.pinching && distance < p.start) {
      this.pinching = true;
      this.onStrokeStart?.(this.smoothed);
    } else if (this.pinching && distance > p.stop) {
      this.pinching = false;
      this.onStrokeEnd?.();
    }

    if (this.pinching) this.onPoint?.(this.smoothed);
    this.onStatus?.(`${this.pinching ? "Drawing" : "Tracking"} • pinch ${distance.toFixed(3)} • ${this.delegate}`);
  }

  clear() {
    const rect = this.overlay.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }

  drawSkeleton(points) {
    const rect = this.overlay.getBoundingClientRect();
    const map = p => ({ x: (1 - p.x) * rect.width, y: p.y * rect.height });
    const links = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "rgba(105,184,255,.82)";
    this.ctx.fillStyle = "rgba(98,230,181,.96)";
    for (const [a,b] of links) {
      const p1 = map(points[a]), p2 = map(points[b]);
      this.ctx.beginPath(); this.ctx.moveTo(p1.x,p1.y); this.ctx.lineTo(p2.x,p2.y); this.ctx.stroke();
    }
    for (const point of points) {
      const p = map(point);
      this.ctx.beginPath(); this.ctx.arc(p.x,p.y,3,0,Math.PI*2); this.ctx.fill();
    }
    this.ctx.restore();
  }
}
