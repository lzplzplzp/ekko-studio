<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NButton, NCheckbox, NInput } from 'naive-ui'
import PageHeader from '@/components/layout/PageHeader.vue'
import { fetchButlerIndex, routeButler, type ButlerIndexInfo, type ButlerRouteSuccess } from '@/api/studio/butler'
import { desktopBridge } from '@/utils/desktop-bridge'

const GOLDEN_EXAMPLE = '给我看下线上项目管理平台今天推新电子档案失败的有哪些合同'

const { t } = useI18n()
const router = useRouter()
const text = ref(GOLDEN_EXAMPLE)
const preferReuse = ref(true)
const loading = ref(false)
const errorText = ref('')
const focusNote = ref('')
const result = ref<ButlerRouteSuccess | null>(null)
const indexInfo = ref<ButlerIndexInfo | null>(null)

const errorKeys: Record<string, string> = {
  procurement_rejected: 'butler.procurementRejected',
  project_unresolved: 'butler.projectUnresolved',
  env_unresolved: 'butler.envUnresolved',
  index_missing: 'butler.indexMissing',
  index_invalid: 'butler.indexInvalid',
}

function describeError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : ''
  const key = errorKeys[code]
  return key ? t(key) : t('butler.failed')
}

async function focusSession(sessionId: string, profile: string): Promise<void> {
  const bridge = desktopBridge()
  if (bridge?.isDesktop && typeof bridge.openChatWindow === 'function') {
    try {
      await bridge.openChatWindow(sessionId, profile)
      focusNote.value = t('butler.desktopOpened')
      return
    } catch {
      focusNote.value = t('butler.focusFailed')
    }
  } else {
    focusNote.value = t('butler.desktopUnavailable')
  }
}

async function submit(): Promise<void> {
  const question = text.value.trim()
  errorText.value = ''
  focusNote.value = ''
  if (!question) {
    errorText.value = t('butler.empty')
    return
  }
  loading.value = true
  try {
    result.value = await routeButler(question, preferReuse.value)
    await focusSession(result.value.session.sessionId, result.value.session.profile)
  } catch (error) {
    result.value = null
    errorText.value = describeError(error)
  } finally {
    loading.value = false
  }
}

function openSession(): void {
  const session = result.value?.session
  if (!session) return
  void router.push({ name: 'hermes.session', params: { sessionId: session.sessionId } })
}

onMounted(async () => {
  try {
    indexInfo.value = await fetchButlerIndex()
  } catch (error) {
    errorText.value = describeError(error)
  }
})
</script>

<template>
  <div class="butler-view">
    <PageHeader>
      <header class="page-header">
        <h2 class="header-title">{{ t('butler.title') }}</h2>
      </header>
    </PageHeader>
    <div class="butler-body">
      <form class="butler-card" data-theme-surface="card" @submit.prevent="submit">
        <p v-if="indexInfo" class="butler-meta">
          {{ t('butler.indexSource') }}: {{ indexInfo.source }}
        </p>
        <label class="butler-label" for="butler-prompt">{{ t('butler.promptLabel') }}</label>
        <NInput
          id="butler-prompt"
          v-model:value="text"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 8 }"
          :placeholder="t('butler.placeholder')"
        />
        <NCheckbox v-model:checked="preferReuse">{{ t('butler.reuse') }}</NCheckbox>
        <div class="butler-actions">
          <NButton attr-type="submit" type="primary" :loading="loading" :disabled="loading">
            {{ loading ? t('butler.working') : t('butler.submit') }}
          </NButton>
        </div>
        <p v-if="errorText" class="butler-error">{{ errorText }}</p>
      </form>

      <section v-if="result" class="butler-card" data-theme-surface="card">
        <h3 class="butler-decision">
          {{ result.decision === 'reused' ? t('butler.decisionReused') : t('butler.decisionCreated') }}
        </h3>
        <dl class="butler-facts">
          <div>
            <dt>{{ t('butler.project') }}</dt>
            <dd>{{ result.session.projectKey }}</dd>
          </div>
          <div>
            <dt>{{ t('butler.workdir') }}</dt>
            <dd>{{ result.session.workdir }}</dd>
          </div>
          <div>
            <dt>{{ t('butler.environment') }}</dt>
            <dd>{{ result.session.env }}</dd>
          </div>
          <div>
            <dt>{{ t('butler.session') }}</dt>
            <dd>{{ result.session.sessionId }}</dd>
          </div>
        </dl>
        <h4 class="butler-subtitle">{{ t('butler.databases') }}</h4>
        <p v-if="result.contextPack.databases.length === 0" class="butler-meta">{{ t('butler.noDatabases') }}</p>
        <ul v-else class="butler-list">
          <li v-for="database in result.contextPack.databases" :key="database.alias">
            {{ database.alias }}
            · {{ database.env }}
            · {{ database.readOnly ? t('butler.readOnly') : '' }}
            · {{ t('butler.credentialVersion') }} {{ database.credentialVersion }}
            · {{ database.credentialValidToday ? t('butler.credentialValid') : t('butler.credentialInvalid') }}
          </li>
        </ul>
        <p v-if="result.contextPack.groupSuggestion" class="butler-meta">
          {{ t('butler.groupSuggestion') }}:
          {{ t('butler.groupSuggestionBody', { room: result.contextPack.groupSuggestion.roomId }) }}
        </p>
        <h4 class="butler-subtitle">{{ t('butler.guardrails') }}</h4>
        <ul class="butler-list">
          <li v-for="line in result.contextPack.guardrails" :key="line">{{ line }}</li>
        </ul>
        <p v-if="focusNote" class="butler-meta">{{ focusNote }}</p>
        <div class="butler-actions">
          <NButton type="primary" @click="openSession">{{ t('butler.openSession') }}</NButton>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.butler-view {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.butler-body {
  flex: 1;
  overflow: auto;
  padding: calc(20px * var(--spacing-scale, 1));
  display: grid;
  gap: calc(16px * var(--spacing-scale, 1));
  align-content: start;
}

.butler-card {
  display: grid;
  gap: calc(12px * var(--spacing-scale, 1));
  max-width: 760px;
  padding: calc(16px * var(--spacing-scale, 1));
  background: $bg-card;
  color: $text-primary;
  border: var(--border-width, 1px) solid $border-light;
  border-radius: var(--radius-component, 8px);
}

.butler-label,
.butler-decision,
.butler-subtitle {
  margin: 0;
  color: $text-primary;
}

.butler-meta {
  margin: 0;
  color: $text-secondary;
}

.butler-error {
  margin: 0;
  color: $error;
}

.butler-facts {
  display: grid;
  gap: calc(8px * var(--spacing-scale, 1));
  margin: 0;

  div {
    display: grid;
    gap: calc(2px * var(--spacing-scale, 1));
  }

  dt {
    color: $text-secondary;
  }

  dd {
    margin: 0;
    color: $text-primary;
  }
}

.butler-list {
  margin: 0;
  padding-inline-start: calc(18px * var(--spacing-scale, 1));
  color: $text-primary;
}

.butler-actions {
  display: flex;
  gap: calc(8px * var(--spacing-scale, 1));
}
</style>
