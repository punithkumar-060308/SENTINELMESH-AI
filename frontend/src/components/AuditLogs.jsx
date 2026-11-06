import React, { useState } from 'react';
import { auditLogEntries } from '../data/mockData';

export default function AuditLogs({ showToast }) {
  const [logs, setLogs] = useState(auditLogEntries);
  const [filterAgent, setFilterAgent] = useState('all');

  const filteredLogs = filterAgent === 'all'
    ? logs
    : logs.filter(l => l.agent.toLowerCase().includes(filterAgent.toLowerCase()));

  return (
    <div className="flex flex-col w-full gap-space-lg font-mono">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-high/40">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">receipt_long</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-sans font-semibold">
              Immutable Mesh Audit Ledger
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant font-sans mt-0.5">
            Cryptographically attested records of all autonomous agent actions, human sign-offs, and verification receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="bg-surface-container text-on-surface px-3 py-1.5 rounded border border-surface-container-highest/40"
          >
            <option value="all">All Agents</option>
            <option value="Observer">Observer</option>
            <option value="Investigator">Investigator</option>
            <option value="Repair">Repair</option>
            <option value="Verifier">Verifier</option>
          </select>
          <button
            onClick={() => showToast('Audit ledger signature verified with root key 0x7fa2...9e', 'verified', 'text-tertiary')}
            className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-highest/40 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">verified_user</span>
            <span>Verify Ledger</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-xl border border-surface-container-high/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="bg-surface-container text-on-surface-variant uppercase text-[11px] border-b border-surface-container-high/40">
              <th className="py-2.5 px-4">LEDGER ID</th>
              <th className="py-2.5 px-4">TIMESTAMP</th>
              <th className="py-2.5 px-4">AGENT / ACTOR</th>
              <th className="py-2.5 px-4">ACTION</th>
              <th className="py-2.5 px-4">INCIDENT</th>
              <th className="py-2.5 px-4">TRANSACTION HASH</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high/30">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-surface-container/60 transition-colors">
                <td className="py-3 px-4 font-semibold text-secondary">{log.id}</td>
                <td className="py-3 px-4 text-on-surface-variant">{log.timestamp}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-semibold">
                    {log.agent}
                  </span>
                </td>
                <td className="py-3 px-4 text-primary font-bold">{log.action}</td>
                <td className="py-3 px-4 text-secondary">{log.incident}</td>
                <td className="py-3 px-4 text-outline">{log.hash}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
