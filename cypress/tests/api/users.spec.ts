describe('Users API', () => {
  it('sends descriptive errors', () => {
    cy.request({
      method: 'PATCH',
      url: '/api/users',
      failOnStatusCode: false,
    })
      .its('status')
      .should('eq', 405);
    cy.request({
      method: 'POST',
      url: '/api/users',
      failOnStatusCode: false,
    })
      .its('status')
      .should('eq', 401);
    cy.request({
      method: 'POST',
      url: '/api/users',
      failOnStatusCode: false,
      headers: { authorization: 'Bearer l0R3m_1psUm-d035Nt_w0rK' },
    })
      .its('status')
      .should('eq', 401);
  });
});
