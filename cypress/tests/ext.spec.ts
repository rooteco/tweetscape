import assessment from 'cypress/fixtures/assessment.json';

describe('Firefox EXT', () => {
  it('syncs assessment with backend', () => {
    if (!Cypress.isBrowser({ family: 'firefox' })) return;
    cy.seed({ skipQuestions: true }).then((ids) => {
      cy.visit('/schoology');
      /* eslint-disable promise/no-nesting */
      cy.window().then((win) => {
        const listener = cy.stub().as('message');
        win.addEventListener('message', (evt) => listener(evt.data));
        win.postMessage({ id: ids.assessment, pwd: assessment.pwd });
        cy.get('@message')
          .should('be.calledWithExactly', 'THAVMA_EXT_ACTIVE')
          .then(() => {
            win.postMessage('CYPRESS_SIMULATE_EXT_CLICK');
            cy.get('@message').should(
              'be.calledWithExactly',
              'THAVMA_EXT_GOT_QS'
            );
          });
      });
      cy.get('#thavma').should('exist').and('be.hidden');
      cy.percySnapshot('Extension Hidden');
      // Currently, Cypress doesn't have a `.hover()` cmd so I have to do this:
      // @see {@link https://docs.cypress.io/api/commands/hover}
      cy.get('#thavma')
        .invoke('css', 'opacity', 1)
        .should('be.visible')
        .and('contain', '1. (1) undefined');
      cy.percySnapshot('Extension Empty');
      const url = `/api/assessments/${ids.assessment}?pwd=${assessment.pwd}`;
      cy.request(url).as('assessment');
      cy.get('@assessment').its('status').should('eq', 200);
      cy.get('@assessment')
        .its('body')
        .should('have.property', 'questions')
        .and(
          'deep.equal',
          assessment.questions.map((q) => ({ ...q, answer: null }))
        );
      cy.request('PATCH', url, { questions: assessment.questions })
        .its('status')
        .should('eq', 200);
      assessment.questions.forEach(({ answers, answer }, questionIdx) => {
        cy.get('#thavma')
          .should('not.contain', `${questionIdx + 1}. (1) undefined`)
          .and(
            'contain',
            `${questionIdx + 1}. (${answer + 1}) ${answers[answer]}`
          );
      });
      cy.percySnapshot('Extension Full');
    });
  });
});
