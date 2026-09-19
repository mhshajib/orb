export default defineNuxtConfig({
    app: {
        head: {
            title: 'Orb — Transactional email, priced in Taka',
            titleTemplate: '%s | Orb',
            htmlAttrs: {
                lang: 'en',
            },
            meta: [
                { charset: 'utf-8' },
                {
                    name: 'viewport',
                    content: 'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no',
                },
                {
                    hid: 'description',
                    name: 'description',
                    content: 'Orb is the transactional email API built for Bangladesh — verified domains, signed webhooks, real-time events, and BDT billing through bKash.',
                },
                { name: 'format-detection', content: 'telephone=no' },
            ],
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
                { rel: 'icon', type: 'image/png', href: '/favicon.png' },
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap',
                },
            ],
        },
    },

    css: ['~/assets/css/app.css'],

    postcss: {
        plugins: {
            tailwindcss: {},
            autoprefixer: {},
        },
    },

    modules: ['@pinia/nuxt', '@nuxtjs/i18n'],

    i18n: {
        locales: [
            { code: 'da', file: 'da.json' },
            { code: 'de', file: 'de.json' },
            { code: 'el', file: 'fr.json' },
            { code: 'en', file: 'en.json' },
            { code: 'es', file: 'es.json' },
            { code: 'fr', file: 'fr.json' },
            { code: 'hu', file: 'hu.json' },
            { code: 'it', file: 'it.json' },
            { code: 'ja', file: 'ja.json' },
            { code: 'pl', file: 'pl.json' },
            { code: 'pt', file: 'pt.json' },
            { code: 'ru', file: 'ru.json' },
            { code: 'sv', file: 'sv.json' },
            { code: 'tr', file: 'tr.json' },
            { code: 'zh', file: 'zh.json' },
            { code: 'ae', file: 'ae.json' },
        ],
        lazy: true,
        defaultLocale: 'en',
        strategy: 'no_prefix',
        langDir: 'locales/',
    },

    // Server-only API base (Nitro proxy target) and public WS base.
    runtimeConfig: {
        // Where the Nitro proxy forwards /api/* (customer) and /platform/api/* (staff).
        // Override with NUXT_API_BASE.
        apiBase: 'http://localhost:8080',
        public: {
            // Exposed to client for the websocket connect URL. Override with NUXT_PUBLIC_WS_BASE.
            wsBase: 'ws://localhost:8080/ws',
            // Shared free-tier sending domain — free orgs send as "<slug>@<this>".
            // Must match the backend's mailer.shared_sending_domain.
            sharedSendingDomain: 'send.orb.bd',
        },
    },

    devServer: {
        port: 3001,
    },

    // The authenticated dashboard + staff console are client-rendered SPAs
    // (no SEO need, and it lets us reuse Vristo's apexcharts/datatable/Popper
    // designs verbatim without SSR-only-component breakage). Landing + auth
    // pages keep SSR for SEO/first paint.
    routeRules: {
        '/app/**': { ssr: false },
        '/platform/**': { ssr: false },
        // The developer portal is behind auth and leans on the same Vristo
        // pieces plus highlight.js, which touches the DOM directly. Same
        // reasoning as above - there is nothing to gain from SSR here and a
        // client-only render avoids SSR-only-component breakage.
        // Both patterns: '/developers/**' does not match '/developers' itself.
        '/developers': { ssr: false },
        '/developers/**': { ssr: false },
    },

    vite: {
        optimizeDeps: { include: ['quill'] },
    },

    router: {
        options: { linkExactActiveClass: 'active' },
    },

    compatibilityDate: '2024-09-21',
});
