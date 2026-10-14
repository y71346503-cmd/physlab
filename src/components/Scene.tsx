import { useEffect, useRef } from 'preact/hooks';
import type { Controller } from '../core/controller';

/** The simulation canvas. Drawing happens in the controller's frame loop. */
export function Scene({ ctrl, aspect }: { ctrl: Controller; aspect: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const grab = ctrl.overlays.any();

  useEffect(() => {
    const el = wrap.current!;
    const cv = canvas.current!;
    const size = () => {
      const w = el.clientWidth;
      const h = Math.round(Math.min(560, Math.max(280, w * aspect)));
      cv.style.height = `${h}px`;
      ctrl.attachScene(cv, w, h);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    return () => {
      ro.disconnect();
      ctrl.attachScene(null);
    };
  }, [ctrl, aspect]);

  const local = (e: PointerEvent): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const onDown = (e: PointerEvent) => {
    const [x, y] = local(e);
    if (ctrl.overlays.pointerDown(x, y, canvas.current!.clientWidth)) {
      canvas.current!.setPointerCapture(e.pointerId);
      e.preventDefault();
      ctrl.invalidate();
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!ctrl.overlays.dragging()) return;
    const [x, y] = local(e);
    if (ctrl.overlays.pointerMove(x, y, canvas.current!.clientWidth, canvas.current!.clientHeight)) ctrl.invalidate();
  };
  const onUp = () => {
    ctrl.overlays.pointerUp();
  };
  const onKey = (e: KeyboardEvent) => {
    if (ctrl.overlays.key(e)) {
      e.preventDefault();
      ctrl.invalidate();
    } else if (e.key === ' ' && ctrl.exp.kind === 'dynamic') {
      e.preventDefault();
      ctrl.toggle();
    }
  };

  const description = ctrl.sim.describe();
  const hint = grab ? 'Drag to move. Drag the round handle to rotate. Keyboard: arrows, Shift+arrows.' : '';

  return (
    <div class="scene" ref={wrap}>
      <canvas
        ref={canvas}
        class={grab ? 'grab' : ''}
        tabIndex={0}
        role="img"
        aria-label={`Simulation. ${description}`}
        aria-describedby="scene-hint"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      />
      <div class="scene-hint" id="scene-hint">
        {hint}
      </div>
    </div>
  );
}
