import React from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function LabResults({ patientId }) {
  const { labResults } = usePatient();
  const patientLabs = labResults[patientId] || [];

  return (
    <div>
      {patientLabs.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="icon">🔬</div>
              <h3>No Lab Results</h3>
              <p>No laboratory results on file for this patient</p>
            </div>
          </div>
        </div>
      ) : (
        patientLabs.map((lab) => (
          <div key={lab.id} className="card mb-4">
            <div className="card-header">
              <h2>🔬 Lab Results — {lab.resultDate}</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${lab.status === 'Final' ? 'badge-success' : 'badge-warning'}`}>{lab.status}</span>
                <span className="text-sm text-muted">Ordered: {lab.orderDate} by {lab.orderedBy}</span>
              </div>
            </div>
            <div className="card-body no-pad">
              {lab.tests.map((test, ti) => (
                <div key={ti}>
                  <div style={{ padding: '10px 14px', background: 'var(--bg)', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                    {test.name}
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Component</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {test.results.map((r, ri) => (
                        <tr key={ri}>
                          <td className="font-medium">{r.component}</td>
                          <td className={`font-bold ${r.flag === 'H' ? 'text-danger' : r.flag === 'L' ? 'text-warning' : r.flag === 'A' ? 'text-danger' : ''}`}>
                            {r.value}
                          </td>
                          <td className="text-muted">{r.unit}</td>
                          <td className="text-sm">{r.range}</td>
                          <td>
                            {r.flag && (
                              <span className={`badge ${r.flag === 'H' ? 'badge-danger' : r.flag === 'L' ? 'badge-warning' : r.flag === 'A' ? 'badge-danger' : 'badge-gray'}`}>
                                {r.flag === 'H' ? '↑ High' : r.flag === 'L' ? '↓ Low' : r.flag === 'A' ? '⚠ Abnormal' : r.flag}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
