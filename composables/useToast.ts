import type { ToastType } from '~/plugins/notify.client'

/**
 * SSR-safe wrapper over the `$notify` / `$confirm` helpers provided by
 * plugins/notify.client.ts. On the server these are no-ops.
 */
export function useToast() {
  const fire = (type: ToastType, message: string) => {
    if (import.meta.server) return
    const { $notify } = useNuxtApp() as unknown as { $notify?: (t: ToastType, m: string) => void }
    $notify?.(type, message)
  }

  return {
    success: (m: string) => fire('success', m),
    error: (m: string) => fire('error', m),
    info: (m: string) => fire('info', m),
    warning: (m: string) => fire('warning', m),
    toast: fire,
    confirm: async (opts: { title?: string; text?: string; confirmText?: string; danger?: boolean }) => {
      if (import.meta.server) return false
      const { $confirm } = useNuxtApp() as unknown as {
        $confirm?: (o: any) => Promise<boolean>
      }
      return (await $confirm?.(opts)) ?? false
    },
  }
}
