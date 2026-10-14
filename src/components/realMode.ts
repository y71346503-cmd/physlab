import type { Controller } from '../core/controller';
import { store } from '../shared/storage';

/** Switch realistic instruments and remember the choice for all experiments. */
export function setReal(ctrl: Controller, real: boolean): void {
  ctrl.setReal(real);
  store.update((s) => {
    s.prefs.real = real;
  });
}
