import { ServerResponse } from 'http';

import handle from 'lib/api/handle';

describe('Handle FX', () => {
  beforeEach(() => {
    const res = {
      setHeader: cy.stub().as('header'),
      statusCode: 500,
      end: cy.stub().as('end'),
    };
    Object.defineProperty(res, 'statusCode', {
      set: cy.stub().as('status'),
    });
    cy.wrap(res).as('res');
  });

  it('handles error objects', () => {
    cy.get('@res').then((res) => {
      handle(new Error('This is an error!'), res as unknown as ServerResponse);
      cy.get('@header').should('be.calledTwice');
      cy.get('@status').should('be.calledWithExactly', 500);
      cy.get('@end').should('be.calledOnce');
    });
  });

  it('handles error strings', () => {
    cy.get('@res').then((res) => {
      handle('This is an error string!', res as unknown as ServerResponse);
      cy.get('@header').should('be.calledTwice');
      cy.get('@status').should('be.calledWithExactly', 500);
      cy.get('@end').should('be.calledOnce');
    });
  });

  it('handles unknown errors', () => {
    cy.get('@res').then((res) => {
      handle(0, res as unknown as ServerResponse);
      cy.get('@header').should('be.calledTwice');
      cy.get('@status').should('be.calledWithExactly', 500);
      cy.get('@end').should('be.calledOnce');
    });
  });
});
