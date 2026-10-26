// Visual estimate while awaiting authentication, not downloaded byte progress.
// Completion is controlled exclusively by the verified workspace-ready state.
export function estimateWorkspaceProgress(elapsed, verified) {
  const ceiling = verified ? 96 : 88
  return Math.min(ceiling, Math.max(1, Math.floor(1 + (ceiling - 1) * (1 - Math.exp(-Math.max(0, elapsed) / 1400)))))
}
