import { describe, expect, it } from 'vitest';
import { applyTerminology } from '../terminology';

describe('applyTerminology (Projekt → Order)', () => {
  it('swedish', () => {
    expect(applyTerminology('sv', 'Projekt')).toBe('Order');
    expect(applyTerminology('sv', 'Lägg till projekt')).toBe('Lägg till order');
    expect(applyTerminology('sv', 'Projektledare')).toBe('Orderansvarig');
    expect(applyTerminology('sv', 'Skapa ett projekt')).toBe('Skapa en order');
    expect(applyTerminology('sv', 'Inget projekt valt')).toBe('Ingen order valt');
    expect(applyTerminology('sv', 'Projektets kostnader')).toBe('Orderns kostnader');
  });
  it('english', () => {
    expect(applyTerminology('en', 'Add project')).toBe('Add order');
    expect(applyTerminology('en', 'Projects')).toBe('Orders');
    expect(applyTerminology('en', 'Create a project')).toBe('Create an order');
  });
  it('norwegian + russian', () => {
    expect(applyTerminology('nb', 'Prosjektleder')).toBe('Ordreansvarlig');
    expect(applyTerminology('ru', 'Проекты')).toBe('Заказы');
  });
  it('leaves other text', () => {
    expect(applyTerminology('sv', 'Arbetspass')).toBe('Arbetspass');
    expect(applyTerminology('xx', 'Projekt')).toBe('Projekt');
  });
});
