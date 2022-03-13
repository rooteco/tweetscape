import '@percy/cypress';

Cypress.Commands.add('getBySel', (sel: string, ...args: any) =>
  cy.get(`[data-cy=${sel}]`, ...args)
);
Cypress.Commands.add('loading', (isLoading = true, ...args: any) => {
  if (isLoading) {
    cy.get('html', ...args).should('have.class', 'nprogress-busy');
    cy.get('#nprogress', ...args).should('exist');
  } else {
    cy.get('html', ...args).should('not.have.class', 'nprogress-busy');
    cy.get('#nprogress', ...args).should('not.exist');
  }
});

declare global {
  namespace Cypress {
    interface Chainable {
      getBySel: (sel: string, args?: any) => Chainable<JQuery<HTMLElement>>;
      loading: (isLoading?: boolean, args?: any) => Chainable<undefined>;
    }
  }
}
