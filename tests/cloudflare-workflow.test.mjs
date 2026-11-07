import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import yaml from 'js-yaml'

test('workflow is isolated, time-bounded, read-only to Git and uses scoped deployment credentials', async () => {
  const source = await readFile(new URL('../.github/workflows/cloudflare-free-preview.yml', import.meta.url), 'utf8')
  const workflow = yaml.load(source)
  assert.deepEqual(workflow.on.push.branches, ['codex/cloudflare-free-preview'])
  assert.deepEqual(Object.keys(workflow.on).sort(), ['push', 'workflow_dispatch'])
  assert.deepEqual(workflow.permissions, { contents: 'read' })
  assert.equal(workflow.jobs.deploy['runs-on'], 'ubuntu-latest')
  assert.equal(workflow.jobs.deploy['timeout-minutes'], 15)
  assert.match(workflow.jobs.deploy.if, /github.ref == 'refs\/heads\/codex\/cloudflare-free-preview'/)
  for (const step of workflow.jobs.deploy.steps.filter(s => s.uses)) assert.match(step.uses, /@[a-f0-9]{40}$/)
  const deployment = workflow.jobs.deploy.steps.find(s => s.run === 'npm run deploy:vinext')
  assert.equal(deployment.env.CLOUDFLARE_API_TOKEN, '${{ secrets.CLOUDFLARE_PREVIEW_API_TOKEN }}')
  assert.equal(Object.keys(workflow.jobs.deploy.env).some(k => k.includes('SERVICE_ROLE')), false)
  assert.doesNotMatch(source, /pull_request_target|upload-artifact|schedule:/)
})
