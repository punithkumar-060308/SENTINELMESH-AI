/**
 * SentinelMesh AI - Mock & Initial Data Specification
 * Conforms to Section 8 & 9 of SentinelMesh_Frontend_Implementation_Guide.md
 */

export const initialIncidents = [
  {
    id: "INC-8921",
    title: "NullPointer in StripeWebhookHandler after v2.14.0 rollout",
    application: "payment-gateway-svc",
    version: "v2.14",
    description: "Cannot read field customerMetadata because payload.customer is null on guest checkout invoices",
    severity: "critical", // critical | high | medium | low
    status: "awaiting_approval", // detected | investigating | awaiting_approval | approved | verifying | recovered | failed | rejected
    detectedAt: "2026-11-06T09:41:22Z",
    detectedTime: "4m ago",
    signature: "java.lang.NullPointerException: Cannot invoke StripeWebhookPayload.getCustomerId()",
    location: "StripeWebhookController.kt:142",
    traceId: "8a9f31c0e",
    impact: "54 req/s impact",
    pipelineAgent: "Repair Agent (PR #891 ready)",
    activeStep: 4,
    stackTrace: `Exception in thread "stripe-worker-4" java.lang.NullPointerException: Cannot read field "customerMetadata" because "payload.customer" is null
    at com.sentinelmesh.billing.StripeWebhookHandler.processEvent(StripeWebhookHandler.java:142)
    at com.sentinelmesh.billing.StripeWebhookHandler.handleInvoicePaid(StripeWebhookHandler.java:88)
    at com.sentinelmesh.billing.IngestionEngine.lambda$consume$2(IngestionEngine.java:41)`,
    rootCause: "Recent Pull Request #389 assumed the Stripe customer object was strictly non-null in invoice.payment_succeeded events. However, guest checkout invoices omit this entity, triggering immediate dereference crash.",
    sourceFile: "src/main/java/com/sentinelmesh/billing/StripeWebhookHandler.java:142",
    confidence: 96.4,
    blastRadius: "Isolated",
    blastRadiusDetail: "Guest invoice webhook pipeline only. Core recurring billing unaffected.",
    correlatedPR: "#389 by @j-chen (Merged 42 minutes ago)",
    proposedPatch: {
      id: "PAT-8921",
      incidentId: "INC-8921",
      filePath: "src/main/java/com/sentinelmesh/billing/StripeWebhookHandler.java",
      diffSummary: "-2 lines / +5 lines",
      explanation: "Uses Optional to guard nullable customer object and falls back to guest_customer_id from payload metadata.",
      status: "pending", // pending | approved | rejected | applied | verified | failed
      originalLines: [
        { num: 139, text: "public void processEvent(StripeWebhookPayload payload) {", type: "context" },
        { num: 140, text: '    Objects.requireNonNull(payload, "Payload cannot be null");', type: "context" },
        { num: 141, text: " ", type: "context" },
        { num: 142, text: "   String customerId = payload.getCustomer().getId();", type: "deleted" },
        { num: 143, text: "   billingService.recordTransaction(customerId, payload.getAmount());", type: "deleted" },
        { num: 144, text: "}", type: "context" }
      ],
      patchedLines: [
        { num: 139, text: "public void processEvent(StripeWebhookPayload payload) {", type: "context" },
        { num: 140, text: '    Objects.requireNonNull(payload, "Payload cannot be null");', type: "context" },
        { num: 141, text: " ", type: "context" },
        { num: 142, text: "   String customerId = Optional.ofNullable(payload.getCustomer())", type: "added" },
        { num: 143, text: "           .map(Customer::getId)", type: "added" },
        { num: 144, text: '           .orElseGet(() -> payload.getMetadata().getOrDefault("guest_customer_id", "GUEST_UNKNOWN"));', type: "added" },
        { num: 145, text: "   billingService.recordTransaction(customerId, payload.getAmount());", type: "added" },
        { num: 146, text: '   log.info("Handled webhook event for customer: {}", customerId);', type: "added" },
        { num: 147, text: "}", type: "context" }
      ]
    },
    podLogs: [
      { time: "09:41:19.401", level: "INFO", message: "Webhook payload signature validated for id=evt_3P7x9L2eZvKYlo2C" },
      { time: "09:41:20.108", level: "INFO", message: "Resolved payment_intent: pi_3P7x9L2eZvKYlo2C_secret (status=succeeded)" },
      { time: "09:41:21.054", level: "WARN", message: "Payload customer object evaluates to null for invoice.payment_succeeded" },
      { time: "09:41:22.012", level: "ERROR", message: "NullPointerException: StripeWebhookHandler.java:142 on thread worker-4" },
      { time: "09:41:22.420", level: "ERROR", message: "Dead Letter Queue route activated: 420 messages dispatched to DLQ_STRIPE_DEAD" }
    ],
    timeline: [
      { agent: "Observer", action: "Detected failure spike (+420 err/sec)", timestamp: "09:41:23 UTC", status: "completed" },
      { agent: "Investigator", action: "Isolated commit e78f21 and root cause", timestamp: "09:42:05 UTC", status: "completed" },
      { agent: "Repair", action: "Synthesized minimal defensive null-check patch", timestamp: "09:43:10 UTC", status: "completed" },
      { agent: "Human Gate", action: "Awaiting Staff SRE sign-off", timestamp: "09:44:00 UTC", status: "pending" },
      { agent: "Verifier", action: "Ephemeral sandbox pre-warmed", timestamp: "09:44:12 UTC", status: "queued" }
    ]
  },
  {
    id: "INC-001",
    title: "GET /users returns HTTP 500 internal server error",
    application: "demo-api",
    version: "v1.0",
    description: "Database connection pool timeout during unindexed query execution on user profile service",
    severity: "high",
    status: "investigating",
    detectedAt: "2026-11-06T09:35:10Z",
    detectedTime: "10m ago",
    signature: "DatabaseTimeoutException: Connection acquisition timed out after 3000ms",
    location: "UserController.ts:54",
    traceId: "d410ab99c",
    impact: "18 req/s degraded",
    pipelineAgent: "Investigator Agent (analyzing slow query log)",
    activeStep: 2,
    stackTrace: `DatabaseTimeoutException: Connection acquisition timed out after 3000ms
    at Pool.acquireConnection (pg-pool/index.js:145)
    at UserRepository.findWithProfiles (UserRepository.ts:54)
    at UserController.getUsers (UserController.ts:88)`,
    rootCause: "Missing composite index on users(tenant_id, created_at) causing sequential table scan under traffic spikes.",
    sourceFile: "src/controllers/UserController.ts:54",
    confidence: 93.8,
    blastRadius: "Service Level",
    blastRadiusDetail: "Tenant user listing degraded. Single user lookup endpoints functioning normally.",
    correlatedPR: "PR #12 by @alex-dev",
    proposedPatch: {
      id: "PAT-001",
      incidentId: "INC-001",
      filePath: "src/migrations/20261106_add_users_index.sql",
      diffSummary: "+1 line",
      explanation: "Adds concurrent index CREATE INDEX CONCURRENTLY idx_users_tenant_created ON users(tenant_id, created_at DESC).",
      status: "pending",
      originalLines: [
        { num: 1, text: "-- Migration: schema baseline", type: "context" }
      ],
      patchedLines: [
        { num: 1, text: "-- Migration: schema baseline", type: "context" },
        { num: 2, text: "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_created ON users(tenant_id, created_at DESC);", type: "added" }
      ]
    },
    podLogs: [
      { time: "09:35:08.100", level: "WARN", message: "Query latency threshold exceeded (> 2500ms) on GET /users" },
      { time: "09:35:10.450", level: "ERROR", message: "HTTP 500: DatabaseTimeoutException in UserController.getUsers" }
    ],
    timeline: [
      { agent: "Observer", action: "Detected HTTP 500 rate breach", timestamp: "09:35:10 UTC", status: "completed" },
      { agent: "Investigator", action: "Analyzing PostgreSQL query plan", timestamp: "09:36:12 UTC", status: "running" }
    ]
  },
  {
    id: "INC-8919",
    title: "Redis connection pool exhaustion on token validation spike",
    application: "auth-session-worker",
    version: "v1.8",
    description: "Redis cluster shard 02 unreachable due to socket leaks during Auth0 timeout events",
    severity: "high",
    status: "investigating",
    detectedAt: "2026-11-06T09:27:14Z",
    detectedTime: "18m ago",
    signature: "redis.clients.jedis.exceptions.JedisConnectionException: Could not get resource from pool",
    location: "JedisSentinelPool.java:238",
    traceId: "3c21bf90a",
    impact: "Redis cluster shard 02 unreachable",
    pipelineAgent: "Investigator Agent (parsing traces)",
    activeStep: 2,
    stackTrace: `redis.clients.jedis.exceptions.JedisConnectionException: Could not get a resource from the pool
    at redis.clients.jedis.util.Pool.getResource(Pool.java:84)
    at com.sentinelmesh.auth.TokenValidator.checkRevocation(TokenValidator.kt:94)`,
    rootCause: "Connection pool maxTotal (50) reached due to leaked sockets during upstream Auth0 timeout events.",
    sourceFile: "src/main/kotlin/com/sentinelmesh/auth/TokenValidator.kt:94",
    confidence: 91.2,
    blastRadius: "Partial",
    blastRadiusDetail: "Affects session renewals; active JWT access tokens continue without disruption.",
    correlatedPR: "#342 by @m-santos (Merged 3 days ago)",
    proposedPatch: null,
    podLogs: [
      { time: "09:26:58.112", level: "INFO", message: "Token validation burst: 1,820 req/s on shard 02" },
      { time: "09:27:04.450", level: "WARN", message: "Jedis pool active connections: 49/50 (threshold 90%)" },
      { time: "09:27:14.020", level: "ERROR", message: "JedisConnectionException: timeout waiting for idle object in pool" }
    ],
    timeline: [
      { agent: "Observer", action: "Detected socket saturation on shard 02", timestamp: "09:27:14 UTC", status: "completed" },
      { agent: "Investigator", action: "Parsing heap dump and socket leaks", timestamp: "09:28:00 UTC", status: "running" }
    ]
  },
  {
    id: "INC-8915",
    title: "Postgres deadlock detected between concurrent batch allocations",
    application: "inventory-sync-db",
    version: "v4.0",
    description: "Deadlock detected between process 14209 and 14211 in warehouse_reservations",
    severity: "high",
    status: "verifying",
    detectedAt: "2026-11-06T09:03:00Z",
    detectedTime: "42m ago",
    signature: "org.postgresql.util.PSQLException: ERROR: deadlock detected between process 14209 and 14211",
    location: "QueryExecutorImpl.java:2334",
    traceId: "91e0a29bd",
    impact: "Lock isolated in sandbox",
    pipelineAgent: "Verifier Agent (evaluating canary)",
    activeStep: 5,
    stackTrace: `org.postgresql.util.PSQLException: ERROR: deadlock detected
  Detail: Process 14209 waits for ShareLock on transaction 89104; Process 14211 waits for ExclusiveLock on tuple (48, 12).`,
    rootCause: "Unsorted multi-SKU updates in reserveStock() acquiring row locks in non-deterministic order.",
    sourceFile: "src/main/java/com/sentinelmesh/inventory/StockReservationService.java:78",
    confidence: 98.2,
    blastRadius: "Contained",
    blastRadiusDetail: "Lock table warehouse_reservations isolated. Automated retry handler capturing 92% of queries.",
    correlatedPR: "#371 by @a-patel (Merged yesterday)",
    proposedPatch: {
      id: "PAT-8915",
      incidentId: "INC-8915",
      filePath: "src/main/java/com/sentinelmesh/inventory/StockReservationService.java",
      diffSummary: "-1 line / +3 lines",
      explanation: "Sorts SKU reservation items deterministically by SKU ID before acquiring lock.",
      status: "approved",
      originalLines: [
        { num: 77, text: "public void reserve(List<ReservationItem> items) {", type: "context" },
        { num: 78, text: "    for (ReservationItem item : items) {", type: "deleted" },
        { num: 79, text: "        lockRow(item.getSkuId());", type: "context" }
      ],
      patchedLines: [
        { num: 77, text: "public void reserve(List<ReservationItem> items) {", type: "context" },
        { num: 78, text: "    List<ReservationItem> sorted = items.stream()", type: "added" },
        { num: 79, text: "        .sorted(Comparator.comparing(ReservationItem::getSkuId)).toList();", type: "added" },
        { num: 80, text: "    for (ReservationItem item : sorted) {", type: "added" },
        { num: 81, text: "        lockRow(item.getSkuId());", type: "context" }
      ]
    },
    podLogs: [
      { time: "09:02:40.100", level: "INFO", message: "Batch warehouse reservation sync initiated (1,200 items)" },
      { time: "09:02:59.880", level: "ERROR", message: "PSQLException: deadlock detected between process 14209 and 14211" }
    ],
    timeline: [
      { agent: "Observer", action: "Deadlock event captured from Postgres engine", timestamp: "09:03:00 UTC", status: "completed" },
      { agent: "Investigator", action: "Identified non-deterministic lock acquisition sequence", timestamp: "09:04:12 UTC", status: "completed" },
      { agent: "Repair", action: "Synthesized deterministic lock ordering patch", timestamp: "09:05:30 UTC", status: "completed" },
      { agent: "Human Gate", action: "Approved by Lead SRE", timestamp: "09:08:15 UTC", status: "completed" },
      { agent: "Verifier", action: "Executing 24 concurrent stress suites in sandbox", timestamp: "09:09:00 UTC", status: "running" }
    ]
  },
  {
    id: "INC-8894",
    title: "OOMKilled event triggered by unbound memory growth during PDF invoice rendering",
    application: "order-fulfillment-api",
    version: "v3.1",
    description: "Unbuffered PDF generator buffering full multi-page high-resolution asset payloads in memory",
    severity: "medium",
    status: "recovered",
    detectedAt: "2026-11-06T07:45:00Z",
    detectedTime: "2h ago",
    signature: "ExitCode 137: Container killed by Linux kernel OOM Killer",
    location: "InvoiceRenderer.go:118",
    traceId: "f44b19c8e",
    impact: "Auto-healed by Repair Agent",
    pipelineAgent: "Repair Agent (PR #398 auto-merged)",
    activeStep: 5,
    stackTrace: `fatal error: runtime: out of memory
runtime stack:
runtime.throw({0x10b7f80, 0x16})
    /usr/local/go/src/runtime/panic.go:1198 +0x71`,
    rootCause: "Unbuffered PDF generator buffering full multi-page high-resolution asset payloads in memory instead of streaming chunks.",
    sourceFile: "cmd/fulfillment/InvoiceRenderer.go:118",
    confidence: 99.1,
    blastRadius: "Auto-Recovered",
    blastRadiusDetail: "Patch auto-verified in ephemeral sandbox; container memory capped at 512MB with zero leaks.",
    correlatedPR: "#398 by @sentinelmesh-bot",
    proposedPatch: null,
    podLogs: [
      { time: "07:44:50.012", level: "WARN", message: "cgroup memory usage spike: 98.4% limit reached" },
      { time: "07:45:00.120", level: "ERROR", message: "ExitCode 137 (OOMKilled). Swarm triggered isolated auto-healing" },
      { time: "07:47:18.910", level: "INFO", message: "Verifier Agent completed 24/24 tests with zero regression. Recovered." }
    ],
    timeline: [
      { agent: "Observer", action: "Captured SIGKILL ExitCode 137", timestamp: "07:45:00 UTC", status: "completed" },
      { agent: "Investigator", action: "Identified unbuffered PDF writer memory leak", timestamp: "07:45:45 UTC", status: "completed" },
      { agent: "Repair", action: "Synthesized streaming chunked writer", timestamp: "07:46:12 UTC", status: "completed" },
      { agent: "Verifier", action: "24/24 regression tests passed in sandbox", timestamp: "07:47:18 UTC", status: "completed" }
    ]
  }
];

