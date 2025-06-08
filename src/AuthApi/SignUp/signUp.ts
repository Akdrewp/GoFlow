export enum SignupType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
  // You can keep 'null' as the initial state in your component's useState,
  // or add it here if you prefer a stricter enum-based initial state.
  // For `useState(null)`, it's common to treat null as "no selection yet".
}