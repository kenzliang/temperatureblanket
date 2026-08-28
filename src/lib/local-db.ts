/**
 * Minimal Supabase-compatible client backed by plain Postgres (pg).
 * Used when DATABASE_URL is set (local Docker dev).
 *
 * Implements only the operations this app uses:
 *   • .from(table).select(cols)            → simple SELECT
 *   • .from(table).select(cols).eq(col, v) → SELECT … WHERE col = $1
 *   • .from(table).select(cols).order(col) → SELECT … ORDER BY col
 *   • embedded relations in select string  → LEFT JOIN + nested result object
 *   • .from(table).upsert(data, opts)      → INSERT … ON CONFLICT …
 *
 * All methods return { data, error } to match the Supabase JS client shape.
 */

import { Pool, types } from 'pg';

// Tell pg to return DATE columns as plain 'YYYY-MM-DD' strings instead of
// JS Date objects. Supabase does this automatically; without it, dates get
// serialized as "2026-04-07T04:00:00.000Z" which breaks the frontend.
types.setTypeParser(types.builtins.DATE, (val: string) => val);

// Lazy singleton pool — only created when DATABASE_URL is actually needed
let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

// ── Foreign-key map ──────────────────────────────────────────────────────────
// Used to generate LEFT JOIN clauses for embedded relations.
// Key = parent table, value = list of FK definitions pointing to other tables.
const FK_MAP: Record<string, { col: string; refTable: string }[]> = {
  daily_weather: [{ col: 'location_id', refTable: 'locations' }],
  people: [{ col: 'location_id', refTable: 'locations' }],
};

// ── Select parser ────────────────────────────────────────────────────────────
// Converts Supabase embedded-relation syntax into plain column lists.
// "id, d, locations ( id, name, state )" →
//   { main: ['id', 'd'], relations: [{ table: 'locations', cols: ['id','name','state'] }] }
function parseSelect(selectStr: string) {
  const relations: { table: string; cols: string[] }[] = [];
  let remaining = selectStr;

  const relRegex = /(\w+)\s*\(\s*([^)]+)\s*\)/g;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = relRegex.exec(selectStr)) !== null) {
    relations.push({
      table: m[1].trim(),
      cols: m[2].split(',').map((c) => c.trim()).filter(Boolean),
    });
    remaining = remaining.replace(m[0], '');
  }

  const main = remaining.split(',').map((c) => c.trim()).filter(Boolean);
  return { main, relations };
}

type Row = Record<string, unknown>;
type SelectResult = { data: Row[] | null; error: Error | null };
type MutateResult = { data: null; error: Error | null };

// ── QueryBuilder ─────────────────────────────────────────────────────────────
class QueryBuilder {
  private _table: string;
  private _selectStr = '*';
  private _conditions: Array<[col: string, op: string, val: unknown]> = [];
  private _orderCol: string | null = null;
  private _rangeFrom: number | null = null;
  private _rangeTo: number | null = null;
  private _updateData: Row | null = null;
  private _pending: Promise<SelectResult> | null = null;

  constructor(table: string) {
    this._table = table;
  }

  select(cols: string): this {
    this._selectStr = cols;
    return this;
  }

  eq(col: string, val: unknown): this {
    this._conditions.push([col, '=', val]);
    return this;
  }

  gte(col: string, val: unknown): this {
    this._conditions.push([col, '>=', val]);
    return this;
  }

  lte(col: string, val: unknown): this {
    this._conditions.push([col, '<=', val]);
    return this;
  }

  order(col: string): this {
    this._orderCol = col;
    return this;
  }

  // Inclusive row range, matching the Supabase JS client's .range(from, to).
  range(from: number, to: number): this {
    this._rangeFrom = from;
    this._rangeTo = to;
    return this;
  }

  // ── Update (chainable: .from(t).update(data).eq(col, val)) ──────────────
  update(data: Row): this {
    this._updateData = data;
    return this;
  }

  // ── Upsert ─────────────────────────────────────────────────────────────────
  async upsert(
    data: Row | Row[],
    opts: { onConflict: string; ignoreDuplicates?: boolean }
  ): Promise<MutateResult> {
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) return { data: null, error: null };

    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const conflictCols = opts.onConflict.split(',').map((c) => c.trim());
    const conflictTarget = conflictCols.map((c) => `"${c}"`).join(', ');

    // Build the DO clause
    let doClause: string;
    if (opts.ignoreDuplicates) {
      doClause = 'DO NOTHING';
    } else {
      const updateCols = cols.filter((c) => !conflictCols.includes(c));
      doClause =
        updateCols.length === 0
          ? 'DO NOTHING'
          : 'DO UPDATE SET ' +
            updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');
    }

