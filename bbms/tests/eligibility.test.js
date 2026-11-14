const { check } = require('../src/lib/eligibility');
const { donorGroupsFor } = require('../src/lib/compat');

const base = { dob: '1995-01-01', sex: 'M', weight_kg: 70, hb: 14 };
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

test('accepts a healthy donor', () => {
  expect(check(base)).toEqual([]);
});

test('boundary: Hb 12.5 is accepted, 12.4 is deferred', () => {
  expect(check({ ...base, hb: 12.5 })).toEqual([]);
  expect(check({ ...base, hb: 12.4 })).toContain('Hb under 12.5 g/dL');
});

test('men must wait 90 days, women 120', () => {
  expect(check({ ...base, last_donation: daysAgo(60) }).length).toBe(1);
  expect(check({ ...base, sex: 'F', last_donation: daysAgo(100) }).length).toBe(1);
  expect(check({ ...base, sex: 'F', last_donation: daysAgo(121) })).toEqual([]);
});

test('O- is a compatible RBC donor for everyone', () => {
  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].forEach((p) => {
    expect(donorGroupsFor('RBC', p)).toContain('O-');
  });
});

test('AB plasma is universal', () => {
  expect(donorGroupsFor('Plasma', 'O+')).toContain('AB+');
});
