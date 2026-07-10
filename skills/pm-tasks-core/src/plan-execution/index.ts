// Public entry for @llodev/pm-tasks-core/plan-execution.
// Re-exports the discovery helpers, the config-required error class,
// and the boundary hooks shipped in v1.9.0.

export {
  requireConfig,
  ConfigRequiredError,
  type RequireConfigOptions,
  type ConfigRequiredCode,
} from "./require-config.js";

export {
  discoverPlanTasks,
  resolvePlanRef,
  parseH3Titles,
  filenameToSlug,
  type PlanRef,
  type DiscoveredTask,
  type DiscoverPlanTasksOptions,
  type DiscoveryResult,
} from "./discover.js";

export {
  onTaskStart,
  onTaskComplete,
  __resetHookCacheForTests,
  type HookVerb,
  type HookResult,
  type OnTaskStartOptions,
  type OnTaskStartTask,
  type OnTaskCompleteOptions,
  type OnTaskCompleteTask,
} from "./hooks.js";