    const client = await getPool().connect();
    try {
      for (const row of rows) {
        const values = cols.map((c) => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO "${this._table}" (${colList}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget}) ${doClause}`;
        await client.query(sql, values);
      }
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
    } finally {
      client.release();
    }
  }

  // ── PromiseLike (makes `await builder` work) ────────────────────────────────
  then<T1 = SelectResult, T2 = never>(
    onfulfilled?: ((value: SelectResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): Promise<T1 | T2> {
    if (!this._pending) this._pending = this._execute();
    return this._pending.then(onfulfilled ?? undefined, onrejected ?? undefined);
  }

  private _limitClause(): string {
    if (this._rangeFrom == null || this._rangeTo == null) return '';
    return `LIMIT ${this._rangeTo - this._rangeFrom + 1} OFFSET ${this._rangeFrom}`;
  }

  // ── Core execution ──────────────────────────────────────────────────────────
  private async _execute(): Promise<SelectResult> {
    const client = await getPool().connect();
    try {
      // ── UPDATE path ──────────────────────────────────────────────────────
      if (this._updateData) {
        const cols = Object.keys(this._updateData);
        const setClauses = cols.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
        const values = cols.map((c) => this._updateData![c]);
        const whereIdx = values.length;
        const where =
          this._conditions.length > 0
            ? 'WHERE ' +
              this._conditions
                .map(([col, op], i) => `"${this._table}"."${col}" ${op} $${whereIdx + i + 1}`)
                .join(' AND ')
            : '';
        const whereVals = this._conditions.map(([, , v]) => v);
        const sql = `UPDATE "${this._table}" SET ${setClauses} ${where}`;
        await client.query(sql, [...values, ...whereVals]);
        return { data: null, error: null };
      }

      // ── SELECT path ──────────────────────────────────────────────────────
      const t = this._table;
      const { main, relations } = parseSelect(this._selectStr);
      const paramValues = this._conditions.map(([, , v]) => v);

      let sql: string;

      if (relations.length === 0) {
        // ── Simple SELECT (no JOINs) ──────────────────────────────────────────
        const cols =
          main.length === 0 || main[0] === '*'
            ? '*'
            : main.map((c) => `"${t}"."${c}"`).join(', ');

        const where =
          this._conditions.length > 0
            ? 'WHERE ' +
              this._conditions
                .map(([col, op], i) => `"${t}"."${col}" ${op} $${i + 1}`)
                .join(' AND ')
            : '';

        const order = this._orderCol ? `ORDER BY "${t}"."${this._orderCol}"` : '';
        sql = `SELECT ${cols} FROM "${t}" ${where} ${order} ${this._limitClause()}`.trim();

        const { rows } = await client.query(sql, paramValues);
        return { data: rows, error: null };
      }

      // ── SELECT with LEFT JOINs ──────────────────────────────────────────────
      const mainCols = main.map((c) => `"${t}"."${c}" AS "${c}"`).join(', ');

      // Alias relation columns as "tableName__colName" to avoid collisions
      const relCols = relations
        .flatMap((rel) =>
          rel.cols.map(
            (c) => `"${rel.table}"."${c}" AS "${rel.table}__${c}"`
          )
        )
        .join(', ');

      const fks = FK_MAP[t] ?? [];
      const joins = relations
        .map((rel) => {
          const fk = fks.find((f) => f.refTable === rel.table);
          return fk
            ? `LEFT JOIN "${rel.table}" ON "${rel.table}"."id" = "${t}"."${fk.col}"`
            : '';
        })
        .filter(Boolean)
        .join('\n');

      const where =
        this._conditions.length > 0
          ? 'WHERE ' +
            this._conditions
              .map(([col, op], i) => `"${t}"."${col}" ${op} $${i + 1}`)
              .join(' AND ')
          : '';

      const order = this._orderCol
        ? `ORDER BY "${t}"."${this._orderCol}"`
        : '';

      sql = [
        `SELECT ${[mainCols, relCols].filter(Boolean).join(', ')}`,
        `FROM "${t}"`,
        joins,
        where,
        order,
        this._limitClause(),
      ]
        .filter(Boolean)
        .join(' ');

      const { rows: rawRows } = await client.query(sql, paramValues);

      // Re-nest the "tableName__col" flat columns back into nested objects
      // e.g. { id: '...', locations__name: 'Windham' } → { id: '...', locations: { name: 'Windham' } }
      const rows = rawRows.map((row) => {
        const out: Row = {};
        for (const [key, val] of Object.entries(row)) {
          const rel = relations.find((r) => key.startsWith(`${r.table}__`));
          if (rel) {
            const col = key.slice(rel.table.length + 2); // strip "table__"
            if (!out[rel.table]) out[rel.table] = {} as Row;
            (out[rel.table] as Row)[col] = val;
          } else {
            out[key] = val;
          }
        }
        return out;
      });

      return { data: rows, error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
    } finally {
      client.release();
    }
  }
}

export const localDb = {
  from: (table: string) => new QueryBuilder(table),
};
