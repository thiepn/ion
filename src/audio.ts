import type { Controls, RaceSnapshot } from './simulation';

const VOLUME_KEY='ion-i16-audio-volume';
const DEFAULT_VOLUME=.5;
const clamp=(n:number,min:number,max:number)=>
  Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;

function initialVolume():number {
  try {
    const raw=localStorage.getItem(VOLUME_KEY);
    return raw===null?DEFAULT_VOLUME:clamp(Number(raw),0,1);
  } catch { return DEFAULT_VOLUME; }
}

/**
 * Opt-in, locally synthesized feedback for the ORIGINAL RaceEngine.
 * There are no samples, unlicensed assets, remote services or audio-based
 * scoring. Engine, wind, braking and one-shot cue voices use the same mix.
 */
export class RaceAudio {
  private context:AudioContext|null=null;
  private motor:OscillatorNode|null=null;
  private harmonic:OscillatorNode|null=null;
  private wind:AudioBufferSourceNode|null=null;
  private filter:BiquadFilterNode|null=null;
  private motorGain:GainNode|null=null;
  private windGain:GainNode|null=null;
  private eventBus:GainNode|null=null;
  private master:GainNode|null=null;
  private voices=new Set<OscillatorNode>();
  private previous:RaceSnapshot|null=null;
  private previousEventSerial=0;
  private on=false;
  private closed=false;
  private backgroundSuspended=false;
  private volume=initialVolume();
  private activation=0;
  private suspendTask:Promise<unknown>|null=null;

  get enabled(){return this.on;}
  get volumeLevel(){return this.volume;}

  /** StrictMode cleanup can precede the first real mount. */
  reopen(){
    if(this.closed){
      this.closed=false;
      this.previous=null;
      this.previousEventSerial=0;
      this.backgroundSuspended=false;
    }
  }

  setVolume(value:number){
    this.volume=clamp(value,0,1);
    try{localStorage.setItem(VOLUME_KEY,String(this.volume));}catch{/* local-only optional */}
    this.applyMaster();
  }

  /** Called only after an actual browser user audio gesture. */
  async enable():Promise<boolean>{
    if(this.closed)return false;
    const request=++this.activation;
    try{
      if(!this.context){
        if(typeof AudioContext==='undefined')return false;
        this.createGraph(new AudioContext());
      }
      const ctx=this.context;
      if(!ctx)return false;
      // Resume immediately in the handler's user-activation stack. If an
      // older disable() suspended late, retry only after it settles.
      await ctx.resume();
      if(this.suspendTask)await this.suspendTask;
      if(!this.closed && request===this.activation &&
         !this.backgroundSuspended && ctx.state!=='running')await ctx.resume();
      if(this.closed||request!==this.activation||
         this.context!==ctx||ctx.state!=='running')return false;
      this.on=true;
      this.applyMaster();
      this.applyMotor(this.previous);
      return true;
    }catch{
      if(request===this.activation)this.on=false;
      return false;
    }
  }

