import { GridVignetteBackground } from "@/components/ui/vignette-grid-background";
import { Button } from "@/components/ui/button";

export default function DemoOne() {
  return (
    <div className="flex items-center justify-center">
      <GridVignetteBackground
        className="opacity-80"
        x={50}
        y={50}
        intensity={100}
        horizontalVignetteSize={50}
        verticalVignetteSize={30}
      />
      <div className="flex flex-col items-center justify-center gap-5">
        <h1 className="text-center text-4xl font-semibold md:text-6xl">
          Start your free trial
        </h1>
        <p className="text-center text-lg text-muted-foreground md:text-xl">
          Join over 4,000+ users already user Molecule UI
        </p>

        <Button asChild>
          <a href="https://moleculeui.design" target="_blank" rel="noreferrer">
            Get Started
          </a>
        </Button>
      </div>
    </div>
  );
}
