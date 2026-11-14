import atlas from './isa-portrait-manifest.json';
import speechAtlas from './isa-speech-manifest.json';
import { IsaMotion, type IsaPose } from './isa-motion';

// Omit the source video's opening/closing idle poses in a long narration's loop.
// Keep all frames available to close the mouth when the audio actually ends.
const SPEECH_START = 12;
const SPEECH_END = 192;

/** Continuous pose tracks and supplied speech frames; no pasted facial parts. */
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
  const speechImages = new Map<number, HTMLImageElement>();
  const speechPending = new Set<number>();
  const speechFailed = new Set<number>();
  let speechPage = 0;
  let speechPosition = SPEECH_START;
  let speechTime: number | undefined;
  let speechAmount = 0;
  let speechRestTarget: number | undefined;
  let speechRestSpeed = speechAtlas.fps;
  let speechStopping = false;
  let lastSpeechTile: { image: HTMLImageElement; index: number } | undefined;
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

  function loadSpeechPage(index: number) {
    if (destroyed || speechImages.has(index) || speechPending.has(index) || speechFailed.has(index)) return;
    speechPending.add(index);
    const page = new Image();
    page.src = new URL(speechAtlas.pages[index].image, document.baseURI).href;
    void page.decode().then(() => {
      if (destroyed) return;
      // Retain only the current page and its successor, rather than decoding
      // one giant atlas on mobile or loading speech before it is needed.
      if (index === speechPage || index === nextSpeechPage()) {
        speechImages.set(index, page);
      }
    }).catch(() => { speechFailed.add(index); }).finally(() => { speechPending.delete(index); });
  }

  function nextSpeechPage() {
    const page = speechAtlas.pages[speechPage];
    return speaking && page.first + page.count >= SPEECH_END
      ? 0 : (speechPage + 1) % speechAtlas.pages.length;
  }

  function speechTile() {
    const index = Math.floor(speechPosition) % speechAtlas.sourceFrames.length;
    speechPage = speechAtlas.pages.findIndex(page => index >= page.first && index < page.first + page.count);
    const nextPage = nextSpeechPage();
    for (const key of speechImages.keys()) {
      if (key !== speechPage && key !== nextPage) speechImages.delete(key);
    }
    loadSpeechPage(speechPage);
    loadSpeechPage(nextPage);
    const page = speechAtlas.pages[speechPage];
    const image = speechImages.get(speechPage);
    if (image) lastSpeechTile = { image, index: index - page.first };
    // A late page must not flash the unrelated neutral portrait mid-sentence.
    return { ...lastSpeechTile, ready: !!image };
  }

  function restDistance(target: number) {
    const count = speechAtlas.sourceFrames.length;
    return ((target - speechPosition + count * 1.5) % count) - count / 2;
  }

  function nearestRest() {
    return speechAtlas.closed.reduce((best, value) =>
      Math.abs(restDistance(value)) < Math.abs(restDistance(best)) ? value : best);
  }

  function drawSpeechTile(source: HTMLImageElement, index: number, alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(source,
      index % speechAtlas.columns * speechAtlas.width,
      Math.floor(index / speechAtlas.columns) * speechAtlas.height,
      speechAtlas.width, speechAtlas.height, 0, 0, canvas.width, canvas.height);
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
    const speech = speechAmount > 0.001 ? speechTile() : undefined;
    const mix = speech?.image ? speechAmount : 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTile(a, (1 - fraction) * (1 - mix));
    if (fraction > 0.001) {
      ctx.globalCompositeOperation = 'lighter';
      drawTile(b, fraction * (1 - mix));
      ctx.globalCompositeOperation = 'source-over';
    }
    if (speech?.image && mix > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const fraction = speech.ready ? speechPosition % 1 : 0;
      const nextFrame = Math.floor(speechPosition) + 1;
      const nextIndex = speaking && nextFrame >= SPEECH_END
        ? SPEECH_START : nextFrame % speechAtlas.sourceFrames.length;
      const nextPage = speechAtlas.pages.findIndex(page => nextIndex >= page.first && nextIndex < page.first + page.count);
      const nextImage = speechImages.get(nextPage);
      // Blend neighboring native frames, including atlas page and loop boundaries.
      drawSpeechTile(speech.image, speech.index!, mix * (nextImage ? 1 - fraction : 1));
      if (nextImage && fraction > 0.001) {
        drawSpeechTile(nextImage, nextIndex - speechAtlas.pages[nextPage].first, mix * fraction);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    canvas.dataset['isaFrame'] = String(a);
    canvas.dataset['isaBlend'] = fraction.toFixed(3);
    canvas.dataset['isaTransition'] = motion.progress.toFixed(3);
    canvas.dataset['isaSpeechBlend'] = mix.toFixed(3);
    canvas.dataset['isaSpeechFrame'] = String(Math.floor(speechPosition));
  }

  function tick(now: number) {
    frameId = undefined;
    if (destroyed || !visible || document.hidden) return;
    const seconds = Math.min(Math.max(0, (now - lastTime) / 1000), 0.05);
    motion.advance(seconds);
    // Audio playback owns the portrait, including quiet gaps and the initial
    // turn: never expose a neutral pose between spoken fragments.
    const talking = speaking && !reduced;
    const speech = talking || speechStopping ? speechTile() : undefined;
    if (speechStopping && !speech?.ready) speechStopping = false;
    if (speech?.ready) {
      if (talking) {
        speechRestTarget = undefined;
        const frames = speechTime === undefined
          ? speechPosition - SPEECH_START + seconds * speechAtlas.fps
          : speechTime * speechAtlas.fps;
        speechPosition = SPEECH_START + frames % (SPEECH_END - SPEECH_START);
      } else if (speechStopping) {
        if (speechRestTarget === undefined) {
          speechRestTarget = nearestRest();
          speechRestSpeed = Math.max(speechAtlas.fps, Math.abs(restDistance(speechRestTarget)) / 0.25);
        }
        const distance = restDistance(speechRestTarget);
        const step = seconds * speechRestSpeed;
        if (Math.abs(distance) <= step) {
          speechPosition = speechRestTarget;
          speechStopping = false;
        } else {
          speechPosition = (speechPosition + Math.sign(distance) * step + speechAtlas.sourceFrames.length)
            % speechAtlas.sourceFrames.length;
        }
      }
    }
    const target = !reduced && (talking || speechStopping) && speech?.image ? 1 : 0;
    speechAmount += (target - speechAmount) * (1 - Math.exp(-seconds * (target ? 10 : 12)));
    if (speechAmount < 0.001 && target === 0) speechAmount = 0;
    lastTime = now;
    draw(now);
    if (motion.moving || blinkStarted !== undefined || speaking || speechStopping || speechAmount > 0) schedule();
  }

  function schedule() {
    if (!destroyed && !reduced && visible && !document.hidden && frameId === undefined)
      frameId = requestAnimationFrame(tick);
  }

  function blink() {
    if (destroyed || reduced || working || speaking || !visible || document.hidden
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

  function setPose(key: string, immediate: boolean) {
    if (!['isa-sleep', 'isa-awake', 'isa-right', 'isa-down'].includes(key)) return;
    if (speaking) key = 'isa-awake';
    reduced = immediate;
    if (immediate) {
      speechAmount = 0;
      speechStopping = false;
    }
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
    if (motion.moving || speaking || speechAmount > 0) schedule();
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
      if (speaking || speechAmount > 0) schedule();
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
      // Decode initial speech pages while Piper prepares the audio.
      if (value && !reduced) speechTile();
      if (!value) planIdleBlink();
      draw();
    },
    setSpeaking(value: boolean) {
      if (speaking === value) return;
      speaking = value;
      canvas.dataset['isaSpeaking'] = String(value);
      clearTimeout(blinkTimer);
      if (value) {
        motion.request('isa-awake', reduced);
        canvas.dataset['isaExpression'] = 'isa-awake';
        canvas.dataset['isaAnimation'] = reduced ? '' : 'isa-awake';
        blinkStarted = undefined;
        speechPosition = SPEECH_START;
        speechTime = undefined;
        speechRestTarget = undefined;
        speechStopping = false;
        lastSpeechTile = undefined;
        if (!reduced) speechTile();
      } else {
        speechStopping = !reduced && speechAmount > 0.001;
        speechRestTarget = undefined;
        blinkStarted = undefined;
        planIdleBlink();
      }
      if (frameId === undefined) lastTime = performance.now();
      draw();
      if (!reduced && (value || speechAmount > 0)) schedule();
    },
    setMouthOpening(_value: number) {
      // Compatibility with existing callers: amplitude no longer stops speech.
    },
    setSpeechTime(seconds: number) {
      if (!speaking || !Number.isFinite(seconds) || seconds < 0) return;
      speechTime = seconds;
      if (frameId === undefined) lastTime = performance.now();
      schedule();
    },
    destroy() {
      destroyed = true;
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      clearTimeout(blinkTimer);
      speechImages.clear();
      lastSpeechTile = undefined;
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      canvas.remove();
    },
  };
}
