/**
 * Multiuser seam (Fase 1: structure only, no real isolation yet). Every place
 * that scopes memory, local files, or sessions to "Gustavo" should reference
 * this constant instead of hardcoding a value — so that when real multiuser
 * support lands, those call sites are already the ones to change, and nothing
 * has to be hunted down. Today it does nothing except document the seam.
 */
export const CURRENT_USER_ID = "gustavo";
