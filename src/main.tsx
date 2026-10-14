import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { watchSystemTheme } from './shared/theme';
import { toast } from './shared/toast';
import './styles/global.css';

watchSystemTheme();
render(<App />, document.getElementById('app')!);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const update = registerSW({
    onNeedRefresh() {
      toast('A new version of Physlab is available.', { sticky: true, action: { label: 'Update', run: () => void update(true) } });
    },
    onOfflineReady() {
      toast('Physlab is ready to work offline.');
    },
  });
}
