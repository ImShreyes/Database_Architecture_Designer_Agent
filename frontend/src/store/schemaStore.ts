// Zustand Store for Schema State Management
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  SchemaDefinition,
  TableDefinition,
  ColumnDefinition,
  RelationshipDefinition,
  StoredProcedureDefinition,
  IndexDefinition,
  ForeignKeyDefinition,
  SQLDialect,
  Cardinality,
} from '../engine/types';
import { generateId } from '../engine/types';
import { compileSQL } from '../engine/sqlCompiler';
import { compileMermaid } from '../engine/mermaidCompiler';

interface SchemaStore {
  // State
  schema: SchemaDefinition | null;
  compiledSQL: string;
  compiledMermaid: string;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  selectedTableId: string | null;
  selectedRelationshipId: string | null;
  userPrompt: string;

  // Schema Actions
  setSchema: (schema: SchemaDefinition) => void;
  clearSchema: () => void;
  updateSchema: (updates: Partial<SchemaDefinition>) => void;
  setDialect: (dialect: SQLDialect) => void;

  // Table Actions
  addTable: (table: TableDefinition) => void;
  updateTable: (tableId: string, updates: Partial<TableDefinition>) => void;
  deleteTable: (tableId: string) => void;
  selectTable: (tableId: string | null) => void;

  // Column Actions
  addColumn: (tableId: string, column: ColumnDefinition) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<ColumnDefinition>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;

  // Relationship Actions
  addRelationship: (relationship: RelationshipDefinition) => void;
  updateRelationship: (relationshipId: string, updates: Partial<RelationshipDefinition>) => void;
  deleteRelationship: (relationshipId: string) => void;
  selectRelationship: (relationshipId: string | null) => void;
  changeCardinality: (relationshipId: string, cardinality: Cardinality) => void;

  // Index Actions
  addIndex: (tableId: string, index: IndexDefinition) => void;
  deleteIndex: (tableId: string, indexId: string) => void;

  // Foreign Key Actions
  addForeignKey: (tableId: string, fk: ForeignKeyDefinition) => void;
  deleteForeignKey: (tableId: string, fkId: string) => void;

  // Stored Procedure Actions
  addStoredProcedure: (proc: StoredProcedureDefinition) => void;
  updateStoredProcedure: (procId: string, updates: Partial<StoredProcedureDefinition>) => void;
  deleteStoredProcedure: (procId: string) => void;

  // UI State Actions
  setLoading: (loading: boolean) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setUserPrompt: (prompt: string) => void;

  // Recompile
  recompile: () => void;
}

// Helper function to update schema and recompile
const updateAndRecompile = (
  state: SchemaStore,
  schemaUpdater: (schema: SchemaDefinition) => SchemaDefinition
): Partial<SchemaStore> => {
  if (!state.schema) return {};

  const updatedSchema = schemaUpdater({
    ...state.schema,
    updatedAt: new Date().toISOString(),
  });

  return {
    schema: updatedSchema,
    compiledSQL: compileSQL(updatedSchema),
    compiledMermaid: compileMermaid(updatedSchema),
  };
};

