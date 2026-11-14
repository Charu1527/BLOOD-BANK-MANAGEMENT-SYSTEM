exports.check = (d, today = new Date()) => {
  const reasons = [];
  const age = Math.floor((today - new Date(d.dob)) / 31557600000);
  if (age < 18 || age > 65) reasons.push('Age must be 18 to 65');
  if (Number(d.weight_kg) < 45) reasons.push('Weight under 45 kg');
  if (Number(d.hb) < 12.5) reasons.push('Hb under 12.5 g/dL');
  if (d.last_donation) {
    const gap = Math.floor((today - new Date(d.last_donation)) / 86400000);
    const need = d.sex === 'M' ? 90 : 120;
    if (gap < need) reasons.push('Only ' + gap + ' days since last donation (needs ' + need + ')');
  }
  return reasons;
};
