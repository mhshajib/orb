<script setup lang="ts">
import { computed, ref } from 'vue'

definePageMeta({ layout: 'auth-layout', middleware: 'guest' })
useHead({ title: 'Log in' })

const route = useRoute()
const { login, fetchMe } = useAuth()

const notice = computed(() => noticeMessage(typeof route.query.notice === 'string' ? route.query.notice : ''))
const justVerified = computed(() => route.query.notice === 'verified')

const email = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')

// Unverified-email state: shown when login is refused until the email is confirmed.
const needsVerify = ref(false)
const resending = ref(false)
const resent = ref(false)

async function onSubmit() {
  if (submitting.value) return
  error.value = ''
  needsVerify.value = false
  resent.value = false
  submitting.value = true
  try {
    const res = await login(email.value.trim(), password.value)
    if (res.requires_2fa) {
      await navigateTo({ path: '/login/2fa', query: { next: nextPath() } })
      return
    }
    await fetchMe()
    await navigateTo(nextPath())
  }
  catch (e) {
    const m = errMsg(e, 'Login failed')
    if (m === 'email_not_verified') {
      needsVerify.value = true
    }
    else {
      error.value = m
    }
  }
  finally {
    submitting.value = false
  }
}

async function resendVerification() {
  if (resending.value || !email.value.trim()) return
  resending.value = true
  try {
    await $fetch('/api/auth/resend-verification-public', {
      method: 'POST',
      body: { email: email.value.trim() },
    })
    resent.value = true
  }
  catch {
    // Anti-enumeration endpoint always succeeds; ignore.
    resent.value = true
  }
  finally {
    resending.value = false
  }
}

function nextPath() {
  const n = route.query.next
  return typeof n === 'string' && n.startsWith('/') ? n : '/app'
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
            <div class="relative flex w-full max-w-[1502px] flex-col justify-between overflow-hidden rounded-md bg-white/60 backdrop-blur-lg dark:bg-black/50 lg:min-h-[612px] lg:flex-row lg:gap-10 xl:gap-0">
                <div class="relative hidden w-full items-center justify-center bg-[linear-gradient(225deg,rgba(239,18,98,1)_0%,rgba(67,97,238,1)_100%)] p-5 lg:inline-flex lg:max-w-[835px] xl:-ms-28 ltr:xl:skew-x-[14deg] rtl:xl:skew-x-[-14deg]">
                    <div class="absolute inset-y-0 w-8 from-primary/10 via-transparent to-transparent ltr:-right-10 ltr:bg-gradient-to-r rtl:-left-10 rtl:bg-gradient-to-l xl:w-16 ltr:xl:-right-20 rtl:xl:-left-20"></div>
                    <div class="ltr:xl:-skew-x-[14deg] rtl:xl:skew-x-[14deg]">
                        <NuxtLink to="/" class="ms-10 flex w-48 items-center gap-3 lg:w-72">
                            <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white"><icon-orb class="h-7 w-7" /></span>
                            <span class="text-4xl font-extrabold text-white">Orb</span>
                        </NuxtLink>
                        <div class="mt-12 hidden w-full max-w-[360px] lg:block">
                            <img src="/assets/images/auth/login.svg" alt="Cover Image" class="w-full" />
                        </div>
                    </div>
                </div>
                <div class="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-[667px]">
                    <div class="flex w-full max-w-[440px] items-center gap-2 lg:absolute lg:end-6 lg:top-6 lg:max-w-full">
                        <NuxtLink to="/" class="flex w-8 items-center lg:hidden">
                            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white"><icon-orb class="h-5 w-5" /></span>
                        </NuxtLink>
                    </div>
                    <div class="w-full max-w-[440px] lg:mt-16">
                        <div class="mb-10">
                            <h1 class="text-3xl font-extrabold uppercase !leading-snug text-primary md:text-4xl">Sign in</h1>
                            <p class="text-base font-bold leading-normal text-white-dark">Enter your email and password to login</p>
                        </div>

                        <div v-if="justVerified" class="mb-5 rounded border border-success/40 bg-success/10 p-3 text-sm text-success">Email verified — sign in to continue.</div>
                        <div v-if="notice" class="mb-5 rounded border border-info/40 bg-info/10 p-3 text-sm text-info">{{ notice.title }} — {{ notice.body }}</div>

                        <form class="space-y-5 dark:text-white" @submit.prevent="onSubmit">
                            <div>
                                <label for="Email">Email</label>
                                <div class="relative text-white-dark">
                                    <input id="Email" v-model="email" type="email" autocomplete="email" placeholder="Enter Email" class="form-input ps-10 placeholder:text-white-dark" required />
                                    <span class="absolute start-4 top-1/2 -translate-y-1/2"><icon-mail :fill="true" /></span>
                                </div>
                            </div>
                            <div>
                                <div class="flex items-center justify-between">
                                    <label for="Password">Password</label>
                                    <NuxtLink to="/forgot-password" class="text-xs font-semibold text-white-dark hover:text-primary">Forgot password?</NuxtLink>
                                </div>
                                <div class="relative text-white-dark">
                                    <input id="Password" v-model="password" type="password" autocomplete="current-password" placeholder="Enter Password" class="form-input ps-10 placeholder:text-white-dark" required />
                                    <span class="absolute start-4 top-1/2 -translate-y-1/2"><icon-lock-dots :fill="true" /></span>
                                </div>
                            </div>

                            <div v-if="error" class="rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{{ error }}</div>

                            <div v-if="needsVerify" class="rounded border border-warning/40 bg-warning/10 p-3 text-sm text-warning-dark dark:text-warning">
                                <p class="font-semibold">Verify your email to sign in</p>
                                <p class="mt-1">We sent a confirmation link to <strong>{{ email }}</strong>. Click it to activate your account, then sign in.</p>
                                <p v-if="resent" class="mt-2 text-success">A new link is on its way — check your inbox.</p>
                                <button v-else type="button" class="mt-2 font-semibold text-primary underline disabled:opacity-60" :disabled="resending" @click="resendVerification">
                                    {{ resending ? 'Sending…' : 'Resend verification email' }}
                                </button>
                            </div>

                            <button type="submit" class="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]" :disabled="submitting">
                                {{ submitting ? 'Signing in…' : 'Sign in' }}
                            </button>
                        </form>

                        <div class="mt-8 text-center dark:text-white">
                            Don't have an account ?
                            <NuxtLink to="/register" class="uppercase text-primary underline transition hover:text-black dark:hover:text-white">Sign up</NuxtLink>
                        </div>
                    </div>
                    <p class="absolute bottom-6 w-full text-center dark:text-white">© {{ new Date().getFullYear() }} Orb. All Rights Reserved.</p>
                </div>
            </div>
        </div>
    </div>
</template>
