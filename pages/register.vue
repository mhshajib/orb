<script setup lang="ts">
import { computed, ref, watch } from 'vue'

definePageMeta({ layout: 'auth-layout', middleware: 'guest' })
useHead({ title: 'Sign up' })

const { register } = useAuth()
const { success, error: toastError } = useToast()
const sharedDomain = (useRuntimeConfig().public.sharedSendingDomain as string) || 'send.orb.bd'

const orgName = ref('')
const handle = ref('') // = org slug = the free "Orb email" local part
const handleEdited = ref(false)
const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}
// Auto-suggest the handle from the org name until the user edits it directly.
watch(orgName, (v) => { if (!handleEdited.value) handle.value = slugify(v) })

// Live availability check on the chosen handle.
const checking = ref(false)
const available = ref<boolean | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null
watch(handle, (v) => {
  const clean = slugify(v)
  if (clean !== v) { handle.value = clean; return }
  available.value = null
  if (timer) clearTimeout(timer)
  if (!clean) return
  timer = setTimeout(async () => {
    checking.value = true
    try {
      const r = await $fetch<{ data: { available: boolean } }>('/api/auth/check-slug', { query: { slug: clean } })
      available.value = r.data.available
    }
    catch { available.value = null }
    finally { checking.value = false }
  }, 350)
})

const orbEmail = computed(() => (handle.value ? `${handle.value}@${sharedDomain}` : `yourname@${sharedDomain}`))

async function onSubmit() {
  if (loading.value) return
  error.value = ''
  if (!orgName.value.trim()) { error.value = 'Organization name is required.'; return }
  if (!handle.value) { error.value = 'Choose your Orb email handle.'; return }
  if (available.value === false) { error.value = 'That Orb email is taken — pick another.'; return }
  if (password.value.length < 8) { error.value = 'Password must be at least 8 characters.'; return }
  if (password.value !== confirm.value) { error.value = 'Passwords do not match.'; return }
  loading.value = true
  try {
    await register({
      org_name: orgName.value.trim(),
      org_slug: handle.value,
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
    })
    done.value = true // pending verification → show check-inbox
  }
  catch (e) {
    error.value = errMsg(e, 'Could not create account')
  }
  finally {
    loading.value = false
  }
}

async function resend() {
  try {
    await $fetch('/api/auth/resend-verification', { method: 'POST' })
    success('Verification email resent.')
  }
  catch (e) {
    toastError(errMsg(e, 'Could not resend'))
  }
}

</script>

