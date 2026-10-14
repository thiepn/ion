import { Component, type ReactNode } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type Props={
  children:ReactNode;
  fallback:ReactNode;
  assetLabel?:string;
  /** The exact pinned local Kenney GLB basename, not an external URL. */
  asset?:string;
};
type State={failed:boolean;retries:number};

/** Scoped optional 3D asset fallback with a single bounded cache-clear retry. */
export class AssetBoundary extends Component<Props,State>{
  state:State={failed:false,retries:0};
  private retryTimer:number|undefined;
  static getDerivedStateFromError():Partial<State>{return {failed:true};}
  componentDidCatch(error:Error){
    if(import.meta.env.DEV)
      console.warn('ION 3D asset unavailable:',this.props.assetLabel??'model',error.message);
    if(!this.props.asset || this.state.retries>0)return;
    // React Three Fiber caches failed GLTF requests. Simply remounting the
    // component would rethrow the same cached error without another fetch.
    // One bounded retry handles temporary delivery failures while a genuinely
    // unavailable/corrupt asset falls back to procedural original geometry.
    useLoader.clear(GLTFLoader,'/assets/kenney/'+this.props.asset+'.glb');
    this.retryTimer=window.setTimeout(()=>{
      this.retryTimer=undefined;
      this.setState(current=>({failed:false,retries:current.retries+1}));
    },650);
  }
  componentWillUnmount(){
    if(this.retryTimer!==undefined)window.clearTimeout(this.retryTimer);
  }
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}