export const fleetAgents = [
  {
    id: "observer",
    agentId: "obs-prod-01",
    name: "Observer Agent",
    icon: "radar",
    status: "running", // idle | running | completed | failed | waiting_for_approval
    statusColor: "tertiary",
    description: "Continuously monitors logs, Prometheus metrics, distributed traces, and APM spans to detect anomalies within seconds.",
    lastActivity: "Polled 14 services 8s ago",
    lastRunTime: "2026-11-06T09:41:23Z",
    currentIncidentId: "INC-8921",
    tasksCompleted: 1429,
    accuracy: "99.4%",
    latency: "1.4s",
    metricLabel1: "Tasks Completed",
    metricValue1: "1,429",
    metricLabel2: "Precision",
    metricValue2: "99.4%",
    metricLabel3: "MTTD",
    metricValue3: "1.4s",
    streamRate: "42.8k events/s",
    capabilities: [
      "OpenTelemetry ingestion",
      "eBPF packet inspection",
      "Log anomaly classification",
      "Kafka consumer group monitoring"
    ]
  },
  {
    id: "investigator",
    agentId: "inv-prod-02",
    name: "Investigator Agent",
    icon: "biotech",
    status: "running",
    statusColor: "secondary",
    description: "Analyzes call stacks, git blame history, AST diffs, and dependencies to pinpoint the exact failure mechanism.",
    lastActivity: "Active on INC-8921 (Root cause identified)",
    lastRunTime: "2026-11-06T09:42:05Z",
    currentIncidentId: "INC-8921",
    tasksCompleted: 842,
    accuracy: "94.8%",
    latency: "128k T",
    metricLabel1: "Tasks Completed",
    metricValue1: "842",
    metricLabel2: "Root Accuracy",
    metricValue2: "94.8%",
    metricLabel3: "Context Window",
    metricValue3: "128k T",
    streamRate: "94.8% high certainty",
    capabilities: [
      "Git commit lineage tracing",
      "Causal inference engine",
      "AST symbol cross-ref",
      "Dependency graph blast radius"
    ]
  },
  {
    id: "repair",
    agentId: "rep-prod-03",
    name: "Repair Agent",
    icon: "auto_fix_high",
    status: "idle",
    statusColor: "outline",
    description: "Synthesizes minimal, non-breaking code patches targeting the identified root cause with strict human sign-off gating.",
    lastActivity: "Generated PR patch for INC-8921 5m ago",
    lastRunTime: "2026-11-06T09:43:10Z",
    currentIncidentId: "INC-8921",
    tasksCompleted: 512,
    accuracy: "91.2%",
    latency: "8.4",
    metricLabel1: "Tasks Completed",
    metricValue1: "512",
    metricLabel2: "Approval Rate",
    metricValue2: "91.2%",
    metricLabel3: "Avg Lines Chg",
    metricValue3: "8.4",
    streamRate: "+12 / -4 lines target",
    capabilities: [
      "Semantic AST editing",
      "Linter compliance",
      "Defensive pattern synthesis",
      "Zero-dependency constraint solver"
    ]
  },
  {
    id: "verifier",
    agentId: "ver-prod-04",
    name: "Verifier Agent",
    icon: "science",
    status: "running",
    statusColor: "primary",
    description: "Spins up isolated ephemeral sandboxes, runs unit & regression suites, and synthesizes edge-case verification tests.",
    lastActivity: "Pre-flight warm container for INC-8921",
    lastRunTime: "2026-11-06T09:44:12Z",
    currentIncidentId: "INC-8921",
    tasksCompleted: 498,
    accuracy: "0.0%",
    latency: "1.8s",
    metricLabel1: "Tasks Completed",
    metricValue1: "498",
    metricLabel2: "Prod Regressions",
    metricValue2: "0.0%",
    metricLabel3: "Sandbox Spinup",
    metricValue3: "1.8s",
    streamRate: "100% Passed (42/42)",
    capabilities: [
      "Ephemeral Docker/Firecracker isolation",
      "Synthetic edge test synthesis",
      "Canary traffic shadowing",
      "Immutable ledger attestation"
    ]
  }
];

