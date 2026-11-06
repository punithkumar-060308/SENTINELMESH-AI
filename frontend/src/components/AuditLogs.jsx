import React, { useState } from 'react';
import { auditLogEntries } from '../data/mockData';

export default function AuditLogs({ showToast }) {
  const [logs, setLogs] = useState(auditLogEntries);
  const [filterAgent, setFilterAgent] = useState('all');

  const filteredLogs = filterAgent === 'all'
    ? logs
    : logs.filter(l => l.agent.toLowerCase().includes(filterAgent.toLowerCase()));

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#CBD5E1]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2 font-mono text-xs">
            <span className="px-3 py-0.5 rounded-full bg-powder-blue/40 text-[#17233B] font-bold uppercase tracking-wider border border-powder-blue/60 shadow-xs">
              SHA-256 Chain
            </span>
            <span className="text-[#94A3B8]">|</span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Tamper Proof
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#17233B] tracking-tight">
            Immutable Mesh Audit Ledger
          </h1>
          <p className="mt-2 text-sm text-[#334155] font-medium leading-relaxed max-w-3xl">
            Cryptographically attested records of all autonomous agent actions, human sign-offs, and verification receipts.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto font-sans text-xs">
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="glass-panel text-[#17233B] font-bold px-4 py-2.5 rounded-full border border-white shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#8DB9F0] cursor-pointer"
          >
            <option value="all">All Agents & Actors</option>
            <option value="Observer">Observer Agent</option>
            <option value="Investigator">Investigator Agent</option>
            <option value="Repair">Repair Agent</option>
            <option value="Verifier">Verifier Agent</option>
            <option value="Human Gate">Human Gate</option>
          </select>

          <button
            onClick={() => showToast('Audit ledger signature verified with root key 0x7fa2...9e', 'verified', 'text-tertiary')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#17233B] text-white font-bold hover:bg-[#1e2f4f] text-xs shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-400">verified_user</span>
            <span>Verify Ledger</span>
          </button>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="glass-panel rounded-3xl border border-white shadow-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs font-mono">
            <thead>
              <tr className="bg-white/70 text-[#475569] uppercase text-[11px] font-bold tracking-wider border-b border-slate-200/80">
                <th className="py-4 px-6">LEDGER ID</th>
                <th className="py-4 px-6">TIMESTAMP</th>
                <th className="py-4 px-6">AGENT / ACTOR</th>
                <th className="py-4 px-6">ACTION</th>
                <th className="py-4 px-6">INCIDENT</th>
                <th className="py-4 px-6">TRANSACTION HASH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/40">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/80 transition-colors">
                  <td className="py-4 px-6 font-bold text-[#17233B]">{log.id}</td>
                  <td className="py-4 px-6 text-[#64748B] font-medium">{log.timestamp}</td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 rounded-full bg-[#E9E8F8] text-[#17233B] font-bold text-xs border border-white shadow-xs inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
                      {log.agent}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[#17233B] font-black">{log.action}</td>
                  <td className="py-4 px-6 text-[#2563EB] font-bold">{log.incident}</td>
                  <td className="py-4 px-6 text-[#64748B] font-mono text-[11px] font-medium">{log.hash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}