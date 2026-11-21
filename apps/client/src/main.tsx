import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.js'
import { bootScreen } from './app/boot.js'
import { createDependencies, DependenciesProvider } from './app/dependencies.js'
import { applyNativeAppTweaks } from './shared/platform.js'
import { registerServiceWorker } from './shared/register-service-worker.js'
import '@fontsource/audiowide/400.css'
import '@fontsource/exo-2/400.css'
import '@fontsource/exo-2/600.css'
import '@fontsource/exo-2/700.css'
import './shared/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

applyNativeAppTweaks()
registerServiceWorker()
const dependencies = createDependencies()
const firstScreen = bootScreen(dependencies)

createRoot(root).render(
  <StrictMode>
    <DependenciesProvider value={dependencies}>
      <App firstScreen={firstScreen} />
    </DependenciesProvider>
  </StrictMode>,
)
