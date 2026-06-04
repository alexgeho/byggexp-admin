export function getEntityId(record) {
  return record?._id ?? record?.id;
}

export function matchesEntityId(record, id) {
  const recordId = getEntityId(record);
  if (recordId == null || id == null) {
    return false;
  }

  return String(recordId) === String(id);
}
