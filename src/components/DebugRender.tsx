import { useRef } from "react";

interface DebugRenderProps {
  name: string;
  data?: unknown;
}

export const DebugRender = ({ name, data }: DebugRenderProps) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log(`🔄 ${name} - Render #${renderCount.current}`, data);

  return (
    <div className="text-xs text-muted-foreground border-l-2 border-blue-500 pl-2 mb-2">
      {name}: Render #{renderCount.current}
    </div>
  );
};
