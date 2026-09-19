<script setup lang="ts">
definePageMeta({ layout: 'public' })
useHead({ title: 'Privacy Policy — Orb' })

const { isAuthed, fetchMe } = useAuth()
if (!isAuthed.value) await fetchMe()

const lastUpdated = 'June 28, 2026'

interface Section { heading: string, body: string[], bullets?: string[] }
const sections: Section[] = [
  {
    heading: '1. Introduction',
    body: [
      'This Privacy Policy explains how Orb ("we", "us") collects, uses, and protects information when you use our transactional email platform ("Service"). We are based in Bangladesh and process data to operate and improve the Service.',
    ],
  },
  {
    heading: '2. Information we collect',
    body: ['We collect the following categories of information:'],
    bullets: [
      'Account data: your name, email address, organisation name, role, and password (stored only as a secure hash).',
      'Sending data: the emails you send and receive through Orb, including sender, recipients, subject, content, and attachments, plus delivery events such as delivered, bounced, and complained.',
      'Configuration data: your verified domains and DNS records, API keys (stored hashed), and webhook endpoints.',
      'Usage and technical data: log information such as IP address, timestamps, and request metadata used for security, rate-limiting, and abuse prevention.',
      'Billing data: plan and payment references processed through bKash and local payment providers. We do not store full payment-instrument details.',
    ],
  },
  {
    heading: '3. How we use information',
    body: ['We use information to:'],
    bullets: [
      'Provide, operate, and secure the Service, including delivering your email and authenticating senders.',
      'Prevent abuse, spam, and fraud, and enforce sending limits and our Terms.',
      'Communicate with you about your account, including verification, security, and service notices.',
      'Process payments and manage your subscription.',
      'Improve and troubleshoot the Service.',
    ],
  },
  {
    heading: '4. Service providers (sub-processors)',
    body: [
      'We rely on trusted third parties to deliver the Service, including an email delivery provider to transmit mail, cloud object storage for attachments, and bKash and local gateways for payments. These providers process data on our behalf under appropriate safeguards.',
    ],
  },
  {
    heading: '5. Data retention',
    body: [
      'We retain email metadata and content according to your plan’s retention period (for example, 7 days on the free plan and longer on paid plans), after which it may be deleted. You can delete messages yourself at any time. Account and billing records may be retained longer where required for legal or operational reasons.',
    ],
  },
  {
    heading: '6. Security',
    body: [
      'We protect your data with measures including encrypted transport, hashed passwords and API keys, optional two-factor authentication, and signed webhook payloads. No system is perfectly secure, but we work to safeguard your information and limit access to it.',
    ],
  },
  {
    heading: '7. Your rights and choices',
    body: [
      'You can access and update your account information from the dashboard, delete messages, rotate or revoke API keys, and close your account. For requests relating to your personal data, contact us at the address below.',
    ],
  },
  {
    heading: '8. Cookies',
    body: [
      'We use strictly necessary cookies to keep you signed in and to operate the dashboard securely. We do not use them for third-party advertising.',
    ],
  },
  {
    heading: '9. Changes to this policy',
    body: [
      'We may update this Policy from time to time. We will post the updated version with a new "last updated" date, and material changes take effect when posted.',
    ],
  },
  {
    heading: '10. Contact',
    body: [
      'Questions about your privacy or this Policy? Email us at hello@orb.bd.',
    ],
  },
]
</script>

<template>
  <div class="min-h-screen bg-white font-nunito text-black dark:bg-[#060818] dark:text-white-dark">
    <LandingHeader />

    <section class="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <NuxtLink to="/" class="text-sm font-semibold text-primary hover:underline">← Back to home</NuxtLink>
      <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-dark dark:text-white-light sm:text-4xl">Privacy Policy</h1>
      <p class="mt-2 text-sm text-white-dark">Last updated: {{ lastUpdated }}</p>

      <div class="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-white-dark">
        This is a general template provided for transparency. Please review it with qualified legal counsel before relying on it for your business.
      </div>

      <div class="mt-8 space-y-8">
        <div v-for="s in sections" :key="s.heading">
          <h2 class="text-lg font-bold text-dark dark:text-white-light">{{ s.heading }}</h2>
          <p v-for="(p, i) in s.body" :key="i" class="mt-2 leading-relaxed text-white-dark">{{ p }}</p>
          <ul v-if="s.bullets" class="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-white-dark">
            <li v-for="(b, i) in s.bullets" :key="i">{{ b }}</li>
          </ul>
        </div>
      </div>
    </section>

    <LandingFooter />
  </div>
</template>
