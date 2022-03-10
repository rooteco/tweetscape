describe('Assessment API', () => {
  it('sends descriptive errors', () => {
    cy.request({
      method: 'PUT',
      url: '/api/assessments/1?pwd=l0R3m_1psUm',
      failOnStatusCode: false,
    })
      .its('status')
      .should('eq', 405);
    cy.request({
      method: 'PATCH',
      url: '/api/assessments/1',
      failOnStatusCode: false,
    })
      .its('status')
      .should('eq', 401);
  });
});
