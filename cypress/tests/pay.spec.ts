import user from 'cypress/fixtures/user.json';

function error(msg: string | false): void {
  if (msg) {
    cy.get('#card').should('have.class', 'error');
    cy.get('p.error').should('be.visible').and('contain', msg);
  } else {
    cy.get('#card').should('not.have.class', 'error');
    cy.get('.error').should('not.exist');
  }
}

describe('Pay PG', () => {
  it('redirects to /join when user does not exist', () => {
    cy.seed({ skipUser: true });
    cy.login(user);
    cy.visit('/pay');
    cy.url().should('eq', 'http://localhost:3000/join?r=%2F');
  });

  it('collects credit cards', () => {
    cy.intercept('GET', '/api/pay').as('get-pay');
    cy.seed({ skipAccess: true });
    cy.login(user);
    const redirect = '/assessments?a=b&c=d';
    cy.visit(`/pay?r=${encodeURIComponent(redirect)}`);
    cy.get('#card')
      .should('have.class', 'StripeElement')
      .children('div')
      .should('exist')
      .and('be.visible')
      .and('have.length', 1);
    cy.percySnapshot('Pay');
    // Disabling chromeWebSecurity and accessing cross-origin iframes (like the
    // Stripe Element) is only supported in Chromium-based browsers.
    // @see {@link https://github.com/cypress-io/cypress/issues/136}
    if (!Cypress.isBrowser({ family: 'chromium' })) return;
    cy.getStripeEl('cardNumber').type('1111111111111111');
    error('Your card number is invalid.');
    cy.percySnapshot('Pay Card Invalid');
    cy.getStripeEl('cardNumber').clear().type('4242424242424242');
    error(false);
    cy.percySnapshot('Pay Card Valid');
    cy.getStripeEl('cardExpiry').type('1111');
    error("Your card's expiration year is in the past.");
    cy.percySnapshot('Pay Expiry Invalid');
    cy.getStripeEl('cardExpiry').type('{backspace}{backspace}22');
    error(false);
    cy.percySnapshot('Pay Expiry Valid');
    cy.getStripeEl('cardCvc').type('12');
    cy.focused().blur();
    error("Your card's security code is incomplete.");
    cy.percySnapshot('Pay CVC Invalid');
    cy.getStripeEl('cardCvc').type('3').should('have.value', '123');
    cy.focused().blur();
    error(false);
    cy.percySnapshot('Pay CVC Valid');
    cy.contains('button', 'gain access')
      .click()
      .should('be.disabled')
      .loading();
    cy.percySnapshot('Pay Loading');
    cy.wait('@get-pay').its('response.statusCode').should('eq', 201);
    cy.loading(false);
    error('Your postal code is incomplete.');
    cy.getStripeEl('postalCode').type('94303{enter}');
    cy.get('#card').should('have.class', 'disabled').loading();
    cy.wait('@get-pay').its('response.statusCode').should('eq', 201);
    cy.loading(false);
    cy.url().should('eq', `http://localhost:3000${redirect}`);
  });
});
