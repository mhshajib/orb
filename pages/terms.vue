<script setup lang="ts">
definePageMeta({ layout: 'public' })
useHead({ title: 'Terms & Conditions — Orb' })

const { isAuthed, fetchMe } = useAuth()
if (!isAuthed.value) await fetchMe()

const lastUpdated = 'June 28, 2026'

interface Section { heading: string, body: string[] }
const sections: Section[] = [
  {
    heading: '1. Agreement to terms',
    body: [
      'These Terms & Conditions ("Terms") govern your access to and use of the Orb transactional email platform and related services ("Service"), operated from Bangladesh. By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.',
    ],
  },
  {
    heading: '2. Your account',
    body: [
      'You must provide accurate information when registering and keep your credentials secure. You are responsible for all activity that occurs under your account, including activity by team members you invite and any API keys you create.',
      'You must verify your email address before you can begin sending. Organisation owners are responsible for managing roles and access within their organisation.',
    ],
  },
  {
    heading: '3. Acceptable use',
    body: [
      'You agree not to use Orb to send spam, unsolicited bulk email, phishing, malware, or any content that is unlawful, deceptive, or infringes the rights of others. You must only email recipients who have consented to receive mail from you.',
      'We support and enforce email authentication (SPF, DKIM, DMARC) and one-click unsubscribe. We may rate-limit, suspend, or terminate accounts that generate excessive bounces, spam complaints, or that we reasonably believe are abusing the Service.',
    ],
  },
  {
    heading: '4. Plans, billing and payment',
    body: [
      'Orb offers a free tier and paid plans priced in Bangladeshi Taka (BDT) and billed through bKash and supported local payment methods. Plan limits (such as monthly email volume, users, and domains) apply per billing period.',
      'Paid plans are granted on payment or by arrangement. Unless stated otherwise, fees are non-refundable. We may change pricing with reasonable notice; changes do not affect the current paid period.',
    ],
  },
  {
    heading: '5. Service availability',
    body: [
      'We work to keep the Service reliable but do not guarantee uninterrupted availability. We may modify, suspend, or discontinue features, and may perform maintenance that temporarily affects the Service.',
    ],
  },
  {
    heading: '6. Suspension and termination',
    body: [
      'You may stop using the Service at any time. We may suspend or terminate access if you breach these Terms, fail to pay, or use the Service in a way that risks harm to Orb, our providers, or other users. On termination, your right to use the Service ends; certain data may be retained or deleted in line with our Privacy Policy.',
    ],
  },
  {
    heading: '7. Limitation of liability',
    body: [
      'The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Orb is not liable for indirect, incidental, or consequential damages, or for loss of data, revenue, or profits arising from your use of the Service. Our total liability is limited to the amounts you paid for the Service in the three months preceding the claim.',
    ],
  },
  {
    heading: '8. Changes to these terms',
    body: [
      'We may update these Terms from time to time. We will post the updated version with a new "last updated" date, and material changes will take effect when posted. Continued use of the Service after changes constitutes acceptance.',
    ],
  },
  {
    heading: '9. Governing law',
    body: [
      'These Terms are governed by the laws of Bangladesh, and disputes are subject to the exclusive jurisdiction of the courts of Bangladesh.',
    ],
  },
  {
    heading: '10. Contact',
    body: [
      'Questions about these Terms? Email us at hello@orb.bd.',
    ],
  },
]
</script>

<template>
  <div class="min-h-screen bg-white font-nunito text-black dark:bg-[#060818] dark:text-white-dark">
    <LandingHeader />

    <section class="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <NuxtLink to="/" class="text-sm font-semibold text-primary hover:underline">← Back to home</NuxtLink>
      <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-dark dark:text-white-light sm:text-4xl">Terms &amp; Conditions</h1>
      <p class="mt-2 text-sm text-white-dark">Last updated: {{ lastUpdated }}</p>

      <div class="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-white-dark">
        This is a general template provided for transparency. Please review it with qualified legal counsel before relying on it for your business.
      </div>

      <div class="mt-8 space-y-8">
        <div v-for="s in sections" :key="s.heading">
          <h2 class="text-lg font-bold text-dark dark:text-white-light">{{ s.heading }}</h2>
          <p v-for="(p, i) in s.body" :key="i" class="mt-2 leading-relaxed text-white-dark">{{ p }}</p>
        </div>
      </div>
    </section>

    <LandingFooter />
  </div>
</template>
