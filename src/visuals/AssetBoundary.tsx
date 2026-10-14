import { Component, type ReactNode } from 'react';

type Props={
  children:ReactNode;
  fallback:ReactNode;
  assetLabel?:string;
};
type State={failed:boolean};

/**
 * Decorational GLB errors should not destroy an otherwise playable race.
 * Keep the original PBR craft as fallback if the optional Rift GLB fails.
 * Errors are scoped to model loading, never to physics/score mutations.
 */
export class AssetBoundary extends Component<Props,State>{
  state:State={failed:false};
  static getDerivedStateFromError():State{return {failed:true};}
  componentDidCatch(error:Error){
    if(import.meta.env.DEV){
      console.warn('ION 3D asset unavailable:',this.props.assetLabel??'model',error.message);
    }
  }
  render(){
    return this.state.failed?this.props.fallback:this.props.children;
  }
}
