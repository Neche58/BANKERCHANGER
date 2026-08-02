import type { Response } from 'express';
import { pool } from '../config/db';
import { logger } from '../utils/logger';
import { getEnv } from '../config/env';

const FETCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function csvRow(values: unknown[]): string {
  return values.map((v) => {
    const s = v == null ? '' : String(v);
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',') + '\n';
}

function startCsvStream(res: Response, filename: string): void {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Transfer-Encoding', 'chunked');
  res.flushHeaders();
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function logExportAudit(
  adminId: string,
  exportType: string,
  params: Record<string, unknown> = {},
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, details, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [adminId, `export:${exportType}`, JSON.stringify(params)],
    );
  } catch {
    logger.warn({ msg: 'audit log insert skipped (table may not exist)', exportType });
  }
}

// ---------------------------------------------------------------------------
// Core: stream SQL via server-side cursor in batches → res
// ---------------------------------------------------------------------------

async function pipeQueryToCsv(
  res: Response,
  sql: string,
  values: unknown[],
  header: string[],
  rowMapper: (row: Record<string, unknown>) => string,
  maxRows: number,
): Promise<void> {
  const client = await pool.connect();
  try {
    res.write(csvRow(header));
    await client.query('BEGIN');
    await client.query(`DECLARE export_cursor NO SCROLL CURSOR FOR ${sql}`, values);

    let rowCount = 0;
    while (true) {
      const { rows } = await client.query(`FETCH ${FETCH_SIZE} FROM export_cursor`);
      if (rows.length === 0) break;
      const remaining = maxRows - rowCount;
      if (remaining <= 0) break;
      rows.splice(remaining);
      const chunk = rows.map(rowMapper).join('');
      const ok = res.write(chunk);
      if (!ok) await new Promise<void>((r) => res.once('drain', r));
      rowCount += rows.length;
    }

    await client.query('CLOSE export_cursor');
    await client.query('COMMIT');
    res.end();
  } catch (err) {
    logger.error({ msg: 'CSV stream error', err });
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    if (!res.writableEnded) res.end();
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Streaming exports
// ---------------------------------------------------------------------------

export async function streamUsersExport(res: Response): Promise<void> {
  const { MAX_EXPORT_ROWS } = getEnv();

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS count FROM (SELECT 1 FROM bets GROUP BY bettor_address) sub`,
  );
  if (Number(countRows[0]?.count ?? 0) > MAX_EXPORT_ROWS) {
    res.status(413).json({ error: 'Export too large' });
    return;
  }

  startCsvStream(res, 'users.csv');
  await pipeQueryToCsv(
    res,
    `SELECT bettor_address AS wallet_address,
            MIN(placed_at)  AS first_bet_at,
            COUNT(*)        AS total_bets,
            SUM(amount)     AS total_wagered
     FROM bets
     GROUP BY bettor_address
     ORDER BY first_bet_at`,
    [],
    ['wallet_address', 'first_bet_at', 'total_bets', 'total_wagered'],
    (r) => csvRow([r.wallet_address, r.first_bet_at, r.total_bets, r.total_wagered]),
    MAX_EXPORT_ROWS,
  );
}

export async function streamTradesExport(
  res: Response,
  from?: string,
  to?: string,
): Promise<void> {
  const { MAX_EXPORT_ROWS } = getEnv();

  const conds: string[] = [];
  const vals: unknown[] = [];
  if (from) conds.push(`placed_at >= $${vals.push(from)}`);
  if (to)   conds.push(`placed_at <= $${vals.push(to)}`);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS count FROM bets ${where}`,
    vals,
  );
  if (Number(countRows[0]?.count ?? 0) > MAX_EXPORT_ROWS) {
    res.status(413).json({ error: 'Export too large' });
    return;
  }

  startCsvStream(res, 'trades.csv');
  await pipeQueryToCsv(
    res,
    `SELECT id, market_id, bettor_address, side, amount, placed_at, claimed, payout, tx_hash
     FROM bets ${where} ORDER BY placed_at`,
    vals,
    ['id', 'market_id', 'bettor_address', 'side', 'amount', 'placed_at', 'claimed', 'payout', 'tx_hash'],
    (r) => csvRow([r.id, r.market_id, r.bettor_address, r.side, r.amount, r.placed_at, r.claimed, r.payout, r.tx_hash]),
    MAX_EXPORT_ROWS,
  );
}

export async function streamTreasuryExport(res: Response): Promise<void> {
  const { MAX_EXPORT_ROWS } = getEnv();
  startCsvStream(res, 'treasury.csv');
  await pipeQueryToCsv(
    res,
    `SELECT id, contract_address, event_type, ledger_sequence, ledger_close_time, tx_hash, payload
     FROM blockchain_events
     WHERE event_type ILIKE '%fee%' OR event_type ILIKE '%treasury%'
     ORDER BY ledger_close_time`,
    [],
    ['id', 'contract_address', 'event_type', 'ledger_sequence', 'ledger_close_time', 'tx_hash', 'payload'],
    (r) => csvRow([r.id, r.contract_address, r.event_type, r.ledger_sequence, r.ledger_close_time, r.tx_hash, JSON.stringify(r.payload)]),
    MAX_EXPORT_ROWS,
  );
}

// ---------------------------------------------------------------------------
// Async (buffered) export — builds full CSV string for email attachment
// ---------------------------------------------------------------------------

export async function buildTradesCsv(from?: string, to?: string): Promise<string> {
  const conds: string[] = [];
  const vals: unknown[] = [];
  if (from) conds.push(`placed_at >= $${vals.push(from)}`);
  if (to)   conds.push(`placed_at <= $${vals.push(to)}`);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT id, market_id, bettor_address, side, amount, placed_at, claimed, payout, tx_hash
     FROM bets ${where} ORDER BY placed_at`,
    vals,
  );

  return (
    csvRow(['id', 'market_id', 'bettor_address', 'side', 'amount', 'placed_at', 'claimed', 'payout', 'tx_hash']) +
    rows.map((r) => csvRow([r.id, r.market_id, r.bettor_address, r.side, r.amount, r.placed_at, r.claimed, r.payout, r.tx_hash])).join('')
  );
}
