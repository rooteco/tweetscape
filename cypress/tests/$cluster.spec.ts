describe('Cluster PG', () => {
  it('shows the top articles for cluster', () => {
    cy.visit('/tesla');
    cy.percySnapshot('Cluster');
  });
});
