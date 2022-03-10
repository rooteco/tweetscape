import '@cypress/code-coverage/support';
import '@percy/cypress';

import { StripeElementType } from '@stripe/stripe-js';
import { createClient } from '@supabase/supabase-js';

import { Overrides } from 'cypress/plugins';

const supabase = createClient(
  Cypress.env().NEXT_PUBLIC_SUPABASE_URL,
  Cypress.env().NEXT_PUBLIC_SUPABASE_KEY
);

Cypress.Commands.add('getStripeEl', (type: StripeElementType | 'postalCode') =>
  cy
    .get('iframe')
    .its('0.contentDocument.body')
    .should('not.be.empty')
    .then((el) => cy.wrap(el))
    .find(`input[data-elements-stable-field-name="${type}"]`)
);
Cypress.Commands.add(
  'seed',
  (overrides?: Overrides) =>
    cy.task('seed', overrides) as unknown as Cypress.Chainable<{
      assessment?: number;
    }>
);
Cypress.Commands.add(
  'login',
  (u: { email: string; password: string }) =>
    supabase.auth.signIn(u) as unknown as Cypress.Chainable<null>
);
Cypress.Commands.add('getBySel', (selector: string, ...args: any) =>
  cy.get(`[data-cy=${selector}]`, ...args)
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
      getBySel: (
        selector: string,
        args?: any
      ) => Chainable<JQuery<HTMLElement>>;
      getStripeEl: (
        type: StripeElementType | 'postalCode'
      ) => Chainable<JQuery<HTMLElement>>;
      loading: (isLoading?: boolean, args?: any) => Chainable<undefined>;
      login: (user: { email: string; password: string }) => Chainable<null>;
      seed: (overrides?: Overrides) => Chainable<{ assessment?: number }>;
    }
  }
}
