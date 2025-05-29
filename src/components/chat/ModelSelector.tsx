import type { LlamaModel } from '../../types/chat';

interface ModelSelectorProps {
  models: LlamaModel[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  className?: string;
}

export function ModelSelector({ models, selectedModelId, onSelectModel, className = '' }: ModelSelectorProps) {
  if (!models || models.length === 0) {
    return <div className={`p-2 text-sm text-slate-400 ${className}`}>No models available.</div>;
  }

  return (
    <div className={`p-2 ${className}`}>
      <label htmlFor="model-select" className="sr-only">Select Model</label>
      <select
        id="model-select"
        value={selectedModelId}
        onChange={(e) => onSelectModel(e.target.value)}
        className="block w-full bg-slate-700 border border-slate-600 text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}