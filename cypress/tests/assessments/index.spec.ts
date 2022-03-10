import { Assessment } from 'lib/model';

import assessment from 'cypress/fixtures/assessment.json';
import codes from 'cypress/fixtures/codes.json';
import user from 'cypress/fixtures/user.json';

describe('Assessments PG', () => {
  it('redirects to /join when logged out', () => {
    cy.visit('/assessments');
    cy.url().should('eq', 'http://localhost:3000/join?r=%2Fassessments');
  });

  it('shows fallback during login', () => {
    cy.seed({ skipUser: true, skipCode: true });
    cy.visit(`/assessments#access_token=l0R3m_1psUm?code=${codes[1].id}`);
    cy.get('dt.loading').should('be.visible');
    cy.get('dd.loading').should('be.visible');
    cy.percySnapshot('Assessments Fallback');
  });

  it('prompts to install extension', () => {
    if (!Cypress.isBrowser({ family: 'firefox' })) return;
    cy.intercept(
      'POST',
      `${Cypress.env().NEXT_PUBLIC_SUPABASE_URL as string}/rest/v1/assessments`
    ).as('create-assessment');
    cy.intercept(
      'GET',
      `${
        Cypress.env().NEXT_PUBLIC_SUPABASE_URL as string
      }/rest/v1/assessments?select=*&order=date.desc.nullslast`
    ).as('get-assessments');
    cy.seed({ skipAssessment: true });
    cy.login(user);
    cy.visit('/assessments', {
      onBeforeLoad(win: Window) {
        cy.stub(win, 'postMessage');
      },
    });
    cy.get('dt.loading').should('be.visible');
    cy.get('dd.loading').should('be.visible');
    cy.wait('@get-assessments');
    cy.get('.loading').should('not.exist');
    cy.get('input[placeholder="ex: chapter 6 psych test"]')
      .as('assessment-input')
      .type(`${assessment.name}{enter}`)
      .should('have.value', assessment.name)
      .and('be.disabled')
      .and('have.css', 'cursor', 'wait')
      .loading();
    cy.wait('@create-assessment').as('assessment');
    cy.get('@assessment').its('response.statusCode').should('eq', 201);
    cy.get('@assessment')
      .its('response.body')
      .then((body: Assessment[]) => {
        cy.window()
          .its('postMessage')
          .should('be.calledWithExactly', { id: body[0].id, pwd: body[0].pwd });
        cy.contains('no assessments to show').should('not.exist');
        cy.contains('dd', assessment.name).should('be.visible');
        cy.contains('.dialog', 'install THAVMA’s Firefox extension')
          .should('be.visible')
          .within(() => {
            cy.contains('a', 'install Firefox')
              .should('be.visible')
              .and(
                'have.attr',
                'href',
                'https://mozilla.org/firefox/download/thanks'
              );
            cy.contains('a', 'install extension')
              .should('be.visible')
              .and('have.attr', 'href', '/ext/latest.xpi');
            cy.contains('button', 'verify installation')
              .should('be.visible')
              .click();
          });
        cy.window()
          .its('postMessage')
          .should('be.calledWithExactly', { id: body[0].id, pwd: body[0].pwd });
        cy.get('.dialog').should('be.visible');
        cy.percySnapshot('Assessments Install');
      });
  });

  it('creates and shows assessments', () => {
    if (!Cypress.isBrowser({ family: 'firefox' })) return;
    cy.intercept(
      'POST',
      `${Cypress.env().NEXT_PUBLIC_SUPABASE_URL as string}/rest/v1/assessments`
    ).as('create-assessment');
    cy.intercept(
      'GET',
      `${
        Cypress.env().NEXT_PUBLIC_SUPABASE_URL as string
      }/rest/v1/assessments?select=*&order=date.desc.nullslast`
    ).as('get-assessments');
    cy.seed({ skipAssessment: true });
    cy.login(user);
    cy.visit('/assessments', {
      onBeforeLoad(win: Window) {
        cy.spy(win, 'postMessage');
      },
    });
    cy.get('dt.loading').should('be.visible');
    cy.get('dd.loading').should('be.visible');
    cy.wait('@get-assessments');
    cy.get('.loading').should('not.exist');
    cy.contains('no assessments to show').should('be.visible');
    cy.percySnapshot('Assessments Empty');
    cy.get('input[placeholder="ex: chapter 6 psych test"]')
      .as('assessment-input')
      .type(' {enter}')
      .should('have.value', ' ')
      .and('be.disabled')
      .and('have.css', 'cursor', 'wait')
      .loading();
    cy.wait('@create-assessment').its('response.statusCode').should('eq', 400);
    cy.get('@assessment-input').should('have.class', 'error');
    cy.get('@assessment-input')
      .clear()
      .type(assessment.name)
      .should('have.value', assessment.name);
    cy.contains('button', 'create')
      .click()
      .should('be.disabled')
      .and('have.css', 'cursor', 'wait')
      .loading();
    cy.wait('@create-assessment').as('assessment');
    cy.get('@assessment').its('response.statusCode').should('eq', 201);
    cy.get('@assessment')
      .its('response.body')
      .then((body: Assessment[]) => {
        cy.window()
          .its('postMessage')
          .should('be.calledWithExactly', { id: body[0].id, pwd: body[0].pwd });
        /* eslint-disable-next-line promise/no-nesting */
        cy.window().then((win) => {
          const listener = cy.stub().as('message');
          win.addEventListener('message', (evt) => listener(evt.data));
        });
        cy.get('@message').should('be.calledWithExactly', 'THAVMA_EXT_ACTIVE');
      });
    cy.contains('no assessments to show').should('not.exist');
    cy.contains('dd', assessment.name).should('be.visible');
    cy.contains('.dialog', 'you’re all setup').should('be.visible');
    cy.percySnapshot('Assessments Agree');
    cy.contains('button', 'i agree not to raise my test average').click();
    cy.get('.dialog').should('not.exist');
    cy.get('select[aria-label="Theme"]')
      .as('theme-select')
      .should('have.value', 'system')
      .select('dark');
    cy.percySnapshot('Assessments Dark');
    cy.get('@theme-select').select('light');
    cy.percySnapshot('Assessments Light');
    cy.get('@theme-select').select('system');
    cy.seed({ skipAssessment: true });
    cy.get('dd').should('not.exist');
    cy.contains('no assessments to show').should('be.visible');
  });
});
