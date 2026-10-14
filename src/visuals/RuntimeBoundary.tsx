import { Component, type ReactNode } from 'react';

type Props = {children:ReactNode; onFailure:(message:string)=>void};
type State = {failed:boolean};

/** Keep React/WebGL rendering failure out of the surrounding race UI. */
export class RuntimeBoundary extends Component<Props, State> {
  state:State={failed:false};
  static getDerivedStateFromError():State{return {failed:true};}
  componentDidCatch(error:Error){
    this.props.onFailure(error.message || 'Unable to start the 3D renderer');
  }
  render(){
    if(this.state.failed)return null;
    return this.props.children;
  }
}
