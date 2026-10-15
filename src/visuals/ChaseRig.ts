import { MathUtils, PerspectiveCamera, Vector3, type Camera } from 'three';
import { nearestTrack, RAIL_INNER_OFFSET, trackAt } from '../track';
import type { RaceEngine } from '../simulation';

type CameraMode='CHASE'|'NEAR';
export type ShowcaseView='THREE_QUARTER'|'SIDE'|'REAR';
const tmpPosition=new Vector3();
const tmpLook=new Vector3();
const tmpAhead=new Vector3();

/** A single frame-rate-independent camera authority. No gameplay mutations. */
export class ChaseRig {
  private focus=new Vector3();
  private initialised=false;
  private oldPhase='';
  private lastMode='';
  private heading=0;
  private previousVehicle=new Vector3();
  private recoverySerial=0;
  reset(){this.initialised=false;this.oldPhase='';this.lastMode='';}
  update(
    camera:Camera,game:RaceEngine,delta:number,
    mode:CameraMode,showcase:boolean,time:number,reducedMotion:boolean,
    view:ShowcaseView='THREE_QUARTER',
  ){
    const dt=Math.min(.08,Math.max(0,delta));
    const speed=Math.min(1,game.speed/105);
    const phase=game.phase;
    const menu=phase==='menu';
    const orbit=showcase&&menu;
    const angle=game.heading;
    const firstFrame=!this.initialised;
    const phaseChanged=this.oldPhase!==phase;
    const recovered=!firstFrame && this.recoverySerial!==game.recoveryCount;
    const restarted=!firstFrame && phaseChanged && phase==='countdown';
    const teleported=!firstFrame && (
      recovered || restarted ||
      this.previousVehicle.distanceToSquared(game.position)>38*38
    );
    this.previousVehicle.copy(game.position);
    this.recoverySerial=game.recoveryCount;
    const cameraPreset=orbit?mode+':'+view:mode;
    const modeChanged=this.lastMode!==cameraPreset;
    this.lastMode=cameraPreset; this.oldPhase=phase;

    // The pose should not teleport on showroom/race transitions, but on a fresh
    // start the camera seeds its smoothed look target to the actual vehicle.
    if(!this.initialised || (menu&&phaseChanged)){
      this.focus.copy(game.position);
      this.heading=angle;
      this.initialised=true;
    }
    // A fast, stable chase focus lets the player read turning response
    // immediately instead of fighting the previous lagging float camera.
    const blend=1-Math.exp(-dt*(reducedMotion?11:7.2));
    const sin=Math.sin(angle),cos=Math.cos(angle);
    const distance=(mode==='NEAR'?7.8:13.8)+(reducedMotion?0:speed*1.3);
    const height=mode==='NEAR'?3.9:6.8;
    const bend=Math.atan2(Math.sin(angle-this.heading),Math.cos(angle-this.heading));
    this.heading+=bend*(1-Math.exp(-dt*10.5));
    // Use the actual next section of the authored course to anticipate bends.
    const lookahead=trackAt((game.previousT + (.015+speed*.013))%1);
    tmpAhead.set(lookahead.position.x-game.position.x,0,lookahead.position.z-game.position.z);
    const curveInfluence=Math.min(speed*.08,.08);
    const sidestep=reducedMotion?0:MathUtils.clamp(game.roll*3.5,-.6,.6);
    const directionalX=Math.sin(this.heading)*distance;
    const directionalZ=Math.cos(this.heading)*distance;

    if(orbit){
      // Stable inspection angles instead of an uncontrolled full 360°
      // orbit. A tiny reduced-motion-aware sway retains presence without
      // hiding the selected paint or presenting the rear as the front.
      const anchor=view==='SIDE'?Math.PI/2:
        view==='REAR'?Math.PI:.82;
      const spin=anchor+(reducedMotion?0:Math.sin(time*.23)*.055);
      const r=10.8;
      tmpPosition.set(game.position.x+Math.sin(spin)*r,
        game.position.y+5.1,game.position.z+Math.cos(spin)*r);
      // Shift focus toward the menu rather than hiding the real vehicle
      // behind the left-hand customization controls. This is optical only.
      const aspect=camera instanceof PerspectiveCamera?camera.aspect:1.6;
      const shift=aspect>=1.15?Math.min(5.1,(aspect-1)*6):.35;
      tmpLook.set(game.position.x-Math.cos(spin)*shift,
        game.position.y+.35,
        game.position.z+Math.sin(spin)*shift);
    }else{
      tmpPosition.set(
        game.position.x-directionalX+cos*sidestep,
        game.position.y+height+(reducedMotion?0:Math.min(game.impact*.3,.3)),
        game.position.z-directionalZ-sin*sidestep,
      );
      tmpLook.set(
        game.position.x+sin*(mode==='NEAR'?11:15)+tmpAhead.x*curveInfluence,
        game.position.y+1.9,
        game.position.z+cos*(mode==='NEAR'?11:15)+tmpAhead.z*curveInfluence,
      );
    }
    const cameraLerp=1-Math.exp(-dt*(modeChanged?7:reducedMotion?14:9));
    // Recovery and grid restart move the craft instantly. Snap the camera
    // too, instead of flying the camera through buildings for several seconds.
    if(firstFrame||teleported){
      camera.position.copy(tmpPosition);
      this.focus.copy(tmpLook);
      this.heading=angle;
    }else{
      camera.position.lerp(tmpPosition,cameraLerp);
    }
    // Clamp the chase camera above nearby road height when cresting a hill
    // or following a tight bend. The collision spline remains unchanged.
    if(!orbit){
      const ground=nearestTrack(camera.position.x,camera.position.z,game.previousT);
      if(ground.distance<25){
        // The old clamp handled height only; on a tightening bend the chase
        // camera could interpolate *through* the newly upright side wall.
        // Keep the camera optical center on the inner deck and above it.
        const lateralLimit=RAIL_INNER_OFFSET-1.7;
        const lateral=Math.max(-lateralLimit,Math.min(lateralLimit,ground.lateral));
        const correction=lateral-ground.lateral;
        camera.position.x+=ground.rightX*correction;
        camera.position.z+=ground.rightZ*correction;
        camera.position.y=Math.max(camera.position.y,ground.y+2.7);
      }
    }
    this.focus.lerp(tmpLook,blend);
    camera.lookAt(this.focus);

    // Speed communicates acceleration without full-screen blur or head-bobbing.
    if(camera instanceof PerspectiveCamera){
      const fov=(mode==='NEAR'?64:63)
        +(reducedMotion?1:speed*7)
        +(game.isBoosting && !reducedMotion?2:0);
      const nextFov=MathUtils.damp(camera.fov,fov,3.8,dt);
      if(Math.abs(nextFov-camera.fov)>.015){
        camera.fov=nextFov;
        camera.updateProjectionMatrix();
      }
    }
  }
}
