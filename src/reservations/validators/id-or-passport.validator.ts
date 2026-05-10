export function validateIdNumber(idType: string, idNumber: string): boolean {
  if (idType === 'ID') return /^\d{11}$/.test(idNumber);
  if (idType === 'PASSPORT') return /^[A-Z0-9]{6,12}$/i.test(idNumber);
  return false;
}
