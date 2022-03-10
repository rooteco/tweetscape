import codes from 'cypress/fixtures/codes.json';
import user from 'cypress/fixtures/user.json';

describe('Join PG', () => {
  beforeEach(() => {});

  it('redirects to / when logged in', () => {
    cy.seed();
    cy.login(user);
    cy.visit('/join');
    cy.url().should('eq', 'http://localhost:3000/');
  });

  it('redirects to specified page', () => {
    cy.seed();
    cy.login(user);
    cy.visit(`/join?r=${encodeURIComponent('/assessments?q=p')}`);
    cy.url().should('eq', 'http://localhost:3000/assessments?q=p');
  });

  it('verifies invite codes', () => {
    cy.seed({ skipUser: true });
    cy.visit('/join', {
      onBeforeLoad(win: Window) {
        cy.stub(win, 'open');
      },
    });
    cy.percySnapshot('Join');
    cy.get('input[placeholder="invite code"]')
      .as('input')
      .type('l0R3m_1psUm-d035Nt_w0rK{enter}')
      .should('be.disabled')
      .and('have.css', 'cursor', 'wait')
      .loading();
    cy.loading(false).get('@input').should('have.class', 'error');
    cy.percySnapshot('Join Error');
    cy.contains('button', 'request access')
      .click()
      .should('be.disabled')
      .and('have.css', 'cursor', 'wait')
      .loading();
    cy.loading(false)
      .get('@input')
      .should('have.class', 'error')
      .clear()
      .type(`${codes[0].id}{enter}`)
      .should('have.value', codes[0].id)
      .and('be.disabled')
      .and('have.css', 'cursor', 'wait')
      .loading();
    cy.percySnapshot('Join Loading');
    cy.window()
      .its('open')
      .should('be.calledOnce')
      .and(
        'be.calledWithExactly',
        `http://localhost:3000/pay?r=%2F&code=${codes[0].id}`
      );
  });
});
