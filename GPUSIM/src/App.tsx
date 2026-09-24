import { ControlsPanel } from "./components/ControlsPanel";
import { GridView } from "./components/GridView";
import { DataArrays } from "./components/DataArrays";
import { StepInfo } from "./components/StepInfo";
import { useSimulation } from "./hooks/useSimulation";
import "./App.css";

function App() {
  const sim = useSimulation();

  return (
    <div className="app">
      <header className="app-header">
        <h1>GPU Thread &amp; Block Visualizer</h1>
        <p>See how GPU threads and blocks execute an operation, one step at a time.</p>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <ControlsPanel {...sim} />
        </aside>

        <main className="app-main">
          <StepInfo step={sim.currentStep} stepIndex={sim.stepIndex} totalSteps={sim.totalSteps} />
          <GridView
            blocks={sim.result.blocks}
            currentStep={sim.currentStep}
            touchedThreads={sim.touchedThreads}
          />
          <DataArrays buffers={sim.buffers} currentStep={sim.currentStep} />
        </main>
      </div>
    </div>
  );
}

export default App;
