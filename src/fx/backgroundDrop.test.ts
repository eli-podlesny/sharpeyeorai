import { describe, expect, it } from 'vitest';
import { layout } from '../config/layout.config';
import {
  BACKGROUND_HOME,
  backgroundBoxSize,
  coversWindow,
  droppedBackgroundPose,
  type CoverInput,
} from './backgroundDrop';

const WINDOWS = [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [1280, 1000],
  [1024, 1366],
] as const;

const input = (width: number, height: number): CoverInput => {
  const box = backgroundBoxSize(width, height, layout.viewport.bgOverscan);
  const { x, y } = layout.parallax.background;
  return { width, height, imageWidth: box.width, imageHeight: box.height, pad: { x, y } };
};

describe('background drop pose', () => {
  it('covers the window at rest, parallax included', () => {
    for (const [w, h] of WINDOWS) expect(coversWindow(BACKGROUND_HOME, input(w, h))).toBe(true);
  });

  it('still covers the window when dropped', () => {
    for (const [w, h] of WINDOWS) {
      const pose = droppedBackgroundPose(input(w, h));
      expect(coversWindow(pose, input(w, h))).toBe(true);
    }
  });

  it('scales, turns clockwise and moves right and up', () => {
    for (const [w, h] of WINDOWS) {
      const pose = droppedBackgroundPose(input(w, h));
      expect(pose.scale).toBe(layout.background.drop.scale);
      expect(pose.rotateDeg).toBeGreaterThan(0);
      expect(pose.x).toBeGreaterThan(0);
      expect(pose.y).toBeLessThan(0);
    }
  });

  it('goes as far as the cover allows: a little further would show an edge', () => {
    const at = input(1440, 900);
    const pose = droppedBackgroundPose(at);
    const further = { ...pose, x: pose.x * 1.02, y: pose.y * 1.02 };
    expect(coversWindow(further, at)).toBe(false);
  });

  it('reach scales the shift', () => {
    const at = input(1440, 900);
    const full = droppedBackgroundPose(at);
    const half = droppedBackgroundPose(at, { ...layout.background.drop, reach: 0.5 });
    expect(half.x).toBeCloseTo(full.x / 2, 6);
    expect(half.y).toBeCloseTo(full.y / 2, 6);
  });
});
