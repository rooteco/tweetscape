import assessment from 'cypress/fixtures/assessment.json';

describe('Assessment PG', () => {
  it('shows waiting empty placeholder', () => {
    cy.seed({ skipQuestions: true }).then((ids) => {
      const url = `/assessments/${ids.assessment}?pwd=${assessment.pwd}`;
      cy.intercept('GET', `/api${url}`).as('get-assessment');
      cy.visit(url);
    });
    cy.wait('@get-assessment').its('response.statusCode').should('eq', 200);
    cy.get('.loading').should('not.exist');
    cy.get('h2').should('contain', assessment.name);
    cy.getBySel('question').should('not.exist');
    cy.contains('waiting for questions...').should('be.visible');
    cy.percySnapshot('Assessment Waiting');
  });

  it('answers assessment questions', () => {
    cy.seed().then((ids) => {
      const url = `/assessments/${ids.assessment}?pwd=${assessment.pwd}`;
      cy.intercept('GET', `/api${url}`, (req) => {
        req.on('before:response', (res) => {
          res.setDelay(500); // Give us time to screenshot fallback state.
        });
      }).as('get-assessment');
      cy.intercept('PATCH', `/api${url}`).as('update-assessment');
      cy.visit(url);
    });
    cy.get('section p.loading').should('be.visible').and('have.length', 10);
    cy.get('header h2.loading').should('be.visible').and('have.text', '');
    cy.get('header p.loading').should('be.visible').and('have.text', '');
    cy.percySnapshot('Assessment Fallback');
    cy.wait('@get-assessment').its('response.statusCode').should('eq', 200);
    cy.get('.loading').should('not.exist');
    cy.get('h2').should('contain', assessment.name);
    cy.getBySel('question').should('have.length', assessment.questions.length);
    // Asserting about all 50 questions causes Cypress to stall so I'm only
    // checking the first 5 questions and then assuming the rest are OK.
    assessment.questions.slice(0, 5).forEach((question, questionIdx) => {
      cy.getBySel('question')
        .eq(questionIdx)
        .within(() => {
          cy.get('b').should('have.text', `${questionIdx + 1}. `);
          cy.get('p').should('contain', question.question);
          cy.get('li').should('have.length', question.answers.length);
          question.answers.forEach((answer, answerIdx) => {
            cy.get('li')
              .eq(answerIdx)
              .within(() => {
                cy.get('input')
                  .should(
                    question.answer === answerIdx
                      ? 'be.checked'
                      : 'not.be.checked'
                  )
                  .and('have.attr', 'type', 'radio');
                cy.get('label').should('have.text', answer);
              });
          });
        });
    });
    cy.getBySel('question')
      .first()
      .within(() => {
        cy.get('input:not(:checked)')
          .first()
          .should('not.be.checked')
          .click()
          .should('be.checked');
        cy.wait('@update-assessment')
          .its('response.statusCode')
          .should('eq', 200);
      });
    cy.percySnapshot('Assessment');
  });

  it('requires assessment password', () => {
    cy.seed().then((ids) => {
      cy.visit(`/assessments/${ids.assessment}`);
      cy.get('.loading').should('not.exist');
      cy.contains('unauthorized - missing assessment pwd').should('be.visible');
      cy.get('h2').should('have.text', `assessment ${ids.assessment}`);
      cy.percySnapshot('Assessment Unauthorized');
    });
  });

  it('checks for valid password', () => {
    cy.seed().then((ids) => {
      const url = `/assessments/${ids.assessment}?pwd=l0R3m_1psUm`;
      cy.intercept('GET', `/api${url}`).as('get-assessment');
      cy.visit(url);
      cy.wait('@get-assessment').its('response.statusCode').should('eq', 500);
      cy.get('.loading').should('not.exist');
      cy.get('h2').should('have.text', `assessment ${ids.assessment}`);
      cy.contains('error (500) fetching assessment')
        .should('be.visible')
        .and('contain', 'No data');
      cy.percySnapshot('Assessment 500');
    });
  });
});
