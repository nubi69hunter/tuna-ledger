// GramsDial: draggable ruler dial + fine steppers. Value in grams.
class GramsDial {
  constructor(mount, { value = 80, min = 0, max = 400, onChange } = {}) {
    this.min = min; this.max = max; this.value = value;
    this.onChange = onChange || (() => {});
    this.pxPerGram = 6; // spacing on the ruler
    this.mount = mount;
    this.render();
    this.attach();
    this.update();
  }

  render() {
    this.mount.innerHTML = `
      <div class="grams-picker">
        <div class="grams-label">Drained weight — match your scale</div>
        <div class="grams-readout"><span data-readout>0</span><small>g</small></div>
        <div class="dial" data-dial>
          <div class="dial-track"><div class="dial-ticks" data-ticks></div></div>
          <div class="dial-center"></div>
        </div>
        <div class="steppers">
          <button type="button" class="step-btn minus" data-step="-10">−10</button>
          <button type="button" class="step-btn minus" data-step="-5">−5</button>
          <button type="button" class="step-btn minus" data-step="-1">−1</button>
          <button type="button" class="step-btn plus" data-step="1">+1</button>
          <button type="button" class="step-btn plus" data-step="5">+5</button>
          <button type="button" class="step-btn plus" data-step="10">+10</button>
        </div>
      </div>`;
    this.readout = this.mount.querySelector('[data-readout]');
    this.dial = this.mount.querySelector('[data-dial]');
    this.ticks = this.mount.querySelector('[data-ticks]');
    this.buildTicks();
  }

  buildTicks() {
    let html = '';
    for (let g = this.min; g <= this.max; g += 1) {
      const major = g % 10 === 0;
      const x = g * this.pxPerGram;
      const h = major ? 26 : 13;
      html += `<div class="tick ${major ? 'major' : ''}" style="left:${x}px;height:${h}px"></div>`;
      if (major) html += `<div class="tick-num" style="left:${x}px">${g}</div>`;
    }
    this.ticks.innerHTML = html;
  }

  attach() {
    this.mount.querySelectorAll('[data-step]').forEach(b =>
      b.addEventListener('click', () => this.set(this.value + parseInt(b.dataset.step))));

    let dragging = false, startX = 0, startVal = 0;
    const down = e => { dragging = true; startX = (e.touches ? e.touches[0].clientX : e.clientX); startVal = this.value; };
    const move = e => {
      if (!dragging) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const dg = Math.round((startX - x) / this.pxPerGram);
      this.set(startVal + dg);
      if (e.cancelable) e.preventDefault();
    };
    const up = () => { dragging = false; };
    this.dial.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    this.dial.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  }

  set(v) {
    v = Math.max(this.min, Math.min(this.max, Math.round(v)));
    if (v === this.value) return;
    this.value = v;
    this.update();
  }

  update() {
    this.readout.textContent = this.value;
    // center the ruler so current value sits under the pointer
    const w = this.dial.clientWidth;
    const offset = w / 2 - this.value * this.pxPerGram;
    this.ticks.style.transform = `translateX(${offset}px)`;
    this.onChange(this.value);
  }
}
window.GramsDial = GramsDial;