  private createGraph(ctx:AudioContext){
    const master=ctx.createGain();
    master.gain.value=0;
    master.connect(ctx.destination);

    const filter=ctx.createBiquadFilter();
    filter.type='lowpass';
    filter.frequency.value=900;
    filter.Q.value=.75;
    const motorGain=ctx.createGain();
    motorGain.gain.value=0;
    const motor=ctx.createOscillator();
    motor.type='sawtooth';
    motor.frequency.value=68;
    const harmonic=ctx.createOscillator();
    harmonic.type='triangle';
    harmonic.frequency.value=109;
    const upper=ctx.createGain();
    upper.gain.value=.19;
    motor.connect(filter);
    harmonic.connect(upper);
    upper.connect(filter);
    filter.connect(motorGain);
    motorGain.connect(master);

    // Authored procedural airflow (deterministic noise). No audio files,
    // network samples, third-party content or playback buffers persisted.
    const frameCount=Math.max(256,Math.floor(ctx.sampleRate*.65));
    const buffer=ctx.createBuffer(1,frameCount,ctx.sampleRate);
    const samples=buffer.getChannelData(0);
    let seed=0x16a0d10;
    for(let i=0;i<samples.length;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      samples[i]=((seed/4294967296)*2-1)*.38;
    }
    const wind=ctx.createBufferSource();
    wind.buffer=buffer;
    wind.loop=true;
    const windFilter=ctx.createBiquadFilter();
    windFilter.type='lowpass';
    windFilter.frequency.value=950;
    const windGain=ctx.createGain();
    windGain.gain.value=0;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    const eventBus=ctx.createGain();
    eventBus.gain.value=.9;
    eventBus.connect(master);
    motor.start();
    harmonic.start();
    wind.start();

    this.context=ctx;
    this.master=master;
    this.motor=motor;
    this.harmonic=harmonic;
    this.wind=wind;
    this.filter=filter;
    this.motorGain=motorGain;
    this.windGain=windGain;
    this.eventBus=eventBus;
  }

  private applyMaster(){
    if(!this.context||!this.master)return;
    this.master.gain.setTargetAtTime(
      this.on&&!this.backgroundSuspended?this.volume:0,
      this.context.currentTime,.025
    );
  }

  private silenceVoices(){
    for(const voice of this.voices){
      try{voice.stop();}catch{/* already stopped */}
    }
    this.voices.clear();
  }

  disable(){
    ++this.activation;
    this.on=false;
    this.silenceVoices();
    this.applyMotor(null);
    this.applyMaster();
    const ctx=this.context;
    if(ctx){
      // Suspend a muted graph. A newer enable() waits for the old task
      // before checking that its own AudioContext is running.
      this.suspendTask=ctx.suspend().catch(()=>{});
    }
  }

  /** Hidden tabs must not run the continuous audio graph. */
  setBackgroundSuspended(suspended:boolean){
    this.backgroundSuspended=suspended;
    this.applyMotor(suspended?null:this.previous);
    this.applyMaster();
    const ctx=this.context;
    if(!ctx||!this.on)return;
    if(suspended){
      this.silenceVoices();
      this.suspendTask=ctx.suspend().catch(()=>{});
    }else{
      // The context was previously unlocked by a real user gesture. If
      // autoplay policy blocks resume, the optional audio remains silent;
      // the next explicit SOUND click can re-enable it.
      const task=this.suspendTask;
      void Promise.resolve(task).then(async()=>{
        if(!this.on||this.closed||this.backgroundSuspended||
           this.context!==ctx)return;
        try{await ctx.resume();this.applyMaster();this.applyMotor(this.previous);}
        catch{/* browser may require another gesture */}
      });
    }
  }

  private applyMotor(snapshot:RaceSnapshot|null,controls?:Controls){
    const ctx=this.context;
    if(!ctx||!this.motor||!this.harmonic||!this.motorGain||
       !this.windGain||!this.filter)return;
    const now=ctx.currentTime;
    const racing=this.on&&!this.backgroundSuspended&&snapshot?.phase==='racing';
    const speed=racing?clamp(snapshot.speedKmh,0,500):0;
    const throttle=racing?clamp(controls?.throttle??0,0,1):0;
    const braking=racing?clamp(controls?.brake??0,0,1):0;
    const boosting=Boolean(racing&&(snapshot.isBoosting||snapshot.padSurge));
    const pitch=68+speed*.255+throttle*24-braking*13+(boosting?17:0);
    this.motor.frequency.setTargetAtTime(pitch,now,.075);
    this.harmonic.frequency.setTargetAtTime(pitch*(boosting?2.0:1.56),now,.085);
    this.filter.frequency.setTargetAtTime(
      560+speed*2.6+throttle*390+(boosting?460:0),now,.12);
    this.motorGain.gain.setTargetAtTime(
      racing?clamp(.025+speed*.00023+throttle*.022+(boosting?.04:0),0,.15):0,
      now,.085);
    // Audible acceleration/brake airflow without disorienting speed blur.
    this.windGain.gain.setTargetAtTime(
      racing?clamp(speed*.00015+braking*.013,0,.085):0,
      now,.17);
  }

