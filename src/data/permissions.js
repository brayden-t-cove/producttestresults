export const PERMISSION_REGISTRY = [
  { key: 'catalog.view',   label: 'View Catalog',       group: 'Catalog' },
  { key: 'catalog.edit',   label: 'Edit Products',      group: 'Catalog' },
  { key: 'media.edit',     label: 'Edit Media & Docs',  group: 'Catalog' },
  { key: 'testing.view',   label: 'View Test Sessions', group: 'Testing' },
  { key: 'testing.create', label: 'Create Sessions',    group: 'Testing' },
  { key: 'vendors.view',   label: 'View Vendors',       group: 'Vendors' },
  { key: 'vendors.edit',   label: 'Edit Vendors',       group: 'Vendors' },
{ key: 'admin',          label: 'Admin Panel',        group: 'System' },
];

// Used as the seed when no roleDefaults exist in DB yet
export const DEFAULT_ROLE_PERMISSIONS = {
  viewer:            { 'catalog.view': true, 'testing.view': true },
  analyst:           { 'catalog.view': true, 'testing.view': true, 'vendors.view': true },
  editor:            { 'catalog.view': true, 'catalog.edit': true, 'media.edit': true, 'testing.view': true, 'testing.create': true, 'vendors.view': true, 'vendors.edit': true },
  designer:          { 'catalog.view': true, 'media.edit': true, 'testing.view': true, 'vendors.view': true },
  'project-manager': { 'catalog.view': true, 'catalog.edit': true, 'media.edit': true, 'testing.view': true, 'testing.create': true, 'vendors.view': true, 'vendors.edit': true },
  superuser:         { 'catalog.view': true, 'catalog.edit': true, 'media.edit': true, 'testing.view': true, 'testing.create': true, 'vendors.view': true, 'vendors.edit': true, 'admin': true },
};

// Compute effective permissions for a user: merge role defaults + user overrides
export function computePerms(role, userOverrides, roleDefaults) {
  const roleDef = (roleDefaults || DEFAULT_ROLE_PERMISSIONS)[role] || {};
  const result = {};
  for (const { key } of PERMISSION_REGISTRY) {
    if (userOverrides && key in userOverrides) {
      result[key] = Boolean(userOverrides[key]);
    } else {
      result[key] = Boolean(roleDef[key]);
    }
  }
  return result;
}
