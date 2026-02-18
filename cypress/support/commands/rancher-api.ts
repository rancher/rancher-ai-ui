/**
 * Gets a Rancher resource via the Rancher API
 *
 * Note: this is overriding the default implementation in @rancher/cypress
 * to remove the dev host from the request URL.
 *
 * @param prefix The API prefix (e.g., 'v1')
 * @param resourceType The type of the resource (e.g., 'ai.cattle.io.aiagentconfig')
 * @param resourceId The ID of the resource to get (e.g., 'cattle-ai-agent-system/harvester')
 * @param expectedStatusCode The expected HTTP status code of the response (default: 200)
 * @return The response object from the API call
 */
Cypress.Commands.add('getRancherResource', (prefix, resourceType, resourceId?, expectedStatusCode = 200) => {
  return cy.getCookie('CSRF').then((token) => {
    let url = `/${ prefix }/${ resourceType }`;

    if (resourceId) {
      url += `/${ resourceId }`;
    }

    return cy.request({
      method:  'GET',
      url,
      headers: {
        'x-api-csrf': token.value,
        Accept:       'application/json'
      },
    }).then((resp) => {
      if (expectedStatusCode) {
        expect(resp.status).to.eq(expectedStatusCode);
      }

      return resp;
    });
  });
});

/**
 * Creates a Rancher resource via the Rancher API.
 *
 * Note: this is overriding the default implementation in @rancher/cypress
 * to remove the dev host from the request URL.
 *
 * @param prefix The API prefix (e.g., 'v1')
 * @param resourceType The type of the resource (e.g., 'ai.cattle.io.aiagentconfig')
 * @param body The JSON stringified body of the resource to create
 * @param failOnStatusCode Whether to fail the test on non-2xx status codes (default: true)
 */
Cypress.Commands.add('createRancherResource', (prefix, resourceType, body, failOnStatusCode = true) => {
  return cy.getCookie('CSRF').then((token) => {
    return cy.request({
      method:  'POST',
      url:     `/${ prefix }/${ resourceType }`,
      headers: {
        'x-api-csrf': token.value,
        Accept:       'application/json'
      },
      body,
      failOnStatusCode
    }).then((resp) => {
      if (failOnStatusCode) {
        // Expect 200 or 201, Created HTTP status code
        expect(resp.status).to.be.oneOf([200, 201]);
      }
    });
  });
});

/**
 * Updates a Rancher resource via the Rancher API.
 *
 * Note: this is overriding the default implementation in @rancher/cypress
 * to remove the dev host from the request URL.
 *
 * @param prefix The API prefix (e.g., 'v1')
 * @param resourceType The type of the resource (e.g., 'ai.cattle.io.aiagentconfig')
 * @param resourceId The ID of the resource to update (e.g., 'cattle-ai-agent-system/harvester')
 * @param body The JSON stringified body of the resource to update
 */
Cypress.Commands.add('setRancherResource', (prefix, resourceType, resourceId, body) => {
  return cy.getCookie('CSRF').then((token) => {
    return cy.request({
      method:  'PUT',
      url:     `/${ prefix }/${ resourceType }/${ resourceId }`,
      headers: {
        'x-api-csrf': token.value,
        Accept:       'application/json'
      },
      body
    }).then((resp) => {
      expect(resp.status).to.eq(200);

      return resp;
    });
  });
});

/**
 * Deletes a Rancher resource via the Rancher API.
 *
 * Note: this is overriding the default implementation in @rancher/cypress
 * to remove the dev host from the request URL.
 *
 * @param prefix The API prefix (e.g., 'v1')
 * @param resourceType The type of the resource (e.g., 'ai.cattle.io.aiagentconfig')
 * @param resourceId The ID of the resource to delete (e.g., 'cattle-ai-agent-system/harvester')
 * @param failOnStatusCode Whether to fail the test on non-2xx status codes (default: true)
 */
Cypress.Commands.add('deleteRancherResource', (prefix, resourceType, resourceId, failOnStatusCode = true) => {
  return cy.getCookie('CSRF').then((token) => {
    return cy.request({
      method:  'DELETE',
      url:     `/${ prefix }/${ resourceType }/${ resourceId }`,
      headers: {
        'x-api-csrf': token.value,
        Accept:       'application/json'
      },
      failOnStatusCode,
    }).then((resp) => {
      if (failOnStatusCode) {
        expect(resp.status).to.be.oneOf([200, 204]);
      }
    });
  });
});
