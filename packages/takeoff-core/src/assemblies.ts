import type { Quantity } from './quantities.ts';

export interface AssemblyComponent {
  id: string;
  label: string;
  factor: number;
  unit: Quantity['unit'];
  dimension: Quantity['dimension'];
}

export interface Assembly {
  id: string;
  name: string;
  sourceDimension: Quantity['dimension'];
  components: AssemblyComponent[];
}

export interface AssemblyResult {
  componentId: string;
  label: string;
  quantity: Quantity;
}

export function applyAssembly(
  source: Quantity,
  assembly: Assembly,
): AssemblyResult[] {
  if (source.dimension !== assembly.sourceDimension) {
    throw new Error(
      `assembly expects ${assembly.sourceDimension}, received ${source.dimension}`,
    );
  }

  return assembly.components.map((component) => {
    if (!Number.isFinite(component.factor) || component.factor < 0) {
      throw new Error(`invalid factor for component ${component.id}`);
    }
    return {
      componentId: component.id,
      label: component.label,
      quantity: {
        dimension: component.dimension,
        value: source.value * component.factor,
        unit: component.unit,
      },
    };
  });
}