export const verificationRuns = [
  {
    id: "VR-992",
    incidentId: "INC-8921",
    patchId: "PAT-8921",
    targetFile: "StripeWebhookHandler.java",
    status: "passed", // queued | running | passed | failed | cancelled | not_run
    passed: 14,
    failed: 0,
    skipped: 0,
    durationMs: 970,
    completedAt: "2026-11-06T09:45:00Z",
    environment: "mesh-sandbox-992 (isolated rootless Docker)",
    tests: [
      { name: "StripeWebhookHandlerTest.guestCheckoutPayloadNotNull()", status: "passed", duration: "142ms" },
      { name: "StripeWebhookHandlerTest.invoicePaidNormalUser()", status: "passed", duration: "89ms" },
      { name: "StripeWebhookHandlerTest.deadLetterQueueFallbackOnInvalidSignature()", status: "passed", duration: "210ms" },
      { name: "PaymentTransactionRegressionTest.concurrentSettlement()", status: "passed", duration: "320ms" },
      { name: "SyntheticEdgeTest.malformedCustomerPayloadDoesNotCrash()", status: "passed", duration: "115ms" },
      { name: "SyntheticEdgeTest.nullMetadataDefaultsToGuestUnknown()", status: "passed", duration: "94ms" }
    ]
  },
  {
    id: "VR-984",
    incidentId: "INC-8915",
    patchId: "PAT-8915",
    targetFile: "StockReservationService.java",
    status: "running",
    passed: 18,
    failed: 0,
    skipped: 0,
    durationMs: 1420,
    completedAt: null,
    environment: "mesh-sandbox-984 (PostgreSQL 16 isolated container)",
    tests: [
      { name: "StockReservationTest.batchAllocationSortedLocks()", status: "passed", duration: "410ms" },
      { name: "StockReservationTest.deadlockPreventionUnderConcurrency()", status: "running", duration: "890ms" }
    ]
  },
  {
    id: "VR-912",
    incidentId: "INC-8894",
    patchId: "PAT-8894",
    targetFile: "InvoiceRenderer.go",
    status: "passed",
    passed: 24,
    failed: 0,
    skipped: 0,
    durationMs: 1840,
    completedAt: "2026-11-06T07:47:19Z",
    environment: "mesh-sandbox-912 (Go 1.22 sandbox)",
    tests: [
      { name: "InvoiceRenderer_MemoryLimit_256MB", status: "passed", duration: "520ms" },
      { name: "InvoiceRenderer_StreamChunks_100Pages", status: "passed", duration: "1120ms" }
    ]
  },
  {
    id: "VR-890",
    incidentId: "INC-8760",
    patchId: "PAT-8760",
    targetFile: "AuthTokenFilter.java",
    status: "failed",
    passed: 8,
    failed: 2,
    skipped: 1,
    durationMs: 650,
    completedAt: "2026-11-05T18:22:10Z",
    environment: "mesh-sandbox-890",
    failureOutput: "AssertionError: expected HTTP 401 on expired token, got HTTP 200 (Security Invariant Violation)",
    tests: [
      { name: "AuthTokenFilterTest.expiredTokenRejected()", status: "failed", duration: "120ms", error: "Security Invariant Failure: Expected 401, got 200" },
      { name: "AuthTokenFilterTest.tamperedSignatureRejected()", status: "failed", duration: "95ms", error: "Signature bypass detected" }
    ]
  }
];

