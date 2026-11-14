const G = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const abo = (g) => g.replace(/[+-]/, '');
const RBC = {
  'O-': ['O-'], 'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'], 'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'], 'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'], 'AB+': G,
};

function canGive(component, donor, patient) {
  if (component === 'Plasma') return abo(donor) === 'AB' || abo(donor) === abo(patient);
  if (component === 'Platelets') return abo(donor) === abo(patient);
  return RBC[patient].includes(donor);
}

exports.donorGroupsFor = (component, patient) => G.filter((g) => canGive(component, g, patient));
exports.G = G;
