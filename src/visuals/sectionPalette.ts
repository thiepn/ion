import { CIRCUIT_SECTIONS } from '../track';

/**
 * Five decorative identities sampled from the EXISTING 1,820.8m Nightshift
 * spline/section centers. Read-only visual data; no alternate course,
 * collision, sector ownership, or independent source section IDs.
 */
export const SECTION_PALETTE = {
  LAUNCH:{edge:'#7bdad8',accent:'#b5f1e5',structure:'#304f60',beacon:'#8becdf'},
  SWITCHBACK:{edge:'#d8a570',accent:'#ffca91',structure:'#574438',beacon:'#f1b97d'},
  'NORTH CREST':{edge:'#93c9f1',accent:'#d3e6ff',structure:'#334d67',beacon:'#a9d5ff'},
  DESCENT:{edge:'#eb8b72',accent:'#ffc6a0',structure:'#59413e',beacon:'#ff9b7a'},
  HOMECOMING:{edge:'#9fc5b4',accent:'#d4f2c1',structure:'#3a514f',beacon:'#b3e2c8'},
} as const;

export type SectionName=keyof typeof SECTION_PALETTE;
export function sectionVisualAt(t:number){
  if(!Number.isFinite(t)) return {...CIRCUIT_SECTIONS[0],...SECTION_PALETTE.LAUNCH};
  const normalized=((t%1)+1)%1;
  const section=CIRCUIT_SECTIONS.reduce((best,candidate)=>{
    const delta=(a:number)=>{
      const d=Math.abs(a-normalized);
      return Math.min(d,1-d);
    };
    return delta(candidate.t)<delta(best.t)?candidate:best;
  });
  return {...section,...SECTION_PALETTE[section.name]};
}
