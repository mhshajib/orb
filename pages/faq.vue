<script setup lang="ts">
definePageMeta({ layout: 'public' })
useHead({ title: 'FAQ — Orb' })

const { isAuthed, fetchMe } = useAuth()
if (!isAuthed.value) await fetchMe()

interface QA { q: string, a: string }
const faqs: QA[] = [
  {
    q: 'What is Orb?',
    a: 'Orb is a transactional email platform built for Bangladesh. You verify your sending domains, send mail over a REST API or the dashboard, receive signed webhooks for every delivery event, and pay in Taka through bKash.',
  },
  {
    q: 'How does the free plan work?',
    a: 'Every new organisation starts free with 50 emails per month and no card required. On the free plan you get a real Orb mailbox (yourname@orb.bd) that sends and receives, so you can start immediately without configuring DNS.',
  },
  {
    q: 'Can I send from my own domain?',
    a: 'Yes — custom sending domains are available on paid plans. Add your domain, drop the generated SPF, DKIM, and DMARC records into your DNS, and verify. Once verified you can send from any address on that domain.',
  },
  {
    q: 'How is billing handled?',
    a: 'Plans are priced in Bangladeshi Taka and paid via bKash and local gateways — no foreign cards or dollar invoices. You can change plans at any time; usage limits apply per billing period.',
  },
  {
    q: 'How do you handle deliverability?',
    a: 'We authenticate every send with SPF, DKIM, and DMARC, add one-click List-Unsubscribe headers where required, and rate-limit abusive patterns. Sending from a verified custom domain on a paid plan gives you the best reputation.',
  },
  {
    q: 'How do API keys and webhooks work?',
    a: 'API keys and webhook endpoints are per-user — each member manages their own from the dashboard. Keys are shown once on creation and stored hashed. Webhook payloads are signed with HMAC-SHA256 so you can verify they came from Orb, and a delivery event only fires to the webhooks of the member who owns the related mail.',
  },
  {
    q: 'Is two-factor authentication supported?',
    a: 'Yes. Every account can enable TOTP two-factor authentication (Google Authenticator, Authy, 1Password, Bitwarden) with backup codes, and organisation owners can enforce 2FA across the whole team.',
  },
  {
    q: 'Where is my data stored and how long is it kept?',
    a: 'Email metadata is stored in our database and attachments in object storage. Message retention depends on your plan (7 days on free, longer on paid). You can delete messages at any time from the dashboard.',
  },
  {
    q: 'How do I get support?',
    a: 'Email us at hello@orb.bd and the team will get back to you. Paid plans receive priority support.',
  },
]
</script>

<template>
  <div class="min-h-screen bg-white font-nunito text-black dark:bg-[#060818] dark:text-white-dark">
    <LandingHeader />

    <section class="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <div class="mb-10">
        <NuxtLink to="/" class="text-sm font-semibold text-primary hover:underline">← Back to home</NuxtLink>
        <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-dark dark:text-white-light sm:text-4xl">Frequently asked questions</h1>
        <p class="mt-3 text-lg leading-relaxed text-white-dark">Everything you need to know about sending email with Orb.</p>
      </div>

      <div class="space-y-3">
        <details
          v-for="(item, i) in faqs"
          :key="i"
          class="group rounded-xl border border-white-light bg-white p-5 transition-shadow open:shadow-sm dark:border-[#1b2e4b] dark:bg-[#0e1726]"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-dark dark:text-white-light">
            <span>{{ item.q }}</span>
            <icon-caret-down class="h-5 w-5 shrink-0 text-white-dark transition-transform group-open:rotate-180" />
          </summary>
          <p class="mt-3 leading-relaxed text-white-dark">{{ item.a }}</p>
        </details>
      </div>

      <div class="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <p class="font-semibold text-dark dark:text-white-light">Still have a question?</p>
        <p class="mt-1 text-sm text-white-dark">We're happy to help.</p>
        <a href="mailto:hello@orb.bd" class="btn btn-primary mt-4">Email hello@orb.bd</a>
      </div>
    </section>

    <LandingFooter />
  </div>
</template>
