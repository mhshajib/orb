import Swal from 'sweetalert2'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

/**
 * Client-only toast/confirm helpers built on sweetalert2 (already bundled by
 * the Vristo template). Provided as `$notify` / `$confirm` so the rest of the
 * app can surface feedback without importing Swal everywhere — and so nothing
 * pulls Swal into the server bundle.
 */
export default defineNuxtPlugin(() => {
  const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3500,
    showCloseButton: true,
    customClass: { popup: 'color-' },
  })

  const notify = (type: ToastType, message: string) => {
    toast.fire({ icon: type, title: message })
  }

  const confirm = async (opts: { title?: string; text?: string; confirmText?: string; danger?: boolean }) => {
    const res = await Swal.fire({
      title: opts.title ?? 'Are you sure?',
      text: opts.text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: opts.confirmText ?? 'Confirm',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      padding: '1.5rem',
      customClass: {
        confirmButton: opts.danger ? 'btn btn-danger' : 'btn btn-primary',
        cancelButton: 'btn btn-outline-dark ltr:mr-3 rtl:ml-3',
        popup: 'sweet-alerts',
      },
      buttonsStyling: false,
    })
    return res.isConfirmed
  }

  return {
    provide: { notify, confirm },
  }
})
