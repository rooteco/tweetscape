describe('Index PG', () => {
  it('redirects to tesla by default', () => {
    cy.visit('/');
    cy.url().should('eq', 'http://localhost:3000/clusters/tesla');
  });

  it('redirects to most recent view', () => {
    // TODO: Test that visiting a cluster view with specific filters sets the
    // `href` cookie properly which is then used by the index page to redirect.
    // @see {@link https://github.com/cypress-io/cypress/issues/19316}
    // @see {@link https://github.com/cypress-io/cypress/issues/18690}
  });
});
