// Only server-owned SQL reaches this adapter; all user values remain parameters.
export function postgresDatabase(client) {
  const translate = (query) => {
    let n = 0;
    return query.replace(/\bend\b/g, '"end"').replace(/\?/g, () => `$${++n}`);
  };
  function statement(query, values = []) {
    const execute = async (connection) => {
      const rows = await connection.unsafe(translate(query), values);
      // postgres.js returns int8 COUNT as a string; the mobile contract uses numbers.
      const results = Array.from(rows, (row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            ["count", "member_count"].includes(key) ? Number(value) : value,
          ]),
        ),
      );
      return { results, meta: { changes: rows.count } };
    };
    return {
      bind: (...args) => statement(query, args),
      first: async () => (await execute(client)).results[0] || null,
      all: () => execute(client),
      run: () => execute(client),
      execute,
    };
  }
  return {
    prepare: statement,
    batch: (statements) =>
      client.begin(async (transaction) => {
        const results = [];
        for (const statement of statements)
          results.push(await statement.execute(transaction));
        return results;
      }),
  };
}
