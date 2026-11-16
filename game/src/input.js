// Starfall Salvage — keyboard and mouse state.
// The game reads this one object each frame; nothing else touches the
// DOM's input events. Aim is in canvas coordinates.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.pressed = new Set();
    this.canvas = canvas;
    this.onFirstGesture = null;
    this._gestured = false;
  }

  attach() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
      this._gesture();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / r.width;
      const sy = this.canvas.height / r.height;
      this.mouseX = (e.clientX - r.left) * sx;
      this.mouseY = (e.clientY - r.top) * sy;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      this._gesture();
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _gesture() {
    if (!this._gestured) {
      this._gestured = true;
      if (this.onFirstGesture) this.onFirstGesture();
    }
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // True once, on the frame the key went down; cleared at frame end.
  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  endFrame() {
    this.pressed.clear();
  }

  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('a', 'arrowleft')) x -= 1;
    if (this.down('d', 'arrowright')) x += 1;
    if (this.down('w', 'arrowup')) y -= 1;
    if (this.down('s', 'arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }
}
