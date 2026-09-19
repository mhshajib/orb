<template>
    <div class="overflow-hidden rounded-md border border-[#1b2e4b] bg-[#0e1726]">
        <div v-if="title || $slots.actions" class="flex items-center justify-between gap-3 border-b border-[#1b2e4b] px-4 py-2">
            <div class="flex items-center gap-2">
                <span v-if="title" class="text-xs font-semibold uppercase tracking-wide text-white-dark">{{ title }}</span>
                <span v-if="badge" class="badge bg-success/20 text-success">{{ badge }}</span>
            </div>
            <div class="flex items-center gap-2">
                <slot name="actions" />
                <OrbCopyButton :value="code" label="Copy" />
            </div>
        </div>
        <pre class="!m-0 max-h-[32rem] overflow-auto !rounded-none !bg-transparent p-4 text-[13px] leading-relaxed"><code ref="el" :class="`language-${language}`">{{ code }}</code></pre>
    </div>
</template>

<script lang="ts" setup>
    import hljs from 'highlight.js';
    import 'highlight.js/styles/monokai-sublime.css';

    // Vristo ships components/plugins/highlight.vue, but it highlights once on
    // mount. This panel's content changes every time the language tab changes,
    // so it has to re-highlight on update or the snippet renders as plain text.
    const props = withDefaults(
        defineProps<{
            code: string;
            /** highlight.js language id, e.g. bash, javascript, go. */
            language?: string;
            title?: string;
            badge?: string;
        }>(),
        { language: 'bash' },
    );

    const el = ref<HTMLElement | null>(null);

    function paint() {
        const node = el.value;
        if (!node) return;
        // highlightElement refuses to touch a node it has already processed, so
        // the marker has to be cleared before re-running it.
        delete node.dataset.highlighted;
        node.textContent = props.code;
        node.className = `language-${props.language}`;
        try {
            hljs.highlightElement(node);
        } catch {
            // A bad language id should never blank the snippet - the plain text
            // is already in the DOM, so leaving it unhighlighted is the right
            // failure.
        }
    }

    onMounted(paint);
    watch(() => [props.code, props.language], paint);
</script>
