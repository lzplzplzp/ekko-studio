export interface ButlerLocale {
  nav: string
  title: string
  promptLabel: string
  placeholder: string
  submit: string
  working: string
  reuse: string
  decisionCreated: string
  decisionReused: string
  project: string
  workdir: string
  environment: string
  session: string
  databases: string
  credentialValid: string
  credentialInvalid: string
  credentialVersion: string
  groupSuggestion: string
  groupSuggestionBody: string
  openSession: string
  desktopOpened: string
  desktopUnavailable: string
  focusFailed: string
  empty: string
  procurementRejected: string
  projectUnresolved: string
  envUnresolved: string
  indexMissing: string
  indexInvalid: string
  failed: string
  indexSource: string
  guardrails: string
  readOnly: string
  noDatabases: string
}

const en: ButlerLocale = {
  nav: 'Butler',
  title: 'Butler',
  promptLabel: 'Describe the task in natural language',
  placeholder: 'For example: show today’s failed electronic-archive contracts for the production project platform',
  submit: 'Route',
  working: 'Routing…',
  reuse: 'Reuse a matching session',
  decisionCreated: 'Created a session',
  decisionReused: 'Reused a session',
  project: 'Project',
  workdir: 'Workdir',
  environment: 'Environment',
  session: 'Session',
  databases: 'Database aliases',
  credentialValid: 'Credential valid today',
  credentialInvalid: 'Credential not valid today',
  credentialVersion: 'Credential version',
  groupSuggestion: 'Ops room suggestion',
  groupSuggestionBody: 'This task can go to room {room}. This version still opens a single chat.',
  openSession: 'Open session',
  desktopOpened: 'Desktop chat window focused',
  desktopUnavailable: 'This browser has no separate chat-window API. The session is in the chat list.',
  focusFailed: 'Could not focus the desktop window. Open the session from the chat list.',
  empty: 'Enter a request first.',
  procurementRejected: 'Procurement projects are outside the ops butler.',
  projectUnresolved: 'No project in the index matched this request.',
  envUnresolved: 'Add whether this is production, staging, or test.',
  indexMissing: 'The project index file was not found.',
  indexInvalid: 'The project index could not be read.',
  failed: 'Butler routing failed.',
  indexSource: 'Index source',
  guardrails: 'Guardrails',
  readOnly: 'Read only',
  noDatabases: 'No database alias is registered for this environment',
}

const zh: ButlerLocale = {
  ...en,
  nav: '智能管家',
  title: '智能管家',
  promptLabel: '用自然语言说明要处理的事',
  placeholder: '例如：给我看下线上项目管理平台今天推新电子档案失败的有哪些合同',
  submit: '路由',
  working: '正在路由…',
  reuse: '复用匹配的会话',
  decisionCreated: '已新建会话',
  decisionReused: '已复用会话',
  project: '项目',
  workdir: '工作目录',
  environment: '环境',
  session: '会话',
  databases: '库别名',
  credentialValid: '今日凭据有效',
  credentialInvalid: '今日凭据无效',
  credentialVersion: '凭据版本',
  groupSuggestion: '运维群建议',
  groupSuggestionBody: '此任务建议进入房间 {room}。当前版本仍打开单聊会话。',
  openSession: '打开会话',
  desktopOpened: '已聚焦桌面聊天窗口',
  desktopUnavailable: '当前环境没有独立聊天窗口接口。会话已出现在聊天列表，可手动打开。',
  focusFailed: '无法聚焦桌面窗口，请从聊天列表打开。',
  empty: '请先输入问题。',
  procurementRejected: '采购线不在运维管家范围内。',
  projectUnresolved: '项目索引里没有匹配的项目。',
  envUnresolved: '请说明是线上、预发还是测试。',
  indexMissing: '找不到项目索引文件。',
  indexInvalid: '项目索引无法读取。',
  failed: '管家路由失败。',
  indexSource: '索引来源',
  guardrails: '红线',
  readOnly: '只读',
  noDatabases: '该环境没有登记库别名',
}

export const butlerMessages = {
  en,
  zh,
  'zh-TW': {
    ...zh,
    nav: '智慧管家',
    title: '智慧管家',
    promptLabel: '用自然語言說明要處理的事',
    placeholder: '例如：給我看下線上專案管理平台今天推新電子檔案失敗的有哪些合約',
    submit: '路由',
    working: '正在路由…',
    reuse: '重用相符的會話',
    decisionCreated: '已建立會話',
    decisionReused: '已重用會話',
    project: '專案',
    workdir: '工作目錄',
    environment: '環境',
    session: '會話',
    databases: '資料庫別名',
    credentialValid: '今日憑據有效',
    credentialInvalid: '今日憑據無效',
    credentialVersion: '憑據版本',
    groupSuggestion: '維運群建議',
    groupSuggestionBody: '此任務建議進入房間 {room}。目前版本仍開啟單聊會話。',
    openSession: '開啟會話',
    desktopOpened: '已聚焦桌面聊天視窗',
    desktopUnavailable: '目前環境沒有獨立聊天視窗介面。會話已出現在聊天列表，可手動開啟。',
    focusFailed: '無法聚焦桌面視窗，請從聊天列表開啟。',
    empty: '請先輸入問題。',
    procurementRejected: '採購線不在維運管家範圍內。',
    projectUnresolved: '專案索引裡沒有相符的專案。',
    envUnresolved: '請說明是線上、預發還是測試。',
    indexMissing: '找不到專案索引檔。',
    indexInvalid: '專案索引無法讀取。',
    failed: '管家路由失敗。',
    indexSource: '索引來源',
    guardrails: '紅線',
    readOnly: '唯讀',
    noDatabases: '此環境沒有登記資料庫別名',
  },
  ja: { ...en, nav: '執事', title: '執事', submit: '振り分け', working: '振り分け中…', openSession: 'セッションを開く' },
  ko: { ...en, nav: '집사', title: '집사', submit: '라우팅', working: '라우팅 중…', openSession: '세션 열기' },
  fr: { ...en, nav: 'Majordome', title: 'Majordome', submit: 'Orienter', working: 'Orientation…', openSession: 'Ouvrir la session' },
  es: { ...en, nav: 'Mayordomo', title: 'Mayordomo', submit: 'Enrutar', working: 'Enrutando…', openSession: 'Abrir sesión' },
  de: { ...en, nav: 'Butler', title: 'Butler', submit: 'Weiterleiten', working: 'Weiterleitung…', openSession: 'Sitzung öffnen' },
  pt: { ...en, nav: 'Mordomo', title: 'Mordomo', submit: 'Encaminhar', working: 'Encaminhando…', openSession: 'Abrir sessão' },
  ru: { ...en, nav: 'Дворецкий', title: 'Дворецкий', submit: 'Маршрут', working: 'Маршрутизация…', openSession: 'Открыть сессию' },
  ar: { ...en, nav: 'المدير', title: 'المدير', submit: 'توجيه', working: 'جارٍ التوجيه…', openSession: 'فتح الجلسة' },
  tr: { ...en, nav: 'Kâhya', title: 'Kâhya', submit: 'Yönlendir', working: 'Yönlendiriliyor…', openSession: 'Oturumu aç' },
} as const
