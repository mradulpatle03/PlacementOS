const TRANSITIONS = {
  draft:     ['published'],
  published: ['open', 'draft'],
  open:      ['closed'],
  closed:    ['completed', 'open'],
  completed: [],
};

const STATUS_LABELS = {
  draft:     'Draft',
  published: 'Published',
  open:      'Open',
  closed:    'Closed',
  completed: 'Completed',
};

const canTransition = (currentStatus, newStatus) => {
  return (TRANSITIONS[currentStatus] || []).includes(newStatus);
};

const getAllowedTransitions = (currentStatus) => {
  return (TRANSITIONS[currentStatus] || []).map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
  }));
};

const validateTransition = (drive, newStatus) => {
  const errors = [];

  if (!canTransition(drive.status, newStatus)) {
    errors.push(`Cannot transition from '${drive.status}' to '${newStatus}'. Allowed: ${(TRANSITIONS[drive.status] || []).join(', ') || 'none'}`);
    return errors;
  }

  // rules per target state
  if (newStatus === 'published') {
    if (!drive.company)
      errors.push('Company is required before publishing');
    if (!drive.roles || drive.roles.length === 0)
      errors.push('At least one role is required before publishing');
    if (!drive.applicationDeadline)
      errors.push('Application deadline is required before publishing');
    if (!drive.eligibility?.allowedBranches?.length)
      errors.push('Allowed branches must be specified');
  }

  if (newStatus === 'open') {
    const deadline = new Date(drive.applicationDeadline);
    if (deadline < new Date()) {
      errors.push('Cannot open drive — application deadline has already passed');
    }
  }

  if (newStatus === 'completed') {
    if (drive.totalOffers === 0) {
      // warn but don't block — TPO may still want to mark completed
      console.log(`Warning: Drive ${drive._id} marked completed with 0 offers`);
    }
  }

  return errors;
};

module.exports = {
  canTransition,
  getAllowedTransitions,
  validateTransition,
  STATUS_LABELS,
  TRANSITIONS,
};