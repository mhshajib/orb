<template>
    <div class="mx-auto max-w-4xl">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 class="text-2xl font-bold dark:text-white-light">Webhook Integration</h1>
                <p class="mt-1 text-white-dark">Have Orb push delivery events to your app instead of polling for them.</p>
            </div>
            <NuxtLink to="/app/webhooks" class="btn btn-primary">Configure endpoints</NuxtLink>
        </div>

        <div class="panel">
            <div class="mb-4 flex items-center gap-3 border-b border-white-light pb-4 dark:border-[#1b2e4b]">
                <div class="grid h-10 w-10 place-content-center rounded-xl bg-primary-light text-primary dark:bg-primary dark:text-white">
                    <icon-router class="h-5 w-5" />
                </div>
                <h2 class="text-base font-bold dark:text-white-light">What Orb sends</h2>
            </div>
            <p class="text-white-dark">
                Every event is a POST to your URL with a JSON envelope. <span class="font-mono">data</span> holds the
                object the event is about.
            </p>
            <OrbCodeBlock class="mt-3" :code="payloadSample" language="json" title="Payload" />
        </div>

        <div class="panel mt-5">
            <div class="mb-4 flex items-center gap-3 border-b border-white-light pb-4 dark:border-[#1b2e4b]">
                <div class="grid h-10 w-10 place-content-center rounded-xl bg-danger-light text-danger dark:bg-danger dark:text-white">
                    <icon-lock class="h-5 w-5" />
                </div>
                <h2 class="text-base font-bold dark:text-white-light">Verifying requests</h2>
            </div>
            <p class="text-white-dark">
                Anyone can POST to your endpoint, so check the signature before trusting a payload.
            </p>
            <pre class="mt-3 whitespace-pre-wrap rounded-md bg-[#fbfbfb] p-4 font-mono text-xs dark:bg-[#1a2941]">{{ WEBHOOK_SIGNATURE_NOTE }}</pre>
            <div class="mt-4 flex items-center justify-between gap-2">
                <span class="text-[11px] font-bold uppercase tracking-wide text-white-dark">Verify in your app</span>
                <OrbLanguageTabs v-model="language" />
            </div>
            <OrbCodeBlock class="mt-2" :code="verifySample" :language="hljsLang" title="Signature check" />
        </div>

        <div class="panel mt-5">
            <div class="mb-4 flex items-center gap-3 border-b border-white-light pb-4 dark:border-[#1b2e4b]">
                <div class="grid h-10 w-10 place-content-center rounded-xl bg-success-light text-success dark:bg-success dark:text-white">
                    <icon-circle-check class="h-5 w-5" />
                </div>
                <h2 class="text-base font-bold dark:text-white-light">Endpoint requirements</h2>
            </div>
            <ul class="space-y-3">
                <li v-for="req in requirements" :key="req" class="flex items-start gap-2.5">
                    <icon-circle-check class="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span class="text-white-dark" v-html="req"></span>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { WEBHOOK_SIGNATURE_NOTE } from '@/utils/apiSpec';
    import { CODE_LANGUAGES } from '@/utils/codeSamples';

    useHead({ title: 'Webhook Integration' });

    const requirements = [
        'Your URL must be reachable over HTTPS with a valid certificate.',
        'Respond within the timeout — do the work <em>after</em> you answer, not before.',
        'Return any 2xx to acknowledge. Anything else is treated as a failure and retried.',
        'Expect retries, and the same event more than once. Key your handler on <code class="font-mono text-xs">X-Orb-Delivery</code> to stay idempotent.',
    ];

    const language = ref('node');
    const hljsLang = computed(() => CODE_LANGUAGES.find((l) => l.id === language.value)?.hljs ?? 'javascript');

    const payloadSample = JSON.stringify(
        {
            event: 'email.delivered',
            created_at: '2026-09-19T10:05:00Z',
            data: {
                id: '6a1f2c3d4e5f60718293a4b5',
                to: ['customer@example.com'],
                subject: 'Your invoice is ready',
                status: 'delivered',
            },
        },
        null,
        2,
    );

    // The HMAC is over "<timestamp>.<raw body>", so each sample has to read the
    // RAW body — a framework that parses JSON first will produce a different
    // byte string and every signature will look invalid.
    const SAMPLES: Record<string, string> = {
        node: `import crypto from 'node:crypto'

// Express: app.post('/hooks/orb', express.raw({ type: 'application/json' }), ...)
function verify(req, secret) {
  const timestamp = req.get('X-Orb-Timestamp')
  const signature = (req.get('X-Orb-Signature') || '').replace('sha256=', '')

  const expected = crypto
    .createHmac('sha256', secret)
    .update(timestamp + '.' + req.body) // req.body must be the RAW bytes
    .digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}`,
        python: `import hmac, hashlib

def verify(raw_body: bytes, timestamp: str, header: str, secret: str) -> bool:
    signature = header.removeprefix("sha256=")
    expected = hmac.new(
        secret.encode(),
        timestamp.encode() + b"." + raw_body,  # raw bytes, not the parsed dict
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)`,
        php: `<?php
function verify(string $rawBody, string $timestamp, string $header, string $secret): bool {
    $signature = str_replace('sha256=', '', $header);
    $expected = hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
    return hash_equals($expected, $signature);
}`,
        go: `func verify(rawBody []byte, timestamp, header, secret string) bool {
	signature := strings.TrimPrefix(header, "sha256=")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write(rawBody)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}`,
        ruby: `require "openssl"

def verify(raw_body, timestamp, header, secret)
  signature = header.to_s.sub("sha256=", "")
  expected = OpenSSL::HMAC.hexdigest("SHA256", secret, "#{timestamp}.#{raw_body}")
  OpenSSL.secure_compare(expected, signature)
end`,
        shell: `# Signature checking belongs in your application, not a shell one-liner.
# Pick a language above for a copyable implementation.`,
    };

    const verifySample = computed(() => SAMPLES[language.value] ?? SAMPLES.node);
</script>