  private cue(start:number,end:number,seconds:number,volume:number,
              wave:OscillatorType='sine'){
    const ctx=this.context;
    if(!this.on||this.backgroundSuspended||!ctx||ctx.state!=='running'||
       !this.eventBus||this.voices.size>=7)return;
    const now=ctx.currentTime;
    const voice=ctx.createOscillator();
    const envelope=ctx.createGain();
    voice.type=wave;
    voice.frequency.setValueAtTime(Math.max(20,start),now);
    voice.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+seconds);
    envelope.gain.setValueAtTime(.0001,now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.014);
    envelope.gain.exponentialRampToValueAtTime(.0001,now+seconds);
    voice.connect(envelope);
    envelope.connect(this.eventBus);
    this.voices.add(voice);
    voice.onended=()=>{
      this.voices.delete(voice);
      voice.disconnect();
      envelope.disconnect();
    };
    voice.start(now);
    voice.stop(now+seconds+.025);
  }

  update(snapshot:RaceSnapshot,controls?:Controls){
    const prior=this.previous;
    this.previous=snapshot;
    this.applyMotor(snapshot,controls);
    if(!this.on||this.backgroundSuspended||!prior)return;
    if(snapshot.phase==='finished'&&prior.phase==='racing'){
      // Only the original finish authority can award this sound.
      if(snapshot.reason==='complete'){
        this.cue(410,790,.29,.047);
        this.cue(520,1140,.59,.037,'triangle');
      }else this.cue(230,75,.44,.045,'triangle');
      return;
    }
    if(snapshot.phase==='countdown'){
      if(prior.phase==='countdown'&&snapshot.count!==prior.count&&
         snapshot.count>0&&snapshot.count<=3)
        this.cue(390,350,.11,.027,'triangle');
      return;
    }
    if(snapshot.phase!=='racing')return;
    if(prior.phase==='countdown'){
      this.cue(490,820,.28,.048);
      return;
    }
    if(prior.phase!=='racing')return;

    // Genuine immutable event serial, rather than lastSector comparison
    // that can double-fire after a lap resets the source sector fields.
    const event=snapshot.raceEvent;
    if(event&&event.serial>this.previousEventSerial){
      this.previousEventSerial=event.serial;
      if(event.kind==='lap'){
        this.cue(event.personalBest?570:460,event.personalBest?1020:820,
          .32,event.personalBest?.054:.042);
      }else if(event.kind==='sector'){
        this.cue(580,750,.14,.032);
      }
    }
    // Native earned-pad counter changes only on *physically awarded*
    // original BOOST_PAD_T traversal, and resets at real lap boundary.
    if(snapshot.lap===prior.lap&&snapshot.currentLapPads>prior.currentLapPads){
      this.cue(180,455,.23,.041,'triangle');
    }
    if(snapshot.impact>=.60&&snapshot.impact>prior.impact+.18)
      this.cue(170,72,.19,.049,'triangle');
  }

  dispose(){
    if(this.closed)return;
    this.closed=true;
    ++this.activation;
    this.on=false;
    this.silenceVoices();
    this.motor?.stop();
    this.harmonic?.stop();
    this.wind?.stop();
    this.motor?.disconnect();
    this.harmonic?.disconnect();
    this.wind?.disconnect();
    this.filter?.disconnect();
    this.motorGain?.disconnect();
    this.windGain?.disconnect();
    this.eventBus?.disconnect();
    this.master?.disconnect();
    void this.context?.close().catch(()=>{});
    this.motor=null;
    this.harmonic=null;
    this.wind=null;
    this.filter=null;
    this.motorGain=null;
    this.windGain=null;
    this.eventBus=null;
    this.master=null;
    this.context=null;
    this.previous=null;
  }
}
