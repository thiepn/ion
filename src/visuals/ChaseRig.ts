import { MathUtils, PerspectiveCamera, Vector3, type Camera } from 'three';
import { nearestTrack, trackAt } from '../track';
import type { RaceEngine } from '../simulation';

type CameraMode='CHASE'|'NEAR';
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
    const modeChanged=this.lastMode!==mode;
    this.lastMode=mode; this.oldPhase=phase;

    // The pose should not teleport on showroom/race transitions, but on a fresh
    // start the camera seeds its smoothed look target to the actual vehicle.
    if(!this.initialised || (menu&&phaseChanged)){
      this.focus.copy(game.position);
      this.heading=angle;
      this.initialised=true;
    }
    const blend=1-Math.exp(-dt*(reducedMotion?7.5:3.4));
    const sin=Math.sin(angle),cos=Math.cos(angle);
    const distance=(mode==='NEAR'?8.8:18.5)+(reducedMotion?0:speed*2.8);
    const height=mode==='NEAR'?4.5:9.4;
    const bend=Math.atan2(Math.sin(angle-this.heading),Math.cos(angle-this.heading));
    this.heading+=bend*(1-Math.exp(-dt*7));
    // Use the actual next section of the authored course to anticipate bends.
    const lookahead=trackAt((game.previousT + (.015+speed*.013))%1);
    tmpAhead.set(lookahead.position.x-game.position.x,0,lookahead.position.z-game.position.z);
    const curveInfluence=Math.min(speed*.13,.13);
    const sidestep=reducedMotion?0:MathUtils.clamp(game.roll*9,-1.7,1.7);
    const directionalX=Math.sin(this.heading)*distance;
    const directionalZ=Math.cos(this.heading)*distance;

    if(orbit){
      const spin=time*.21;
      tmpPosition.set(game.position.x+Math.sin(spin)*13,
        game.position.y+6.5,game.position.z+Math.cos(spin)*13);
      tmpLook.set(game.position.x,game.position.y+.45,game.position.z);
    }else{
      tmpPosition.set(
        game.position.x-directionalX+cos*sidestep,
        game.position.y+height+(reducedMotion?0:Math.min(game.impact*.3,.3)),
        game.position.z-directionalZ-sin*sidestep,
      );
      tmpLook.set(
        game.position.x+sin*(mode==='NEAR'?13:17)+tmpAhead.x*curveInfluence,
        game.position.y+1.9,
        game.position.z+cos*(mode==='NEAR'?13:17)+tmpAhead.z*curveInfluence,
      );
    }
    const cameraLerp=1-Math.exp(-dt*(modeChanged?4:reducedMotion?13:5.5));
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
        camera.position.y=Math.max(camera.position.y,ground.y+2.15);
      }
    }
    this.focus.lerp(tmpLook,blend);
    camera.lookAt(this.focus);

    // Speed communicates acceleration without full-screen blur or head-bobbing.
    if(camera instanceof PerspectiveCamera){
      const fov=(mode==='NEAR'?69:65)
        +(reducedMotion?2:speed*11)
        +(game.isBoosting && !reducedMotion?4:0);
      const nextFov=MathUtils.damp(camera.fov,fov,3.8,dt);
      if(Math.abs(nextFov-camera.fov)>.015){
        camera.fov=nextFov;
        camera.updateProjectionMatrix();
      }
    }
  }
}
