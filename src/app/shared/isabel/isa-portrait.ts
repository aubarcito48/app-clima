import atlas from './isa-portrait-manifest.json';
import { IsaMotion, type IsaPose } from './isa-motion';

/** One video source; continuous spring position, no replayed clips or pasted facial parts. */
export async function createIsaPortrait(host: HTMLElement) {
  const image = new Image();
  image.src = new URL(atlas.image, document.baseURI).href;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain';
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Isa needs a 2D canvas');
  host.append(canvas);
  const ctx = context;
  const motion = new IsaMotion();
  let frameId: number | undefined;
  let blinkTimer: ReturnType<typeof setTimeout> | undefined;
  let speechTimers: ReturnType<typeof setTimeout>[] = [];
  let blinkStarted: number | undefined;
  let reduced = false;
  let working = false;
  let speaking = false;
  let destroyed = false;
  let visible = true;
  let lastTime = performance.now();

  function drawTile(index: number, alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, index % atlas.columns * atlas.width,
      Math.floor(index / atlas.columns) * atlas.height, atlas.width, atlas.height,
      0, 0, atlas.width, atlas.height);
  }

  function draw(now = performance.now()) {
    if (destroyed || !visible || document.hidden) return;
    let frames: number[] = atlas.tracks[motion.branch];
    let position = motion.position;
    if (blinkStarted !== undefined && !motion.moving && !working && !reduced) {
      const progress = Math.min(1, (now - blinkStarted) / 220);
      frames = atlas.blink;
      position = progress;
      if (progress >= 1) blinkStarted = undefined;
    }
    const value = position * (frames.length - 1);
    const index = Math.floor(value);
    const fraction = value - index;
    const a = frames[index];
    const b = frames[Math.min(index + 1, frames.length - 1)];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTile(a, 1 - fraction);
    if (fraction > 0.001) {
      ctx.globalCompositeOperation = 'lighter';
      drawTile(b, fraction);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    canvas.dataset['isaFrame'] = String(a);
    canvas.dataset['isaBlend'] = fraction.toFixed(3);
    canvas.dataset['isaTransition'] = motion.progress.toFixed(3);
  }

  function tick(now: number) {
    frameId = undefined;
    if (destroyed || !visible || document.hidden) return;
    motion.advance((now - lastTime) / 1000);
    lastTime = now;
    draw(now);
    if (motion.moving || blinkStarted !== undefined) schedule();
  }

  function schedule() {
    if (!destroyed && !reduced && visible && !document.hidden && frameId === undefined)
      frameId = requestAnimationFrame(tick);
  }

  function blink() {
    if (destroyed || reduced || working || !visible || document.hidden
        || motion.pose !== 'isa-awake' || motion.moving) return;
    blinkStarted = performance.now();
    lastTime = blinkStarted;
    schedule();
  }

  function planIdleBlink() {
    clearTimeout(blinkTimer);
    if (destroyed || reduced || working || speaking || !visible || document.hidden
        || motion.pose !== 'isa-awake') return;
    blinkTimer = setTimeout(() => {
      blink();
      planIdleBlink();
    }, 4500 + Math.random() * 2000);
  }

  function clearSpeechTimers() {
    speechTimers.forEach(clearTimeout);
    speechTimers = [];
  }

  function setPose(key: string, immediate: boolean) {
    if (!['isa-sleep', 'isa-awake', 'isa-right', 'isa-down'].includes(key)) return;
    reduced = immediate;
    blinkStarted = undefined;
    // Do not copy the canvas or return to frame zero on an interrupted movement.
    motion.request(key as IsaPose, immediate);
    canvas.dataset['isaExpression'] = key;
    canvas.dataset['isaAnimation'] = immediate ? '' : key;
    if (frameId === undefined) lastTime = performance.now();
    if (immediate && frameId !== undefined) {
      cancelAnimationFrame(frameId);
      frameId = undefined;
    }
    draw();
    if (motion.moving) schedule();
    planIdleBlink();
  }

  function visibilityChanged() {
    if (document.hidden || !visible) {
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      frameId = undefined;
      clearTimeout(blinkTimer);
      blinkStarted = undefined;
    } else {
      // Elapsed hidden time is not replayed. Resume at the requested pose.
      motion.request(motion.pose, true);
      lastTime = performance.now();
      draw();
      planIdleBlink();
    }
  }
  document.addEventListener('visibilitychange', visibilityChanged);
  const observer = typeof IntersectionObserver === 'undefined' ? undefined
    : new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === visible) return;
      visible = entry.isIntersecting;
      visibilityChanged();
    });
  observer?.observe(host);
  canvas.dataset['isaExpression'] = motion.pose;
  canvas.dataset['isaAnimation'] = motion.pose;
  canvas.dataset['isaSpeaking'] = 'false';
  draw();

  return {
    play: (key: string) => setPose(key, false),
    setExpression: (key: string) => setPose(key, true),
    setWorking(value: boolean) {
      if (working === value) return;
      working = value;
      blinkStarted = undefined;
      clearTimeout(blinkTimer);
      if (!value) planIdleBlink();
      draw();
    },
    setSpeaking(value: boolean) {
      if (speaking === value) return;
      speaking = value;
      canvas.dataset['isaSpeaking'] = String(value);
      clearSpeechTimers();
      clearTimeout(blinkTimer);
      if (value) {
        // Like the old lifecycle: two gestures per narration, never repeated waiting turns.
        speechTimers = [1000, 7000].map((delay) => setTimeout(blink, delay));
      } else {
        blinkStarted = undefined;
        planIdleBlink();
      }
      draw();
    },
    destroy() {
      destroyed = true;
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      clearTimeout(blinkTimer);
      clearSpeechTimers();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      canvas.remove();
    },
  };
}
