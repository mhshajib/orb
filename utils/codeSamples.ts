import type { ApiEndpoint } from '@/utils/apiSpec'
import { API_BASE } from '@/utils/apiSpec'

/**
 * Generates a request snippet per language from an endpoint definition.
 *
 * Generated rather than hand-written so the samples cannot drift from the
 * parameter tables they sit next to - the usual failure mode of API docs is a
 * curl example that stopped matching the endpoint three releases ago.
 */

export interface CodeLanguage {
  id: string
  label: string
  /** highlight.js language id. */
  hljs: string
}

export const CODE_LANGUAGES: CodeLanguage[] = [
  { id: 'shell', label: 'Shell', hljs: 'bash' },
  { id: 'node', label: 'Node', hljs: 'javascript' },
  { id: 'python', label: 'Python', hljs: 'python' },
  { id: 'php', label: 'PHP', hljs: 'php' },
  { id: 'go', label: 'Go', hljs: 'go' },
  { id: 'ruby', label: 'Ruby', hljs: 'ruby' },
]

const KEY_PLACEHOLDER = 'orb_live_xxxxxxxxxxxxxxxx'

function url(e: ApiEndpoint): string {
  return API_BASE + e.path
}

function jsonBody(e: ApiEndpoint, indent = 0): string {
  if (!e.example)
    return ''
  return JSON.stringify(e.example, null, 2)
    .split('\n')
    .map((l, i) => (i === 0 ? l : ' '.repeat(indent) + l))
    .join('\n')
}

function shell(e: ApiEndpoint, key: string): string {
  const lines = [`curl --request ${e.method} \\`, `  --url ${url(e)} \\`, `  --header 'Authorization: Bearer ${key}' \\`]
  if (e.example) {
    lines.push(`  --header 'Content-Type: application/json' \\`)
    lines.push(`  --data '${JSON.stringify(e.example, null, 2)}'`)
  }
  else {
    // drop the trailing backslash on the last header
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, '')
  }
  return lines.join('\n')
}

function node(e: ApiEndpoint, key: string): string {
  const opts = [`  method: '${e.method}',`, `  headers: {`, `    Authorization: 'Bearer ${key}',`]
  if (e.example)
    opts.push(`    'Content-Type': 'application/json',`)
  opts.push(`  },`)
  if (e.example)
    opts.push(`  body: JSON.stringify(${jsonBody(e, 2)}),`)
  return [
    `const res = await fetch('${url(e)}', {`,
    ...opts,
    `})`,
    ``,
    `const data = await res.json()`,
    `console.log(data)`,
  ].join('\n')
}

function python(e: ApiEndpoint, key: string): string {
  const lines = [`import requests`, ``, `res = requests.${e.method.toLowerCase()}(`, `    "${url(e)}",`, `    headers={"Authorization": "Bearer ${key}"},`]
  if (e.example)
    lines.push(`    json=${jsonBody(e, 4).replace(/"/g, '"').replace(/true/g, 'True').replace(/false/g, 'False')},`)
  lines.push(`)`, ``, `print(res.json())`)
  return lines.join('\n')
}

function php(e: ApiEndpoint, key: string): string {
  const lines = [
    `<?php`,
    `$ch = curl_init("${url(e)}");`,
    `curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);`,
    `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${e.method}");`,
  ]
  const headers = [`"Authorization: Bearer ${key}"`]
  if (e.example) {
    headers.push(`"Content-Type: application/json"`)
    lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(${phpArray(e.example)}));`)
  }
  lines.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [${headers.join(', ')}]);`)
  lines.push(``, `$response = curl_exec($ch);`, `curl_close($ch);`, `echo $response;`)
  return lines.join('\n')
}

function phpArray(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).map(([k, v]) => {
    if (Array.isArray(v))
      return `    "${k}" => [${v.map(x => JSON.stringify(x)).join(', ')}]`
    return `    "${k}" => ${JSON.stringify(v)}`
  })
  return `[\n${entries.join(',\n')},\n]`
}

function go(e: ApiEndpoint, key: string): string {
  const lines = [
    `package main`,
    ``,
    `import (`,
    `\t"fmt"`,
    `\t"io"`,
    `\t"net/http"`,
  ]
  if (e.example)
    lines.push(`\t"strings"`)
  lines.push(`)`, ``, `func main() {`)
  if (e.example) {
    lines.push(`\tbody := strings.NewReader(\`${JSON.stringify(e.example, null, 2)}\`)`)
    lines.push(`\treq, _ := http.NewRequest("${e.method}", "${url(e)}", body)`)
    lines.push(`\treq.Header.Set("Content-Type", "application/json")`)
  }
  else {
    lines.push(`\treq, _ := http.NewRequest("${e.method}", "${url(e)}", nil)`)
  }
  lines.push(
    `\treq.Header.Set("Authorization", "Bearer ${key}")`,
    ``,
    `\tres, err := http.DefaultClient.Do(req)`,
    `\tif err != nil {`,
    `\t\tpanic(err)`,
    `\t}`,
    `\tdefer res.Body.Close()`,
    ``,
    `\tout, _ := io.ReadAll(res.Body)`,
    `\tfmt.Println(string(out))`,
    `}`,
  )
  return lines.join('\n')
}

function ruby(e: ApiEndpoint, key: string): string {
  const lines = [
    `require "net/http"`,
    `require "json"`,
    ``,
    `uri = URI("${url(e)}")`,
    `req = Net::HTTP::${e.method.charAt(0) + e.method.slice(1).toLowerCase()}.new(uri)`,
    `req["Authorization"] = "Bearer ${key}"`,
  ]
  if (e.example) {
    lines.push(`req["Content-Type"] = "application/json"`)
    lines.push(`req.body = ${JSON.stringify(e.example)}.to_json`)
  }
  lines.push(
    ``,
    `res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }`,
    `puts res.body`,
  )
  return lines.join('\n')
}

const GENERATORS: Record<string, (e: ApiEndpoint, key: string) => string> = {
  shell,
  node,
  python,
  php,
  go,
  ruby,
}

/**
 * Renders the snippet for one endpoint in one language.
 *
 * `apiKey` is substituted verbatim so a signed-in developer can copy a sample
 * that already works. It falls back to a placeholder when no key is available -
 * never a real key belonging to someone else.
 */
export function codeSample(endpoint: ApiEndpoint, language: string, apiKey?: string | null): string {
  const gen = GENERATORS[language] ?? shell
  return gen(endpoint, apiKey || KEY_PLACEHOLDER)
}
