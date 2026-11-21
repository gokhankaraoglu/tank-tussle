import {
  canGoFullscreen,
  enterGameFullscreen,
  exitGameFullscreen,
  useIsFullscreen,
} from '../../../shared/fullscreen.js'
import { Button } from '../../../shared/ui/Button.js'

/** Toggles full screen (and landscape lock on Android). Hidden where browsers don't allow it. */
export const FullscreenButton = ({ className }: { readonly className?: string }) => {
  const fullscreen = useIsFullscreen()
  if (!canGoFullscreen()) return null

  const toggle = () =>
    void (fullscreen ? exitGameFullscreen() : enterGameFullscreen()).catch(() => undefined)
  return (
    <Button
      variant="ghost"
      className={className}
      aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
      title={fullscreen ? 'Exit full screen' : 'Full screen'}
      onClick={toggle}
    >
      {fullscreen ? '⤡' : '⛶'}
    </Button>
  )
}
