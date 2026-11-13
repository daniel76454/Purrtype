import { CatScene } from './render/cat.js';
import { Navigator } from './core/screens.js';
import { store } from './core/storage.js';
import { MenuScreen } from './screens/menu.js';
import { cloud } from './cloud/cloud.js';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;

const scene = new CatScene(canvas);
scene.reducedMotion = store.data.settings.reducedMotion;
scene.start();

const nav = new Navigator(ui, scene);
nav.go(new MenuScreen(nav));
void cloud.init();

// Handy for poking at things from the console while developing.
(window as any).purrtype = { nav, scene, store, cloud };