export const useSchemaStore = create<SchemaStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      schema: null,
      compiledSQL: '',
      compiledMermaid: '',
      isLoading: false,
      isGenerating: false,
      error: null,
      selectedTableId: null,
      selectedRelationshipId: null,
      userPrompt: '',

      // Schema Actions
      setSchema: (schema) => {
        set({
          schema,
          compiledSQL: compileSQL(schema),
          compiledMermaid: compileMermaid(schema),
          error: null,
        });
      },

      clearSchema: () => {
        set({
          schema: null,
          compiledSQL: '',
          compiledMermaid: '',
          selectedTableId: null,
          selectedRelationshipId: null,
          error: null,
        });
      },

      updateSchema: (updates) => {
        const state = get();
        if (!state.schema) return;

        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            ...updates,
          }))
        );
      },

      setDialect: (dialect) => {
        const state = get();
        if (!state.schema) return;

        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            dialect,
          }))
        );
      },

      // Table Actions
      addTable: (table) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: [...schema.tables, { ...table, id: table.id || generateId() }],
          }))
        );
      },

      updateTable: (tableId, updates) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: schema.tables.map((t) =>
              t.id === tableId ? { ...t, ...updates } : t
            ),
          }))
        );
      },

      deleteTable: (tableId) => {
        const state = get();
        const table = state.schema?.tables.find((t) => t.id === tableId);
        if (!table) return;

        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: schema.tables.filter((t) => t.id !== tableId),
            // Also remove relationships involving this table
            relationships: schema.relationships.filter(
              (r) =>
                r.sourceTable !== table.name && r.targetTable !== table.name
            ),
          }))
        );
      },

      selectTable: (tableId) => {
        set({ selectedTableId: tableId, selectedRelationshipId: null });
      },

      // Column Actions
      addColumn: (tableId, column) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: schema.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    columns: [
                      ...t.columns,
                      { ...column, id: column.id || generateId() },
                    ],
                  }
                : t
            ),
          }))
        );
      },

      updateColumn: (tableId, columnId, updates) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: schema.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    columns: t.columns.map((c) =>
                      c.id === columnId ? { ...c, ...updates } : c
                    ),
                  }
                : t
            ),
          }))
        );
      },

      deleteColumn: (tableId, columnId) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: schema.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    columns: t.columns.filter((c) => c.id !== columnId),
                  }
                : t
            ),
          }))
        );
      },

      // Relationship Actions
      addRelationship: (relationship) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            relationships: [
              ...schema.relationships,
              { ...relationship, id: relationship.id || generateId() },
            ],
          }))
        );
      },

      updateRelationship: (relationshipId, updates) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            relationships: schema.relationships.map((r) =>
              r.id === relationshipId ? { ...r, ...updates } : r
            ),
          }))
        );
      },

      deleteRelationship: (relationshipId) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            relationships: schema.relationships.filter(
              (r) => r.id !== relationshipId
            ),
          }))
        );
      },

      selectRelationship: (relationshipId) => {
        set({ selectedRelationshipId: relationshipId, selectedTableId: null });
      },

      changeCardinality: (relationshipId, cardinality) => {
        const state = get();
        const rel = state.schema?.relationships.find(
          (r) => r.id === relationshipId
        );
        if (!rel) return;

        // If changing to many-to-many, create junction table info
        let junctionTable = undefined;
        if (cardinality === 'many-to-many') {
          junctionTable = {
            name: `${rel.sourceTable}_${rel.targetTable}`,
            sourceColumn: `${rel.sourceTable.toLowerCase()}_id`,
            targetColumn: `${rel.targetTable.toLowerCase()}_id`,
          };
        }

        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            relationships: schema.relationships.map((r) =>
              r.id === relationshipId
                ? { ...r, cardinality, junctionTable }
                : r
            ),
          }))
        );
      },

      // Index Actions
      addIndex: (tableId, index) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: schema.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    indexes: [
                      ...t.indexes,
                      { ...index, id: index.id || generateId() },
                    ],
                  }
                : t
            ),
          }))
        );
      },

      deleteIndex: (tableId, indexId) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: schema.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    indexes: t.indexes.filter((i) => i.id !== indexId),
                  }
                : t
            ),
          }))
        );
      },

      // Foreign Key Actions
      addForeignKey: (tableId, fk) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: schema.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    foreignKeys: [
                      ...t.foreignKeys,
                      { ...fk, id: fk.id || generateId() },
                    ],
                  }
                : t
            ),
          }))
        );
      },

      deleteForeignKey: (tableId, fkId) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            tables: schema.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    foreignKeys: t.foreignKeys.filter((fk) => fk.id !== fkId),
                  }
                : t
            ),
          }))
        );
      },

      // Stored Procedure Actions
      addStoredProcedure: (proc) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            storedProcedures: [
              ...schema.storedProcedures,
              { ...proc, id: proc.id || generateId() },
            ],
          }))
        );
      },

      updateStoredProcedure: (procId, updates) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            storedProcedures: schema.storedProcedures.map((p) =>
              p.id === procId ? { ...p, ...updates } : p
            ),
          }))
        );
      },

      deleteStoredProcedure: (procId) => {
        const state = get();
        set(
          updateAndRecompile(state, (schema) => ({
            ...schema,
            storedProcedures: schema.storedProcedures.filter(
              (p) => p.id !== procId
            ),
          }))
        );
      },

      // UI State Actions
      setLoading: (isLoading) => set({ isLoading }),
      setGenerating: (isGenerating) => set({ isGenerating }),
      setError: (error) => set({ error }),
      setUserPrompt: (userPrompt) => set({ userPrompt }),

      // Recompile
      recompile: () => {
        const state = get();
        if (!state.schema) return;

        set({
          compiledSQL: compileSQL(state.schema),
          compiledMermaid: compileMermaid(state.schema),
        });
      },
    })),
    { name: 'schema-store' }
  )
);

const EMPTY_ARRAY: any[] = [];

// Selector hooks for optimized re-renders
export const useSchema = () => useSchemaStore((state) => state.schema);
export const useCompiledSQL = () => useSchemaStore((state) => state.compiledSQL);
export const useCompiledMermaid = () => useSchemaStore((state) => state.compiledMermaid);
export const useTables = () => useSchemaStore((state) => state.schema?.tables ?? EMPTY_ARRAY);
export const useRelationships = () => useSchemaStore((state) => state.schema?.relationships ?? EMPTY_ARRAY);
export const useIsLoading = () => useSchemaStore((state) => state.isLoading);
export const useIsGenerating = () => useSchemaStore((state) => state.isGenerating);
export const useError = () => useSchemaStore((state) => state.error);
