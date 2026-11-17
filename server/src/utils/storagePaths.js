export function publicUploadUrl(value) {
  if(typeof value!=='string')return value;
  const normalized=value.replaceAll('\\','/');
  if(normalized.startsWith('server/uploads/'))return '/'+normalized.slice(7);
  if(normalized.startsWith('uploads/'))return '/'+normalized;
  return normalized;
}
