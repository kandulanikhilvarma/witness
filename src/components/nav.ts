// Shared nav data. Plain module (no "use client") so both the server shell and
// the client NavLinks can import the array itself, not a client reference.
export const NAV = [
  { href: "/about", label: "About" },
  { href: "/taxonomy", label: "Taxonomy" },
  { href: "/transparency", label: "Transparency" },
  { href: "/model-card", label: "Model card" },
];
