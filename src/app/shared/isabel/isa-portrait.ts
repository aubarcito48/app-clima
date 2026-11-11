import atlas from './isa-portrait-manifest.json';

type Pose = 'isa-sleep' | 'isa-awake' | 'isa-right' | 'isa-down';
type Transition = { from: HTMLCanvasElement; frames: number[]; start: number; duration: number };

/** One local WebP, no video player, remote service, cursor listener or perpetual render loop. */
export async function createIsaPortrait(host: HTMLElement) {
  const image = new Image();
  image.src = new URL(atlas.image, document.baseURI).href;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('data-isa-mouth', '');
  canvas.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain';
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Isa needs a 2D canvas');
  host.append(canvas);
  const ctx = context;
  let pose: Pose = 'isa-sleep';
  let transition: Transition | undefined;
  let frameId: number | undefined;
  let blinkTimer: ReturnType<typeof setTimeout> | undefined;
  let blinkStarted: number | undefined;
  let speaking = false;
  let opening = 0;
  let reduced = false;
  let destroyed = false;
  let visible = true;
  let lastDraw = 0;

  const finalFrame = (value: Pose) =>
    value === 'isa-sleep' ? atlas.poses.sleep
      : value === 'isa-right' ? atlas.right[atlas.right.length - 1]
        : value === 'isa-down' ? atlas.down[atlas.down.length - 1] : atlas.front;

  function drawTile(index: number, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, index % atlas.columns * atlas.width,
      Math.floor(index / atlas.columns) * atlas.height, atlas.width, atlas.height,
      0, 0, atlas.width, atlas.height);
  }

  function drawSequence(frames: number[], progress: number) {
    const position = Math.min(1, Math.max(0, progress)) * (frames.length - 1);
    const index = Math.floor(position);
    const fraction = position - index;
    drawTile(frames[index], 1 - fraction);
    if (fraction > 0) {
      // Add premultiplied colors so transparent edges don't darken while blending.
      ctx.globalCompositeOperation = 'lighter';
      drawTile(frames[Math.min(index + 1, frames.length - 1)], fraction);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  function draw(now = performance.now()) {
    if (destroyed || !visible || document.hidden) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let progress = 1;
    if (transition) {
      progress = Math.min(1, (now - transition.start) / transition.duration);
      if (transition.frames.length === 1) {
        const eased = progress * progress * (3 - 2 * progress);
        ctx.globalAlpha = 1 - eased;
        ctx.drawImage(transition.from, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        drawTile(transition.frames[0], eased);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      } else if (progress < 0.15) {
        ctx.globalAlpha = 1 - progress / 0.15;
        ctx.drawImage(transition.from, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        drawTile(transition.frames[0], progress / 0.15);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      } else {
        drawSequence(transition.frames, (progress - 0.15) / 0.85);
      }
      if (progress >= 1) transition = undefined;
    } else if (blinkStarted !== undefined && pose === 'isa-awake' && !reduced) {
      const blinkProgress = (now - blinkStarted) / 450;
      drawSequence(atlas.blink, blinkProgress);
      if (blinkProgress >= 1) blinkStarted = undefined;
    } else {
      drawTile(finalFrame(pose));
    }
    // Amplitude-driven approximation, not phoneme/viseme lip synchronization.
    const mouth = speaking && pose === 'isa-awake' && !transition && !reduced ? opening : 0;
    if (mouth > 0) drawTile(atlas.poses.mouth, Math.min(1, mouth * 1.8));
    ctx.globalAlpha = 1;
    canvas.dataset['opening'] = mouth.toFixed(2);
    canvas.dataset['isaTransition'] = progress.toFixed(3);
    canvas.dataset['isaFrame'] = String(finalFrame(pose));
  }

  function tick(now: number) {
    frameId = undefined;
    if (destroyed || !visible || document.hidden) return;
    if (now - lastDraw >= 30) {
      draw(now);
      lastDraw = now;
    }
    if (transition || blinkStarted !== undefined) schedule();
  }

  function schedule() {
    if (!destroyed && visible && !document.hidden && frameId === undefined)
      frameId = requestAnimationFrame(tick);
  }

  function planBlink() {
    clearTimeout(blinkTimer);
    if (destroyed || reduced || !visible || document.hidden || pose !== 'isa-awake') return;
    blinkTimer = setTimeout(() => {
      if (!transition) {
        blinkStarted = performance.now();
        schedule();
      }
      planBlink();
    }, 4500 + Math.random() * 2500);
  }

  function setPose(key: string, immediate: boolean) {
    if (!['isa-sleep', 'isa-awake', 'isa-right', 'isa-down'].includes(key)) return;
    const next = key as Pose;
    reduced = immediate;
    canvas.dataset['isaExpression'] = next;
    canvas.dataset['isaAnimation'] = immediate ? '' : next;
    blinkStarted = undefined;
    if (pose !== next || immediate) {
      const snapshot = document.createElement('canvas');
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      snapshot.getContext('2d')?.drawImage(canvas, 0, 0);
      let frames: number[] = [finalFrame(next)];
      if (next === 'isa-right') frames = [...atlas.right];
      else if (next === 'isa-down') frames = [...atlas.down];
      else if (next === 'isa-awake' && pose === 'isa-right') frames = [...atlas.right].reverse();
      else if (next === 'isa-awake' && pose === 'isa-down') frames = [...atlas.down].reverse();
      transition = immediate ? undefined : { from: snapshot, frames, start: performance.now(),
        duration: next === 'isa-sleep' ? 1500 : pose === 'isa-sleep' ? 1100
          : Math.max(500, frames.length / atlas.fps * 1000) };
      pose = next;
    }
    draw();
    schedule();
    planBlink();
  }

  function visibilityChanged() {
    if (document.hidden || !visible) {
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      frameId = undefined;
      clearTimeout(blinkTimer);
    } else {
      transition = undefined;
      blinkStarted = undefined;
      draw();
      planBlink();
    }
  }
  document.addEventListener('visibilitychange', visibilityChanged);
  const observer = typeof IntersectionObserver === 'undefined' ? undefined
    : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibilityChanged(); });
  observer?.observe(host);
  canvas.dataset['isaExpression'] = pose;
  canvas.dataset['isaAnimation'] = pose;
  draw();

  return {
    play: (key: string) => setPose(key, false),
    setExpression: (key: string) => setPose(key, true),
    setSpeaking(value: boolean) {
      speaking = value;
      if (!value) opening = 0;
      draw();
    },
    setMouthOpening(value: number) {
      const next = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      if (next === opening) return;
      opening = next;
      draw();
    },
    destroy() {
      destroyed = true;
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      clearTimeout(blinkTimer);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      canvas.remove();
    },
  };
}
