import path from 'path';

export const specName = path.basename(Cypress.spec.name, '.spec.ts');

export class Screenshot {
  private name = '';
  private index: number = 0;

  constructor(name?: string) {
    this.name = name || specName;
  }

  public take(): void {
    const name = `${ this.name }_${ this.index }`;

    cy.screenshot(name, {
      capture:   'runner',
      scale:     true,
      overwrite: true
    });

    this.index++;
  }
}
