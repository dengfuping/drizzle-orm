import { entityKind } from '~/entity.ts';
import type { SQL } from '~/sql/sql.ts';
import type { AnyMySqlColumn, MySqlColumn } from './columns/index.ts';
import type { MySqlTable } from './table.ts';

export type MysqlIndexMethod = 'btree' | 'hash' | 'hnsw' | (string & {});

interface IndexConfig {
	name: string;

	columns: IndexColumn[];

	/**
	 * If true, the index will be created as `create unique index` instead of `create index`.
	 */
	unique?: boolean;

	/**
	 * If true, the index will be created as `create vector index` instead of `create index`.
	 */
	vector?: boolean;

	/**
	 * If set, the index will be created as `create index ... using { 'btree' | 'hash' }`.
	 */
	using?: 'btree' | 'hash';

	/**
	 * If set, the index will be created as `create index ... algorythm { 'default' | 'inplace' | 'copy' }`.
	 */
	algorythm?: 'default' | 'inplace' | 'copy';

	/**
	 * If set, adds locks to the index creation.
	 */
	lock?: 'default' | 'none' | 'shared' | 'exclusive';

	secondaryEngineAttribute?: string;
}

export type IndexColumn = MySqlColumn | SQL;

export class IndexBuilderOn {
	static readonly [entityKind]: string = 'MySqlIndexBuilderOn';

	constructor(private name: string | Omit<IndexConfig, 'columns'>, private unique: boolean) { }

	on(...columns: [IndexColumn, ...IndexColumn[]]): IndexBuilder {
		return typeof this.name === 'object' ? new IndexBuilder({
			...this.name,
			columns,
		}) : new IndexBuilder(this.name, columns, this.unique);
	}
}

export interface AnyIndexBuilder {
	build(table: MySqlTable): Index;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IndexBuilder extends AnyIndexBuilder {}

export class IndexBuilder implements AnyIndexBuilder {
	static readonly [entityKind]: string = 'MySqlIndexBuilder';

	/** @internal */
	config: IndexConfig;

	constructor(name: string, columns: IndexColumn[], unique: boolean);
	constructor(config: IndexConfig);

	constructor(name: string | IndexConfig, columns?: IndexColumn[], unique?: boolean) {
		typeof name === 'object' ? this.config = name : this.config = {
			name,
			columns: columns as IndexColumn[],
			unique,
		};
	}

	using(using: IndexConfig['using']): this {
		this.config.using = using;
		return this;
	}

	algorythm(algorythm: IndexConfig['algorythm']): this {
		this.config.algorythm = algorythm;
		return this;
	}

	lock(lock: IndexConfig['lock']): this {
		this.config.lock = lock;
		return this;
	}

	/** @internal */
	build(table: MySqlTable): Index {
		return new Index(this.config, table);
	}
}

export class Index {
	static readonly [entityKind]: string = 'MySqlIndex';

	readonly config: IndexConfig & { table: MySqlTable };

	constructor(config: IndexConfig, table: MySqlTable) {
		this.config = { ...config, table };
	}
}

export type GetColumnsTableName<TColumns> = TColumns extends
	AnyMySqlColumn<{ tableName: infer TTableName extends string }> | AnyMySqlColumn<
		{ tableName: infer TTableName extends string }
	>[] ? TTableName
	: never;

export function index(name: string): IndexBuilderOn {
	return new IndexBuilderOn(name, false);
}

export function uniqueIndex(name: string): IndexBuilderOn {
	return new IndexBuilderOn(name, true);
}

export function vectorIndex(config: Omit<IndexConfig, 'columns' | 'vector'>): IndexBuilderOn {
	return new IndexBuilderOn({ ...config, vector: true }, false);
}
