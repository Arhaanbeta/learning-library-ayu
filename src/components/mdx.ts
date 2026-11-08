/**
 * Components every lesson can use without importing them.
 * Add a new shared component here once, and every .mdx page can use it.
 * (Simulations live in src/sims/ and are imported where needed: import TugOfWar from '@sims/TugOfWar.astro'.)
 */
import KeyIdea from './KeyIdea.astro';
import Tip from './Tip.astro';
import Remember from './Remember.astro';
import Warning from './Warning.astro';
import RealWorld from './RealWorld.astro';
import Figure from './Figure.astro';
import Sim from './Sim.astro';
import Code from './Code.astro';

export const lessonComponents = { KeyIdea, Tip, Remember, Warning, RealWorld, Figure, Sim, Code };
