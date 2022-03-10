declare module '@cypress/code-coverage/task' {
  export default function codecov(
    on: Cypress.PluginEvents,
    config: Cypress.PluginConfigOptions
  ): void;
}
