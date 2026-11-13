import type { CatScene } from '../render/cat.js';
import { store } from './storage.js';

export interface Screen {
  mount(root: HTMLElement): void;
  unmount(): void;
}

/** Owns the UI root and the shared cat scene; swaps screens. */
export class Navigator {
  current: Screen | null = null;

  constructor(
    readonly root: HTMLElement,
    readonly scene: CatScene,
  ) {}

  go(screen: Screen): void {
    this.current?.unmount();
    this.root.replaceChildren();
    this.scene.reset();
    this.scene.outfit = { ...store.data.equipped };
    this.current = screen;
    screen.mount(this.root);
  }
}
