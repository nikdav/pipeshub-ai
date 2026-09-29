import { describe, expect, it } from 'vitest';
import type { FilterSchemaField } from '../../types';
import { collectSyncFilterErrors } from '../sync-filter-save-guards';

const requiredList: FilterSchemaField = {
  name: 'spaces',
  displayName: 'Spaces',
  fieldType: 'MULTISELECT',
  filterType: 'list',
  required: true,
};

const singleSelect: FilterSchemaField = {
  name: 'project',
  displayName: 'Project',
  fieldType: 'SELECT',
  filterType: 'select',
};

describe('sync filter save validation descriptors', () => {
  it('returns stable codes and original display names for a missing required list', () => {
    expect(
      collectSyncFilterErrors([requiredList], {
        spaces: { operator: 'in', value: [] },
      }),
    ).toEqual({
      spaces: {
        code: 'syncFilterRequired',
        values: { field: 'Spaces' },
      },
    });
  });

  it('returns a count and schema display name when a select contains multiple values', () => {
    expect(
      collectSyncFilterErrors([singleSelect], {
        project: { operator: 'in', value: ['one', 'two'] },
      }),
    ).toEqual({
      project: {
        code: 'syncFilterSingleSelection',
        values: { field: 'Project', count: 2 },
      },
    });
  });

  it('returns the configured operator without formatting presentation text', () => {
    expect(
      collectSyncFilterErrors([singleSelect], {
        project: { operator: 'not_in', value: ['one'] },
      }),
    ).toEqual({
      project: {
        code: 'syncFilterUnsupportedOperator',
        values: { field: 'Project', operator: 'not_in' },
      },
    });
  });
});
