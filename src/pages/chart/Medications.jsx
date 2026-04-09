import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../contexts/PatientContext';

export default function Medications({ patientId }) {
  const { meds } = usePatient();
  const navigate = useNavigate();

  const patientMeds = meds[patientId] || [];
  const active = patientMeds.filter(m => m.status === 'Active');
  const inactive = patientMeds.filter(m => m.status !== 'Active');

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>💊 Medications ({active.length} active)</h2>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/prescribe')}>
            + New Prescription
          </button>
        </div>
        <div className="card-body no-pad">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medication</th><th>Dose</th><th>SIG</th><th>Prescriber</th><th>Start Date</th><th>Pharmacy</th><th>Refills</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {active.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="font-semibold">{m.name}</div>
                    {m.isControlled && (
                      <span className="badge badge-warning" style={{ marginTop: 4 }}>
                        🔒 {m.schedule}
                      </span>
                    )}
                  </td>
                  <td className="font-medium">{m.dose}</td>
                  <td className="text-sm" style={{ maxWidth: 200 }}>{m.sig}</td>
                  <td className="text-sm">{m.prescriber}</td>
                  <td className="text-sm">{m.startDate}</td>
                  <td className="text-sm">{m.pharmacy}</td>
                  <td>
                    <span className={m.refillsLeft === 0 ? 'text-danger font-bold' : ''}>
                      {m.refillsLeft}
                    </span>
                  </td>
                  <td><span className="badge badge-success">{m.status}</span></td>
                </tr>
              ))}
              {inactive.length > 0 && (
                <>
                  <tr>
                    <td colSpan={8} style={{ background: 'var(--bg)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>
                      Inactive Medications
                    </td>
                  </tr>
                  {inactive.map((m) => (
                    <tr key={m.id} style={{ opacity: 0.6 }}>
                      <td>{m.name}</td>
                      <td>{m.dose}</td>
                      <td className="text-sm">{m.sig}</td>
                      <td className="text-sm">{m.prescriber}</td>
                      <td className="text-sm">{m.startDate}</td>
                      <td className="text-sm">{m.pharmacy}</td>
                      <td>{m.refillsLeft}</td>
                      <td><span className="badge badge-gray">{m.status}</span></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
