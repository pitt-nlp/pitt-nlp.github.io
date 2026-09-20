export function initSlider(root) {
  if (!root) return;

  const viewport = root.querySelector('.slider__viewport');
  const track = root.querySelector('.slider__track');
  if (!viewport || !track) return;

  const originals = [...track.querySelectorAll('.slider__slide')];
  if (originals.length < 2) return;

  function muteClone(node) {
    node.setAttribute('aria-hidden', 'true');
    node.classList.remove('is-initial');
    node.querySelectorAll('img').forEach((img) => {
      img.alt = '';
      img.removeAttribute('fetchpriority');
    });
  }

  const first = originals[0].cloneNode(true);
  const last = originals[originals.length - 1].cloneNode(true);
  muteClone(first);
  muteClone(last);
  track.prepend(last);
  track.append(first);

  const slides = [...track.querySelectorAll('.slider__slide')];
  const count = originals.length;
  let index = 1;
  let animating = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function width() {
    return Math.round(viewport.getBoundingClientRect().width);
  }

  function paint(animate) {
    const w = width();
    slides.forEach((slide) => {
      slide.style.flex = `0 0 ${w}px`;
      slide.style.width = `${w}px`;
      slide.style.maxWidth = `${w}px`;
    });
    track.style.transition = animate && !reduceMotion
      ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none';
    track.style.transform = `translate3d(${-index * w}px, 0, 0)`;
    if (!animate) void track.offsetWidth;
  }

  function snapIfCloned() {
    if (index === 0) {
      index = count;
      paint(false);
    } else if (index === count + 1) {
      index = 1;
      paint(false);
    }
  }

  function go(dir) {
    if (animating && !reduceMotion) return;
    index += dir;
    paintDots();
    if (reduceMotion) {
      snapIfCloned();
      paint(false);
      return;
    }
    animating = true;
    paint(true);
  }

  /* ---- position dots ---------------------------------------------------
   * Built here rather than in the markup so they never appear without
   * JavaScript, in which case the first photo simply stands on its own.
   */
  const dots = document.createElement('div');
  dots.className = 'slider__dots';
  const dotButtons = originals.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'slider__dot';
    dot.setAttribute('aria-label', `Show group photo ${i + 1} of ${count}`);
    dot.addEventListener('click', () => goTo(i + 1));
    dots.append(dot);
    return dot;
  });
  root.append(dots);

  function paintDots() {
    const active = ((index - 1) % count + count) % count;
    dotButtons.forEach((dot, i) => {
      if (i === active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  function goTo(next) {
    if (next === index) return;
    go(next - index);
  }

  paint(false);
  paintDots();
  root.classList.add('is-ready');

  track.addEventListener('transitionend', (event) => {
    if (event.target !== track || event.propertyName !== 'transform') return;
    snapIfCloned();
    animating = false;
  });

  root.querySelectorAll('[data-dir]').forEach((button) => {
    button.addEventListener('click', () => {
      go(Number(button.getAttribute('data-dir')));
    });
  });

  /* ---- swipe -----------------------------------------------------------
   * A carousel reachable only through two small arrows is awkward on a
   * touchscreen, so the photo itself is draggable. `touch-action: pan-y` on
   * the viewport leaves vertical scrolling to the page.
   */
  let startX = 0;
  let startY = 0;
  let delta = 0;
  let pointerId = null;
  let axis = null;

  function dragStart(event) {
    if (animating || pointerId !== null) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    delta = 0;
    axis = null;
  }

  function dragMove(event) {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    /* Decide once whether this gesture belongs to the slider or the page. */
    if (!axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x') {
        root.classList.add('is-dragging');
        viewport.setPointerCapture(pointerId);
      }
    }
    if (axis !== 'x') return;

    delta = dx;
    const w = width();
    track.style.transition = 'none';
    track.style.transform = `translate3d(${-index * w + delta}px, 0, 0)`;
  }

  function dragEnd(event) {
    if (event.pointerId !== pointerId) return;
    const wasHorizontal = axis === 'x';
    pointerId = null;
    axis = null;
    root.classList.remove('is-dragging');
    if (!wasHorizontal) return;

    /* A quarter of the frame, or 60px, whichever is smaller. */
    const threshold = Math.min(60, width() * 0.25);
    if (Math.abs(delta) > threshold) go(delta < 0 ? 1 : -1);
    else paint(true);
    delta = 0;
  }

  viewport.addEventListener('pointerdown', dragStart);
  viewport.addEventListener('pointermove', dragMove);
  viewport.addEventListener('pointerup', dragEnd);
  viewport.addEventListener('pointercancel', dragEnd);
  /* Dragging across a photo should not start a native image drag. */
  viewport.addEventListener('dragstart', (event) => event.preventDefault());

  const observer = new ResizeObserver(() => paint(false));
  observer.observe(viewport);
}
