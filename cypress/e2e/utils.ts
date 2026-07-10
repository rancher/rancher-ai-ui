import path from 'path';

export function getSpecName(): string {
  return path.basename(Cypress.spec.name, '.spec.ts');
}

export class Screenshot {
  private name = '';
  private index: number = 0;

  constructor(name?: string) {
    this.name = name || getSpecName();
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
