import { Color, Material, MeshStandardMaterial } from 'three';

/**
 * Repaint an *instance* of the pinned Kenney GLB material. Preserve its
 * textures, transparencies, emissive markings and dark mechanical surfaces.
 * Never mutate or dispose shared useLoader(GLTFLoader) cache materials.
 */
export function repaintLicensedMaterial(source:Material, paint:string):Material {
  const copy=source.clone();
  if(!(copy instanceof MeshStandardMaterial) ||
     copy.transparent || copy.opacity<.99 || copy.map ||
     /glass|window|canopy|screen|light|emissive/i.test(copy.name)) return copy;
  const color=copy.color;
  // GLTFLoader provides linear RGB. Reserve the darkest metal/cavity regions
  // so a new paint color does not flatten the authored model into one blob.
  const lightness=Math.max(color.r,color.g,color.b);
  if(lightness<.115) return copy;
  const weight=lightness>=.32?.82:.52;
  color.lerp(new Color(paint),weight);
  // Metal finish is selected by the licensed material, not overwritten.
  return copy;
}
