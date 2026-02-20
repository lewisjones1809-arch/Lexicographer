import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import * as PIXI from "pixi.js";

export const GameCanvas = forwardRef(function GameCanvas(_, ref) {
  const mountRef = useRef(null);
  const appRef   = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const app = new PIXI.Application();
    app.init({ background: 'transparent', backgroundAlpha: 0, resizeTo: window })
      .then(() => {
        if (cancelled) {
          app.destroy(true);
          return;
        }
        if (mountRef.current) {
          app.canvas.style.position = "absolute";
          app.canvas.style.background = "transparent";
          mountRef.current.appendChild(app.canvas);
        }
        appRef.current = app;
      })
      .catch(() => { /* init can fail silently — canvas animations are enhancement only */ });
    return () => {
      cancelled = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    playCritBubble(x, y, text) {
      const app = appRef.current;
      if (!app) return;
      const label = new PIXI.Text({
        text,
        style: {
          fill: "#ffd700",
          fontSize: 16,
          fontWeight: "bold",
          fontFamily: "'Courier Prime', monospace",
          dropShadow: { blur: 4, color: "#000000", distance: 1, alpha: 0.5 },
        },
      });
      label.x = x;
      label.y = y;
      label.anchor.set(0.5, 1);
      app.stage.addChild(label);
      let t = 0;
      const tick = (ticker) => {
        t += ticker.deltaTime / 60;
        label.y = y - t * 40;
        label.alpha = t < 1.4 ? 1 : Math.max(0, 1 - (t - 1.4) / 0.6);
        if (t >= 2) {
          app.stage.removeChild(label);
          label.destroy();
          app.ticker.remove(tick);
        }
      };
      app.ticker.add(tick);
    },
  }));

  return (
    <div ref={mountRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }} />
  );
});