export const auditLogEntries = [
  {
    id: "AUD-1093",
    timestamp: "2026-11-06 09:44:00 UTC",
    agent: "Human Gate",
    action: "HUMAN_APPROVAL_REQUESTED",
    incident: "INC-8921",
    status: "pending",
    details: "Patch PR #891 presented to Staff SRE Lead Elena Vance. Ephemeral sandbox mesh-sandbox-992 pre-warmed.",
    hash: "0x77c2a1f0...11a"
  },
  {
    id: "AUD-1092",
    timestamp: "2026-11-06 09:43:10 UTC",
    agent: "Repair Agent",
    action: "PATCH_GENERATED",
    incident: "INC-8921",
    status: "completed",
    details: "Synthesized defensive null-safe check in StripeWebhookHandler.java:142 targeting Guest customer payload dereference.",
    hash: "0x89f2b1a9...c4e"
  },
  {
    id: "AUD-1091",
    timestamp: "2026-11-06 09:42:05 UTC",
    agent: "Investigator Agent",
    action: "ROOT_CAUSE_ISOLATED",
    incident: "INC-8921",
    status: "completed",
    details: "Correlated 5xx spike with commit e78f21c (PR #389). Identified nullable customer object in StripeWebhookPayload.",
    hash: "0x3e17b8f2...99a"
  },
  {
    id: "AUD-1090",
    timestamp: "2026-11-06 09:41:23 UTC",
    agent: "Observer Agent",
    action: "INCIDENT_DETECTED",
    incident: "INC-8921",
    status: "completed",
    details: "Detected failure spike (+420 err/sec) in payment-gateway-svc 5xx telemetry metrics. Auto-classified as critical.",
    hash: "0x91d4e0a1...2bb"
  },
  {
    id: "AUD-1089",
    timestamp: "2026-11-06 07:47:19 UTC",
    agent: "Verifier Agent",
    action: "VERIFICATION_SUCCESS",
    incident: "INC-8894",
    status: "completed",
    details: "24/24 regression tests passed in isolated container mesh-sandbox-912. Zero regression confirmed. Incident closed.",
    hash: "0x28af09c1...44f"
  }
];

export const platformSettings = {
  applicationInfo: {
    name: "SentinelMesh AI",
    version: "v4.8-prod-rc2",
    environment: "Demo Telemetry (Synthetic Ingress)",
    uptime: "99.98%"
  },
  aiProvider: {
    provider: "Gemini 1.5 Pro (Google DeepMind)",
    status: "Connected (Live Mesh)",
    latency: "140ms",
    contextWindow: "128k Tokens",
    activeOrchestratorModel: "gemini-1.5-pro-latest"
  },
  database: {
    engine: "PostgreSQL 16.2 / Citus Distributed",
    poolStatus: "Healthy (18/50 active connections)",
    immutableLedger: "Enabled (SHA-256 Attestation)"
  },
  sandbox: {
    runtime: "Docker Rootless / Firecracker MicroVM",
    isolationLevel: "cgroup v2 + seccomp (Zero Production Drift)",
    preWarmedContainers: 2
  },
  notificationPreferences: {
    slackWebhook: "https://hooks.slack.com/services/T00/B00/X00... (Configured)",
    pagerDutyRoutingKey: "pd-mesh-critical-escalation (Masked)",
    emailAlerts: "sre-oncall@sentinelmesh.internal"
  }
};
