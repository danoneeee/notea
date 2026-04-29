import { createApp } from 'vue';
import App from './App.vue';
import { loadDescriptorFamiliesFromRemote } from './data/descriptors';
import router from './router';

async function bootstrap() {
  await loadDescriptorFamiliesFromRemote();
  createApp(App).use(router).mount('#app');
}

void bootstrap();
