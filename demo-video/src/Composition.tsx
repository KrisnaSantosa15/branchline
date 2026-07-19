import { Composition } from "remotion";
import { BranchlineDemo } from "./BranchlineDemo";

export const MyComposition = () => {
  return (
    <Composition
      id="BranchlineDemo"
      component={BranchlineDemo}
      durationInFrames={2250}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