<template>
    <div>
        <div class="absolute inset-0">
            <img src="/assets/images/auth/bg-gradient.png" alt="image" class="h-full w-full object-cover" />
        </div>
        <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[url(/assets/images/auth/map.png)] bg-cover bg-center bg-no-repeat px-6 py-6 dark:bg-[#060818] sm:px-16">
            <img src="/assets/images/auth/coming-soon-object1.png" alt="image" class="absolute left-0 top-1/2 h-full max-h-[893px] -translate-y-1/2" />
            <img src="/assets/images/auth/coming-soon-object2.png" alt="image" class="absolute left-24 top-0 h-40 md:left-[30%]" />
            <img src="/assets/images/auth/coming-soon-object3.png" alt="image" class="absolute right-0 top-0 h-[300px]" />
            <img src="/assets/images/auth/polygon-object.svg" alt="image" class="absolute bottom-0 end-[28%]" />
            <div class="relative flex w-full max-w-[1502px] flex-col justify-between overflow-hidden rounded-md bg-white/60 backdrop-blur-lg dark:bg-black/50 lg:flex-row lg:gap-10 xl:gap-0">
                <div class="relative hidden w-full items-center justify-center bg-[linear-gradient(225deg,rgba(239,18,98,1)_0%,rgba(67,97,238,1)_100%)] p-5 lg:inline-flex lg:max-w-[835px] xl:-ms-28 ltr:xl:skew-x-[14deg] rtl:xl:skew-x-[-14deg]">
                    <div class="absolute inset-y-0 w-8 from-primary/10 via-transparent to-transparent ltr:-right-10 ltr:bg-gradient-to-r rtl:-left-10 rtl:bg-gradient-to-l xl:w-16 ltr:xl:-right-20 rtl:xl:-left-20"></div>
                    <div class="ltr:xl:-skew-x-[14deg] rtl:xl:skew-x-[14deg]">
                        <NuxtLink to="/" class="ms-10 flex w-48 items-center gap-3 lg:w-72">
                            <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white"><icon-orb class="h-7 w-7" /></span>
                            <span class="text-4xl font-extrabold text-white">Orb</span>
                        </NuxtLink>
                        <div class="mt-12 hidden w-full max-w-[360px] lg:block">
                            <img src="/assets/images/auth/register.svg" alt="Cover Image" class="w-full" />
                        </div>
                    </div>
                </div>
                <div class="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-12 pt-6 sm:px-6 lg:max-w-[667px]">
                    <div class="flex w-full max-w-[440px] items-center gap-2 lg:absolute lg:end-6 lg:top-6 lg:max-w-full">
                        <NuxtLink to="/" class="flex w-8 items-center lg:hidden">
                            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white"><icon-orb class="h-5 w-5" /></span>
                        </NuxtLink>
                    </div>

                    <!-- Check-inbox state -->
                    <div v-if="done" class="w-full max-w-[440px] text-center lg:mt-10">
                        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-light text-success"><icon-mail class="h-8 w-8" /></div>
                        <h1 class="text-2xl font-extrabold uppercase text-primary">Check your inbox</h1>
                        <p class="mt-2 text-white-dark">We sent a verification link to <span class="font-semibold text-dark dark:text-white-light">{{ email }}</span>. Confirm it to start sending.</p>
                        <p class="mt-3 text-sm text-white-dark">Your Orb sending address: <span class="font-semibold text-primary">{{ orbEmail }}</span></p>
                        <div class="mt-6 flex flex-col gap-3">
                            <NuxtLink to="/app" class="btn btn-gradient w-full border-0 uppercase">Go to dashboard</NuxtLink>
                            <button type="button" class="btn btn-outline-primary w-full" @click="resend">Resend email</button>
                        </div>
                    </div>

                    <!-- Form state -->
                    <div v-else class="w-full max-w-[440px]">
                        <div class="mb-7">
                            <h1 class="text-3xl font-extrabold uppercase !leading-snug text-primary md:text-4xl">Sign up</h1>
                            <p class="text-base font-bold leading-normal text-white-dark">Create your organization — free, no card required</p>
                        </div>

                        <div v-if="error" class="mb-4 rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{{ error }}</div>

                        <form class="space-y-4 dark:text-white" @submit.prevent="onSubmit">
                            <div>
                                <label for="org">Organization name</label>
                                <input id="org" v-model="orgName" type="text" placeholder="Acme Inc" class="form-input" required />
                            </div>

                            <div>
                                <label for="handle">Your Orb email</label>
                                <div class="flex items-stretch">
                                    <input id="handle" v-model="handle" type="text" placeholder="acme" class="form-input ltr:rounded-r-none rtl:rounded-l-none" @input="handleEdited = true" required />
                                    <span class="inline-flex items-center whitespace-nowrap rounded-r-md border border-l-0 border-[#e0e6ed] bg-[#f1f2f3] px-3 text-sm text-white-dark dark:border-[#17263c] dark:bg-[#1b2e4b] rtl:rounded-l-md rtl:rounded-r-none rtl:border-l rtl:border-r-0">@{{ sharedDomain }}</span>
                                </div>
                                <p class="mt-1 text-xs" :class="available === false ? 'text-danger' : available === true ? 'text-success' : 'text-white-dark'">
                                    <template v-if="checking">Checking availability…</template>
                                    <template v-else-if="available === true">✓ {{ orbEmail }} is available — send from this address on the free plan.</template>
                                    <template v-else-if="available === false">✕ That handle is taken — try another.</template>
                                    <template v-else>You'll send from this address for free (no domain setup). Add your own domain later on a paid plan.</template>
                                </p>
                            </div>

                            <div>
                                <label for="name">Your name</label>
                                <input id="name" v-model="name" type="text" placeholder="Jane Doe" class="form-input" />
                            </div>

                            <div>
                                <label for="email">Login email</label>
                                <input id="email" v-model="email" type="email" autocomplete="email" placeholder="you@company.com" class="form-input" required />
                            </div>

                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label for="password">Password</label>
                                    <input id="password" v-model="password" type="password" autocomplete="new-password" placeholder="••••••••" class="form-input" required />
                                </div>
                                <div>
                                    <label for="confirm">Confirm</label>
                                    <input id="confirm" v-model="confirm" type="password" autocomplete="new-password" placeholder="••••••••" class="form-input" required />
                                </div>
                            </div>

                            <button type="submit" class="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]" :disabled="loading || available === false">
                                {{ loading ? 'Creating…' : 'Create account' }}
                            </button>
                        </form>

                        <div class="mt-6 text-center dark:text-white">
                            Already have an account ?
                            <NuxtLink to="/login" class="uppercase text-primary underline transition hover:text-black dark:hover:text-white">Sign in</NuxtLink>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
