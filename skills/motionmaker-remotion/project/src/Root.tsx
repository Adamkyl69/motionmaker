// The compositions. Size, fps and length come from props.json (written by remotion.mjs init), so the brief's numbers are the only source.
import { Composition } from "remotion";
import { Main, type MainProps } from "./Main";
import props from "../props.json";

export const RemotionRoot: React.FC = () => (
  <Composition id="Main" component={Main} width={props.width} height={props.height} fps={props.fps} durationInFrames={props.frames} defaultProps={props as MainProps} />
);
