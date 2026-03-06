export const queryKeys = {
  user: ['user'] as const,
  models: ['models'] as const,
  params: (techName: string, version?: string) =>
    ['params', techName, version] as const,
  roles: ['roles'] as const,
  chats: ['chats'] as const,
  chatHistory: (dialogueId: string) => ['history', dialogueId] as const,
  requests: ['requests'] as const,
  dashboard: ['dashboard'] as const,
  ui: (block: string) => ['ui', block] as const,
  referrals: (period: string, level: string) =>
    ['referrals', period, level] as const,
  botInfo: ['bot-info'] as const,
  paymentLink: ['payment-link'] as const,
};
