describe('Cluster PG', () => {
  it('shows the top articles for cluster', () => {
    cy.visit('/clusters/ethereum').loading(false);
    cy.contains('a', 'hide retweets').should('have.class', 'underline');
    cy.contains('a', 'attention score').should('have.class', 'underline');
    cy.percySnapshot('Cluster');
    cy.get('ol.text-sm > li')
      .should('have.length', 20)
      .first()
      .within(() => {
        cy.getBySel('title')
          .should(
            'have.attr',
            'href',
            'https://www.whitehouse.gov/briefing-room/presidential-actions/' +
              '2022/03/09/executive-order-on-ensuring-responsible-development-' +
              'of-digital-assets/'
          )
          .and(
            'have.text',
            'Executive Order on Ensuring Responsible Development of Digital ' +
              'Assets | The White House'
          );
        cy.getBySel('description').should(
          'have.text',
          'By the authority vested in me as President by the Constitution ' +
            'and the laws of the United States of America, it is hereby ' +
            'ordered as follows:Section'
        );
        cy.getBySel('tweets').should('not.be.visible');
        cy.contains('button', '10 tweets').click();
        cy.getBySel('tweets')
          .should('be.visible')
          .within(() => {
            cy.get('li')
              .should('have.length', 10)
              .first()
              .within(() => {
                cy.getBySel('author').should('have.text', 'Uniswap');
                cy.getBySel('twitter').should(
                  'have.attr',
                  'href',
                  'https://twitter.com/Uniswap'
                );
                cy.getBySel('like')
                  .should(
                    'have.attr',
                    'href',
                    'https://twitter.com/intent/like?tweet_id=1501705822015045633'
                  )
                  .and('have.attr', 'target', '_blank')
                  .and('have.attr', 'rel', 'noopener noreferrer');
                cy.getBySel('reply')
                  .should(
                    'have.attr',
                    'href',
                    'https://twitter.com/intent/tweet?in_reply_to=1501705822015045633'
                  )
                  .and('have.attr', 'target', '_blank')
                  .and('have.attr', 'rel', 'noopener noreferrer');
                cy.getBySel('points')
                  .should('have.text', '369 points')
                  .and('have.attr', 'href', 'https://hive.one/p/Uniswap')
                  .and('have.attr', 'target', '_blank')
                  .and('have.attr', 'rel', 'noopener noreferrer');
                cy.getBySel('date')
                  .should(
                    'have.attr',
                    'href',
                    'https://twitter.com/Uniswap/status/1501705822015045633'
                  )
                  .and('have.attr', 'target', '_blank')
                  .and('have.attr', 'rel', 'noopener noreferrer');
                cy.getBySel('text').should(
                  'contain',
                  '🏛️ We’re excited to see the U.S. government consider crypto’s impact on the financial system and people’s lives. 🚀'
                );
              });
            cy.contains('button', 'show retweets').should('be.disabled');
            cy.contains('button', 'attention score').should(
              'have.class',
              'underline'
            );
            cy.percySnapshot('Cluster Tweets Opened');
            cy.contains('button', 'retweet count')
              .click()
              .should('have.class', 'underline');
            cy.get('li')
              .should('have.length', 10)
              .first()
              .within(() => {
                cy.getBySel('author').should('have.text', 'jchervinsky');
                cy.getBySel('text').should(
                  'contain',
                  'At long last, President Biden signed his executive order on crypto'
                );
              });
          });
      });
    cy.loading(false);
    cy.percySnapshot('Cluster Tweets Sorted');
    cy.contains('a', 'tweets count').click().should('have.class', 'underline');
    cy.url()
      .should(
        'eq',
        'http://localhost:3000/clusters/ethereum?filter=hide_retweets&sort=tweets_count'
      )
      .loading(false);
    cy.percySnapshot('Cluster Sorted');
  });

  it('shows filters and sorting from url', () => {
    cy.visit(
      '/clusters/ethereum?filter=show_retweets&sort=tweets_count'
    ).loading(false);
    cy.percySnapshot('Cluster Filtered');
  });
});
