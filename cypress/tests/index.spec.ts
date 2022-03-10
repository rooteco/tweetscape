describe('Index PG', () => {
  it('redirects to most recent cluster', () => {
    cy.visit('/');
    cy.url().should('eq', 'http://localhost:3000/tesla');
  });
});
